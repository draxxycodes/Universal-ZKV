//! UZKV Stylus - Universal ZK-Proof Verifier
//!
//! Production-grade zero-knowledge proof verification on Arbitrum Stylus.
//! Supports Groth16 zkSNARK verification with BN254 curve.
//!
//! # Architecture
//! - Arbitrum Stylus smart contract (WASM execution)
//! - no_std compatible for WASM compilation
//! - Custom wee_alloc allocator for deterministic memory usage
//! - Vendored arkworks dependencies for supply chain security
//! - ERC-7201 namespaced storage for proxy safety
//!
//! # Contract Interface
//! - `verify_groth16(bytes proof, bytes publicInputs, bytes32 vkHash)` - Verify a Groth16 proof
//! - `register_vk(bytes vk)` - Register a verification key
//! - `get_verification_count()` - Get total verifications performed
//! - `is_paused()` - Check if contract is paused

#![cfg_attr(not(feature = "std"), no_std)]
#![cfg_attr(not(test), no_main)]

extern crate alloc;

use alloc::vec::Vec;
use stylus_sdk::{
    alloy_primitives::{Address, U256},
    prelude::*,
    storage::{StorageAddress, StorageU256, StorageMap, StorageBool},
    msg, block,
};
use wee_alloc::WeeAlloc;

// Custom allocator for WASM environment
// WeeAlloc provides small code size and predictable memory usage
#[global_allocator]
static ALLOC: WeeAlloc = WeeAlloc::INIT;

pub mod storage;
pub mod groth16;

// Re-export storage types
pub use storage::{UZKVStorage, STORAGE_SLOT};

// Re-export verification functions
pub use groth16::verify;

/// Error types for UZKV operations
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum Error {
    /// Proof deserialization failed
    DeserializationError,
    /// Proof contains invalid curve points
    MalformedProof,
    /// Verification key deserialization failed
    InvalidVerificationKey,
    /// Public inputs deserialization failed
    InvalidPublicInputs,
    /// Proof verification failed (mathematically invalid)
    VerificationFailed,
    /// Input size constraints violated
    InvalidInputSize,
    /// Contract is paused
    ContractPaused,
    /// Verification key not registered
    VKNotRegistered,
    /// Unauthorized access
    Unauthorized,
}

impl core::fmt::Display for Error {
    fn fmt(&self, f: &mut core::fmt::Formatter<'_>) -> core::fmt::Result {
        match self {
            Error::DeserializationError => write!(f, "Failed to deserialize proof"),
            Error::MalformedProof => write!(f, "Proof contains invalid curve points"),
            Error::InvalidVerificationKey => write!(f, "Invalid verification key"),
            Error::InvalidPublicInputs => write!(f, "Invalid public inputs"),
            Error::VerificationFailed => write!(f, "Proof verification failed"),
            Error::InvalidInputSize => write!(f, "Input size exceeds limits"),
            Error::ContractPaused => write!(f, "Contract is paused"),
            Error::VKNotRegistered => write!(f, "Verification key not registered"),
            Error::Unauthorized => write!(f, "Unauthorized access"),
        }
    }
}

/// Result type for UZKV operations
pub type Result<T> = core::result::Result<T, Error>;

// Stylus contract storage definition using ERC-7201 namespaced storage
sol_storage! {
    #[entrypoint]
    pub struct UZKVContract {
        // Total number of successful verifications
        uint256 verification_count;
        
        // Registered verification keys (vkHash => vkData)
        mapping(bytes32 => bytes) verification_keys;
        
        // VK registration status (vkHash => isRegistered)
        mapping(bytes32 => bool) vk_registered;
        
        // Circuit breaker (emergency pause)
        bool paused;
        
        // Contract admin (for pause/unpause)
        address admin;
        
        // Nullifier tracking (prevent replay attacks)
        mapping(bytes32 => bool) nullifiers;
    }
}

/// Stylus contract implementation
#[external]
impl UZKVContract {
    /// Verify a Groth16 proof
    ///
    /// @param proof - Serialized Groth16 proof (compressed format)
    /// @param public_inputs - Serialized public input field elements
    /// @param vk_hash - Hash of the registered verification key
    /// @return true if proof is valid, reverts if invalid or error
    pub fn verify_groth16(
        &mut self,
        proof: Vec<u8>,
        public_inputs: Vec<u8>,
        vk_hash: [u8; 32],
    ) -> Result<bool> {
        // Check if contract is paused
        if self.paused.get() {
            return Err(Error::ContractPaused);
        }

        // Retrieve verification key from storage
        let vk_data = self.verification_keys.get(vk_hash);
        if vk_data.is_empty() {
            return Err(Error::VKNotRegistered);
        }

        // Perform Groth16 verification using our core engine
        let is_valid = groth16::verify(&proof, &public_inputs, &vk_data)?;

        // Only increment counter for valid proofs
        if is_valid {
            let count = self.verification_count.get();
            self.verification_count.set(count + U256::from(1));
        }

        Ok(is_valid)
    }

    /// Register a verification key for later use
    ///
    /// @param vk - Serialized verification key
    /// @return vkHash - Keccak256 hash of the VK
    pub fn register_vk(&mut self, vk: Vec<u8>) -> Result<[u8; 32]> {
        // Compute VK hash (Keccak256)
        let vk_hash = keccak256(&vk);

        // Check if already registered
        if !self.vk_registered.get(vk_hash) {
            // Store VK data
            self.verification_keys.insert(vk_hash, vk);
            self.vk_registered.insert(vk_hash, true);
        }

        Ok(vk_hash)
    }

    /// Get total number of successful verifications
    ///
    /// @return count - Total verifications performed
    pub fn get_verification_count(&self) -> U256 {
        self.verification_count.get()
    }

    /// Check if contract is paused
    ///
    /// @return paused - True if contract is paused
    pub fn is_paused(&self) -> bool {
        self.paused.get()
    }

    /// Pause the contract (admin only)
    pub fn pause(&mut self) -> Result<()> {
        // Check admin authorization
        if msg::sender() != self.admin.get() {
            return Err(Error::Unauthorized);
        }

        self.paused.set(true);
        Ok(())
    }

    /// Unpause the contract (admin only)
    pub fn unpause(&mut self) -> Result<()> {
        // Check admin authorization
        if msg::sender() != self.admin.get() {
            return Err(Error::Unauthorized);
        }

        self.paused.set(false);
        Ok(())
    }

    /// Check if verification key is registered
    ///
    /// @param vk_hash - Hash of the verification key
    /// @return registered - True if VK is registered
    pub fn is_vk_registered(&self, vk_hash: [u8; 32]) -> bool {
        self.vk_registered.get(vk_hash)
    }

    /// Mark a nullifier as used (prevent replay attacks)
    ///
    /// @param nullifier - Unique proof identifier
    /// @return success - True if nullifier was not already used
    pub fn mark_nullifier_used(&mut self, nullifier: [u8; 32]) -> Result<bool> {
        // Check if contract is paused
        if self.paused.get() {
            return Err(Error::ContractPaused);
        }

        // Check if already used
        if self.nullifiers.get(nullifier) {
            return Ok(false); // Already used
        }

        // Mark as used
        self.nullifiers.insert(nullifier, true);
        Ok(true)
    }

    /// Check if nullifier has been used
    ///
    /// @param nullifier - Unique proof identifier
    /// @return used - True if nullifier has been used
    pub fn is_nullifier_used(&self, nullifier: [u8; 32]) -> bool {
        self.nullifiers.get(nullifier)
    }
}

/// Helper function: Keccak256 hash
fn keccak256(data: &[u8]) -> [u8; 32] {
    use stylus_sdk::crypto;
    crypto::keccak(data).into()
}
