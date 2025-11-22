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
    alloy_primitives::{Address, FixedBytes, U256},
    crypto::keccak,
    prelude::*,
    storage::{StorageAddress, StorageBool, StorageU256, StorageMap, StorageBytes},
};
use wee_alloc::WeeAlloc;

// Custom allocator for WASM environment
#[global_allocator]
static ALLOC: WeeAlloc = WeeAlloc::INIT;

pub mod groth16;

/// Error types for UZKV contract
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
#[repr(u8)]
pub enum Error {
    /// Proof deserialization failed
    DeserializationError = 0,
    /// Proof contains invalid curve points
    MalformedProof = 1,
    /// Invalid verification key
    InvalidVerificationKey = 2,
    /// Invalid public inputs
    InvalidPublicInputs = 3,
    /// Verification failed
    VerificationFailed = 4,
    /// Input size constraints violated
    InvalidInputSize = 5,
    /// Contract is paused
    ContractPaused = 6,
    /// Verification key not registered
    VKNotRegistered = 7,
    /// Unauthorized access
    Unauthorized = 8,
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

// Implement conversion to Vec<u8> for Stylus SDK error handling
impl From<Error> for Vec<u8> {
    fn from(error: Error) -> Vec<u8> {
        let msg = match error {
            Error::DeserializationError => "Failed to deserialize proof",
            Error::MalformedProof => "Proof contains invalid curve points",
            Error::InvalidVerificationKey => "Invalid verification key",
            Error::InvalidPublicInputs => "Invalid public inputs",
            Error::VerificationFailed => "Proof verification failed",
            Error::InvalidInputSize => "Input size exceeds limits",
            Error::ContractPaused => "Contract is paused",
            Error::VKNotRegistered => "Verification key not registered",
            Error::Unauthorized => "Unauthorized access",
        };
        msg.as_bytes().to_vec()
    }
}

/// Result type for UZKV operations
pub type Result<T> = core::result::Result<T, Error>;

// Stylus contract storage definition using sol_storage! macro
sol_storage! {
    #[entrypoint]
    pub struct UZKVContract {
        // Total number of successful verifications
        uint256 verification_count;
        
        // Registered verification keys (vkHash => vkData)
        mapping(bytes32 => bytes) verification_keys;
        
        // Precomputed e(α, β) pairings for gas optimization (vkHash => pairingData)
        mapping(bytes32 => bytes) precomputed_pairings;
        
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

/// Stylus contract implementation (v0.6 uses #[public] instead of #[external])
#[public]
impl UZKVContract {
    /// Verify a Groth16 proof with gas optimization
    ///
    /// Uses precomputed pairing if available for ~80k gas savings
    /// 
    /// @param proof - Serialized Groth16 proof
    /// @param public_inputs - Serialized public inputs
    /// @param vk_hash - Keccak256 hash of the verification key
    /// @return true if proof is valid
    pub fn verify_groth16(
        &mut self,
        proof: Vec<u8>,
        public_inputs: Vec<u8>,
        vk_hash: FixedBytes<32>,
    ) -> Result<bool> {
        // Check if contract is paused
        if self.paused.get() {
            return Err(Error::ContractPaused);
        }

        // Retrieve verification key from storage
        let vk_guard = self.verification_keys.get(vk_hash);
        let vk_bytes = vk_guard.get_bytes();
        if vk_bytes.is_empty() {
            return Err(Error::VKNotRegistered);
        }

        // Check if precomputed pairing is available
        let is_valid = if let Some(precomputed_guard) = self.precomputed_pairings.get(vk_hash) {
            let precomputed_bytes = precomputed_guard.get_bytes();
            if !precomputed_bytes.is_empty() {
                groth16::verify_with_precomputed(&proof, &public_inputs, &vk_bytes, &precomputed_bytes)?
            } else {
                groth16::verify(&proof, &public_inputs, &vk_bytes)?
            }
        } else {
            groth16::verify(&proof, &public_inputs, &vk_bytes)?
        };

        // Only increment counter for valid proofs
        if is_valid {
            let count = self.verification_count.get();
            self.verification_count.set(count + U256::from(1));
        }

        Ok(is_valid)
    }

    /// Register a verification key with gas optimization precomputation
    ///
    /// Computes and stores e(α, β) pairing for ~80k gas savings per verification.
    /// Break-even point: 2 verifications.
    ///
    /// @param vk - Serialized verification key
    /// @return vkHash - Keccak256 hash of the VK
    pub fn register_vk(&mut self, vk: Vec<u8>) -> Result<FixedBytes<32>> {
        // Compute VK hash (Keccak256)
        let vk_hash: FixedBytes<32> = keccak(&vk).into();

        // Check if already registered (idempotent operation)
        if !self.vk_registered.get(vk_hash).unwrap_or(false) {
            // Store VK data using stylus-sdk 0.6 API
            self.verification_keys.setter(vk_hash).set_bytes(&vk);
            self.vk_registered.insert(vk_hash, true);

            // Precompute e(α, β) pairing for gas optimization
            // This is a one-time cost (~100k gas) that saves ~80k gas per verification
            match groth16::compute_precomputed_pairing(&vk) {
                Ok(precomputed_pairing) => {
                    self.precomputed_pairings.setter(vk_hash).set_bytes(&precomputed_pairing);
                }
                Err(_) => {
                    // If precomputation fails, continue without optimization
                    // Contract will fall back to standard verification
                }
            }
        }

        Ok(vk_hash)
    }

    /// Get total number of successful verifications
    ///
    /// @return count - Total verifications performed
    pub fn get_verification_count(&self) -> U256 {
        self.verification_count.get()
    }

    /// Check if verification key is registered
    ///
    /// @param vk_hash - Keccak256 hash of the verification key
    /// @return true if VK is registered
    pub fn is_vk_registered(&self, vk_hash: FixedBytes<32>) -> bool {
        self.vk_registered.get(vk_hash).unwrap_or(false)
    }

    /// Check if contract is paused
    ///
    /// @return true if paused
    pub fn is_paused(&self) -> bool {
        self.paused.get()
    }

    /// Get contract admin address
    ///
    /// @return admin address
    pub fn get_admin(&self) -> Address {
        self.admin.get()
    }

    /// Pause contract (admin only)
    ///
    /// Emergency circuit breaker to stop all verifications
    pub fn pause(&mut self) -> Result<()> {
        self.only_admin()?;
        self.paused.set(true);
        Ok(())
    }

    /// Unpause contract (admin only)
    pub fn unpause(&mut self) -> Result<()> {
        self.only_admin()?;
        self.paused.set(false);
        Ok(())
    }

    /// Transfer admin role (admin only)
    ///
    /// @param new_admin - New admin address
    pub fn transfer_admin(&mut self, new_admin: Address) -> Result<()> {
        self.only_admin()?;
        self.admin.set(new_admin);
        Ok(())
    }

    /// Check if nullifier has been used
    ///
    /// @param nullifier - Nullifier hash
    /// @return true if used
    pub fn is_nullifier_used(&self, nullifier: FixedBytes<32>) -> bool {
        self.nullifiers.get(nullifier).unwrap_or(false)
    }

    /// Mark nullifier as used (prevents replay attacks)
    ///
    /// @param nullifier - Nullifier hash
    pub fn mark_nullifier_used(&mut self, nullifier: FixedBytes<32>) -> Result<()> {
        if self.is_nullifier_used(nullifier) {
            return Err(Error::InvalidInputSize); // Reusing error for replay protection
        }
        self.nullifiers.insert(nullifier, true);
        Ok(())
    }
}

/// Internal helper methods
impl UZKVContract {
    /// Check if caller is admin
    fn only_admin(&self) -> Result<()> {
        if stylus_sdk::msg::sender() != self.admin.get() {
            return Err(Error::Unauthorized);
        }
        Ok(())
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_error_conversion() {
        let err = Error::DeserializationError;
        let bytes: Vec<u8> = err.into();
        assert!(!bytes.is_empty());
    }
}
