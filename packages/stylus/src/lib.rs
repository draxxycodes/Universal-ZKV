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
    alloy_primitives::{FixedBytes, U256},
    prelude::*,
    msg,
};
use wee_alloc::WeeAlloc;

// Custom allocator for WASM environment
// WeeAlloc provides small code size and predictable memory usage
#[global_allocator]
static ALLOC: WeeAlloc = WeeAlloc::INIT;

// Panic handler for no_std environment (not used in tests)
#[cfg(all(not(feature = "std"), not(test)))]
#[panic_handler]
fn panic(_info: &core::panic::PanicInfo) -> ! {
    loop {}
}

pub mod groth16;
pub mod plonk;

// STARK implementation - transparent setup, post-quantum security
pub mod stark;

/// Proof type enumeration for universal verification
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
#[repr(u8)]
pub enum ProofType {
    /// Groth16 zkSNARK (trusted setup, ~60k gas)
    Groth16 = 0,
    /// PLONK universal SNARK (universal setup, ~120k gas)
    PLONK = 1,
    /// STARK (transparent, no setup, ~280k gas)
    STARK = 2,
}

impl ProofType {
    /// Convert u8 to ProofType
    pub fn from_u8(value: u8) -> Result<Self> {
        match value {
            0 => Ok(ProofType::Groth16),
            1 => Ok(ProofType::PLONK),
            2 => Ok(ProofType::STARK),
            _ => Err(Error::InvalidProofType),
        }
    }
}

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
    /// Invalid proof type
    InvalidProofType,
    /// Proof type not supported yet
    ProofTypeNotSupported,
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
            Error::InvalidProofType => write!(f, "Invalid proof type"),
            Error::ProofTypeNotSupported => write!(f, "Proof type not supported yet"),
        }
    }
}

// Implement From<groth16::Error> for Error conversion with ? operator
impl From<groth16::Error> for Error {
    fn from(err: groth16::Error) -> Self {
        match err {
            groth16::Error::DeserializationError => Error::DeserializationError,
            groth16::Error::MalformedProof => Error::MalformedProof,
            groth16::Error::InvalidVerificationKey => Error::InvalidVerificationKey,
            groth16::Error::InvalidPublicInputs => Error::InvalidPublicInputs,
            groth16::Error::VerificationFailed => Error::VerificationFailed,
            groth16::Error::InvalidInputSize => Error::InvalidInputSize,
        }
    }
}

// Implement Into<Vec<u8>> for Error to satisfy stylus-sdk EncodableReturnType constraint
impl Into<Vec<u8>> for Error {
    fn into(self) -> Vec<u8> {
        match self {
            Error::DeserializationError => b"Failed to deserialize proof".to_vec(),
            Error::MalformedProof => b"Proof contains invalid curve points".to_vec(),
            Error::InvalidVerificationKey => b"Invalid verification key".to_vec(),
            Error::InvalidPublicInputs => b"Invalid public inputs".to_vec(),
            Error::VerificationFailed => b"Proof verification failed".to_vec(),
            Error::InvalidInputSize => b"Input size exceeds limits".to_vec(),
            Error::ContractPaused => b"Contract is paused".to_vec(),
            Error::VKNotRegistered => b"Verification key not registered".to_vec(),
            Error::Unauthorized => b"Unauthorized access".to_vec(),
            Error::InvalidProofType => b"Invalid proof type".to_vec(),
            Error::ProofTypeNotSupported => b"Proof type not supported yet".to_vec(),
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

/// Stylus contract implementation
#[external]
impl UZKVContract {
    /// Verify a Groth16 proof with gas optimization
    ///
    /// Uses precomputed e(α, β) pairing to save ~80,000 gas per verification.
    /// Falls back to standard verification if precomputed pairing not available.
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
        let vk_hash_fixed = FixedBytes::from(vk_hash);
        let vk_storage = self.verification_keys.get(vk_hash_fixed);
        if vk_storage.is_empty() {
            return Err(Error::VKNotRegistered);
        }
        let vk_data = vk_storage.get_bytes();

        // Check if precomputed pairing is available (gas optimization)
        let precomputed_storage = self.precomputed_pairings.get(vk_hash_fixed);
        let precomputed_pairing = precomputed_storage.get_bytes();
        
        let is_valid = if !precomputed_pairing.is_empty() {
            // Use optimized verification with precomputed e(α, β) (~80k gas savings)
            groth16::verify_with_precomputed(&proof, &public_inputs, &vk_data, &precomputed_pairing)?
        } else {
            // Fall back to standard verification (computes all 4 pairings)
            groth16::verify(&proof, &public_inputs, &vk_data)?
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
    pub fn register_vk(&mut self, vk: Vec<u8>) -> Result<[u8; 32]> {
        // Compute VK hash (Keccak256)
        let vk_hash = keccak256(&vk);
        let vk_hash_fixed = FixedBytes::from(vk_hash);

        // Check if already registered (idempotent operation)
        if !self.vk_registered.get(vk_hash_fixed) {
            // Store VK data
            self.verification_keys.setter(vk_hash_fixed).set_bytes(&vk);
            self.vk_registered.insert(vk_hash_fixed, true);

            // Precompute e(α, β) pairing for gas optimization
            // This is a one-time cost (~100k gas) that saves ~80k gas per verification
            match groth16::compute_precomputed_pairing(&vk) {
                Ok(precomputed_pairing) => {
                    self.precomputed_pairings.setter(vk_hash_fixed).set_bytes(&precomputed_pairing);
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

    /// Universal verify - routes to appropriate verifier based on proof type
    ///
    /// Supports multiple proof systems:
    /// - Groth16 (type 0): Trusted setup, ~60k gas
    /// - PLONK (type 1): Universal setup, ~120k gas (TODO: not yet enabled)
    /// - STARK (type 2): Transparent, ~280k gas (TODO: not yet enabled)
    ///
    /// @param proof_type - Proof system type (0=Groth16, 1=PLONK, 2=STARK)
    /// @param proof - Serialized proof
    /// @param public_inputs - Serialized public inputs
    /// @param vk_hash - Verification key hash (not used for STARK)
    /// @return true if proof is valid
    pub fn verify(
        &mut self,
        proof_type: u8,
        proof: Vec<u8>,
        public_inputs: Vec<u8>,
        vk_hash: [u8; 32],
    ) -> Result<bool> {
        // Check if contract is paused
        if self.paused.get() {
            return Err(Error::ContractPaused);
        }

        // Convert to ProofType enum
        let ptype = ProofType::from_u8(proof_type)?;

        // Route to appropriate verifier
        let is_valid = match ptype {
            ProofType::Groth16 => {
                // Retrieve verification key from storage
                let vk_hash_fixed = FixedBytes::from(vk_hash);
                let vk_storage = self.verification_keys.get(vk_hash_fixed);
                if vk_storage.is_empty() {
                    return Err(Error::VKNotRegistered);
                }
                let vk_data = vk_storage.get_bytes();

                // Check if precomputed pairing is available
                let precomputed_storage = self.precomputed_pairings.get(vk_hash_fixed);
                let precomputed_pairing = precomputed_storage.get_bytes();

                if !precomputed_pairing.is_empty() {
                    groth16::verify_with_precomputed(&proof, &public_inputs, &vk_data, &precomputed_pairing)?
                } else {
                    groth16::verify(&proof, &public_inputs, &vk_data)?
                }
            }
            ProofType::PLONK => {
                // PLONK verification (universal setup)
                let vk_hash_fixed = FixedBytes::from(vk_hash);
                let vk_storage = self.verification_keys.get(vk_hash_fixed);
                if vk_storage.is_empty() {
                    return Err(Error::VKNotRegistered);
                }
                let vk_data = vk_storage.get_bytes();
                
                plonk::verify(&proof, &public_inputs, &vk_data)
                    .map_err(|_| Error::VerificationFailed)?
            }
            ProofType::STARK => {
                // STARK doesn't use VKs (transparent setup)
                stark::verify_proof(&proof, &public_inputs)
                    .map_err(|_| Error::VerificationFailed)?
            }
        };

        // Increment verification counter for valid proofs
        if is_valid {
            let count = self.verification_count.get();
            self.verification_count.set(count + U256::from(1));
        }

        Ok(is_valid)
    }

    /// Register a verification key for a specific proof type
    ///
    /// @param proof_type - Proof system type (0=Groth16, 1=PLONK, 2=STARK)
    /// @param vk - Serialized verification key
    /// @return vkHash - Keccak256 hash of the VK
    pub fn register_vk_typed(&mut self, proof_type: u8, vk: Vec<u8>) -> Result<[u8; 32]> {
        let ptype = ProofType::from_u8(proof_type)?;

        // Compute VK hash
        let vk_hash = keccak256(&vk);
        let vk_hash_fixed = FixedBytes::from(vk_hash);

        // Check if already registered
        if !self.vk_registered.get(vk_hash_fixed) {
            // Store VK data
            self.verification_keys.setter(vk_hash_fixed).set_bytes(&vk);
            self.vk_registered.insert(vk_hash_fixed, true);

            // Precompute optimizations based on proof type
            match ptype {
                ProofType::Groth16 => {
                    // Precompute e(α, β) pairing for gas savings
                    if let Ok(precomputed) = groth16::compute_precomputed_pairing(&vk) {
                        self.precomputed_pairings.setter(vk_hash_fixed).set_bytes(&precomputed);
                    }
                }
                ProofType::PLONK => {
                    // TODO: PLONK-specific precomputations when module is ready
                }
                ProofType::STARK => {
                    // STARK doesn't use VKs (transparent setup)
                    // No precomputation needed
                }
            }
        }

        Ok(vk_hash)
    }

    /// Batch verify multiple proofs of the same type with the same verification key
    ///
    /// More gas-efficient than calling verify() multiple times.
    ///
    /// @param proof_type - Proof system type (0=Groth16, 1=PLONK, 2=STARK)
    /// @param proofs - Vector of serialized proofs
    /// @param public_inputs - Vector of serialized public inputs (must match proofs length)
    /// @param vk_hash - Verification key hash (shared across all proofs)
    /// @return Vector of verification results (true = valid, false = invalid)
    pub fn batch_verify(
        &mut self,
        proof_type: u8,
        proofs: Vec<Vec<u8>>,
        public_inputs: Vec<Vec<u8>>,
        vk_hash: [u8; 32],
    ) -> Result<Vec<bool>> {
        // Check if contract is paused
        if self.paused.get() {
            return Err(Error::ContractPaused);
        }

        // Validate input lengths match
        if proofs.len() != public_inputs.len() {
            return Err(Error::InvalidInputSize);
        }

        // Convert to ProofType enum
        let ptype = ProofType::from_u8(proof_type)?;

        // Route to appropriate batch verifier
        let results = match ptype {
            ProofType::Groth16 => {
                // Retrieve VK and precomputed pairing
                let vk_hash_fixed = FixedBytes::from(vk_hash);
                let vk_storage = self.verification_keys.get(vk_hash_fixed);
                if vk_storage.is_empty() {
                    return Err(Error::VKNotRegistered);
                }
                let vk_data = vk_storage.get_bytes();

                let precomputed_storage = self.precomputed_pairings.get(vk_hash_fixed);
                let precomputed_pairing = precomputed_storage.get_bytes();

                // Batch verify all proofs
                groth16::batch_verify(&proofs, &public_inputs, &vk_data, &precomputed_pairing)?
            }
            ProofType::PLONK => {
                // PLONK batch verification
                let vk_hash_fixed = FixedBytes::from(vk_hash);
                let vk_storage = self.verification_keys.get(vk_hash_fixed);
                if vk_storage.is_empty() {
                    return Err(Error::VKNotRegistered);
                }
                let vk_data = vk_storage.get_bytes();
                
                plonk::batch_verify(&proofs, &public_inputs, &vk_data)
                    .map_err(|_| Error::VerificationFailed)?
            }
            ProofType::STARK => {
                // STARK batch verification
                stark::batch_verify_proofs(&proofs, &public_inputs)
                    .map_err(|_| Error::VerificationFailed)?
            }
        };

        // Increment counter by number of valid proofs
        let valid_count = results.iter().filter(|&&r| r).count();
        if valid_count > 0 {
            let count = self.verification_count.get();
            self.verification_count.set(count + U256::from(valid_count));
        }

        Ok(results)
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
        self.vk_registered.get(FixedBytes::from(vk_hash))
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
        let nullifier_fixed = FixedBytes::from(nullifier);
        if self.nullifiers.get(nullifier_fixed) {
            return Ok(false); // Already used
        }

        // Mark as used
        self.nullifiers.insert(nullifier_fixed, true);
        Ok(true)
    }

    /// Check if nullifier has been used
    ///
    /// @param nullifier - Unique proof identifier
    /// @return used - True if nullifier has been used
    pub fn is_nullifier_used(&self, nullifier: [u8; 32]) -> bool {
        self.nullifiers.get(FixedBytes::from(nullifier))
    }
}

/// Helper function: Keccak256 hash
fn keccak256(data: &[u8]) -> [u8; 32] {
    use stylus_sdk::crypto;
    crypto::keccak(data).into()
}
