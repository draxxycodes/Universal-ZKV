//! UZKV Stylus - Universal ZK-Proof Verifier
//!
//! Production-grade zero-knowledge proof verification on Arbitrum Stylus.
//! Supports Groth16 zkSNARK verification with BN254 curve.

#![cfg_attr(not(feature = "export-abi"), no_main)]
#![cfg_attr(not(any(test, feature = "export-abi")), no_std)]

extern crate alloc;

use alloc::vec::Vec;
use alloy_sol_types::sol;
use stylus_sdk::{
    alloy_primitives::{FixedBytes, U256},
    crypto::keccak,
    prelude::*,
    storage::{StorageBool, StorageBytes, StorageMap},
    ArbResult,
};

pub mod groth16;

// Define Solidity-style errors
sol! {
    error ContractPaused();
    error VKNotRegistered();
    error VerificationFailed();
    error Unauthorized();
    error InvalidProofType();
    error ProofTypeNotSupported();
    error InvalidInputSize();
}

// Error type for contract
#[derive(SolidityError)]
pub enum UZKVError {
    ContractPaused(ContractPaused),
    VKNotRegistered(VKNotRegistered),
    VerificationFailed(VerificationFailed),
    Unauthorized(Unauthorized),
    InvalidProofType(InvalidProofType),
    ProofTypeNotSupported(ProofTypeNotSupported),
    InvalidInputSize(InvalidInputSize),
}

// Storage definition
#[storage]
#[entrypoint]
pub struct UZKVContract {
    // Total number of successful verifications
    verification_count: StorageU256,
    
    // Registered verification keys (vkHash => vkData)
    verification_keys: StorageMap<FixedBytes<32>, StorageBytes>,
    
    // Precomputed e(α, β) pairings for gas optimization
    precomputed_pairings: StorageMap<FixedBytes<32>, StorageBytes>,
    
    // VK registration status (vkHash => isRegistered)
    vk_registered: StorageMap<FixedBytes<32>, StorageBool>,
    
    // Circuit breaker (emergency pause)
    paused: StorageBool,
    
    // Nullifier tracking (prevent replay attacks)
    nullifiers: StorageMap<FixedBytes<32>, StorageBool>,
}

/// Public contract interface
#[public]
impl UZKVContract {
    /// Verify a Groth16 proof with gas optimization
    ///
    /// @param proof - Serialized Groth16 proof (compressed format)
    /// @param public_inputs - Serialized public input field elements
    /// @param vk_hash - Hash of the registered verification key
    /// @return true if proof is valid
    pub fn verify_groth16(
        &mut self,
        proof: Vec<u8>,
        public_inputs: Vec<u8>,
        vk_hash: FixedBytes<32>,
    ) -> Result<bool, UZKVError> {
        // Check if contract is paused
        if self.paused.get() {
            return Err(UZKVError::ContractPaused(ContractPaused {}));
        }

        // Retrieve verification key from storage
        let vk_data = self.verification_keys.get(vk_hash);
        if vk_data.is_empty() {
            return Err(UZKVError::VKNotRegistered(VKNotRegistered {}));
        }

        // Check if precomputed pairing is available (gas optimization)
        let precomputed_pairing = self.precomputed_pairings.get(vk_hash);
        
        let is_valid = if !precomputed_pairing.is_empty() {
            // Use optimized verification with precomputed e(α, β)
            groth16::verify_with_precomputed(&proof, &public_inputs, &vk_data, &precomputed_pairing)
                .map_err(|_| UZKVError::VerificationFailed(VerificationFailed {}))?
        } else {
            // Fall back to standard verification
            groth16::verify(&proof, &public_inputs, &vk_data)
                .map_err(|_| UZKVError::VerificationFailed(VerificationFailed {}))?
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
    /// @param vk - Serialized verification key
    /// @return vkHash - Keccak256 hash of the VK
    pub fn register_vk(&mut self, vk: Vec<u8>) -> Result<FixedBytes<32>, UZKVError> {
        // Compute VK hash (Keccak256)
        let vk_hash = keccak(&vk);

        // Check if already registered (idempotent operation)
        if !self.vk_registered.get(vk_hash).unwrap_or(false) {
            // Store VK data
            self.verification_keys.insert(vk_hash, vk.clone().into());
            self.vk_registered.insert(vk_hash, true);

            // Precompute e(α, β) pairing for gas optimization
            if let Ok(precomputed_pairing) = groth16::compute_precomputed_pairing(&vk) {
                self.precomputed_pairings.insert(vk_hash, precomputed_pairing.into());
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
    /// @param proof_type - Proof system type (0=Groth16)
    /// @param proof - Serialized proof
    /// @param public_inputs - Serialized public inputs
    /// @param vk_hash - Verification key hash
    /// @return true if proof is valid
    pub fn verify(
        &mut self,
        proof_type: u8,
        proof: Vec<u8>,
        public_inputs: Vec<u8>,
        vk_hash: FixedBytes<32>,
    ) -> Result<bool, UZKVError> {
        // Check if contract is paused
        if self.paused.get() {
            return Err(UZKVError::ContractPaused(ContractPaused {}));
        }

        // Only Groth16 supported for now
        if proof_type != 0 {
            return Err(UZKVError::ProofTypeNotSupported(ProofTypeNotSupported {}));
        }

        // Retrieve verification key from storage
        let vk_data = self.verification_keys.get(vk_hash);
        if vk_data.is_empty() {
            return Err(UZKVError::VKNotRegistered(VKNotRegistered {}));
        }

        // Check if precomputed pairing is available
        let precomputed_pairing = self.precomputed_pairings.get(vk_hash);
        
        let is_valid = if !precomputed_pairing.is_empty() {
            groth16::verify_with_precomputed(&proof, &public_inputs, &vk_data, &precomputed_pairing)
                .map_err(|_| UZKVError::VerificationFailed(VerificationFailed {}))?
        } else {
            groth16::verify(&proof, &public_inputs, &vk_data)
                .map_err(|_| UZKVError::VerificationFailed(VerificationFailed {}))?
        };

        // Increment verification counter for valid proofs
        if is_valid {
            let count = self.verification_count.get();
            self.verification_count.set(count + U256::from(1));
        }

        Ok(is_valid)
    }

    /// Batch verify multiple proofs
    ///
    /// @param proof_type - Proof system type (0=Groth16)
    /// @param proofs - Vector of serialized proofs
    /// @param public_inputs - Vector of serialized public inputs
    /// @param vk_hash - Verification key hash
    /// @return Vector of verification results
    pub fn batch_verify(
        &mut self,
        proof_type: u8,
        proofs: Vec<Vec<u8>>,
        public_inputs_vec: Vec<Vec<u8>>,
        vk_hash: FixedBytes<32>,
    ) -> Result<Vec<bool>, UZKVError> {
        // Check if contract is paused
        if self.paused.get() {
            return Err(UZKVError::ContractPaused(ContractPaused {}));
        }

        // Validate input lengths match
        if proofs.len() != public_inputs_vec.len() {
            return Err(UZKVError::InvalidInputSize(InvalidInputSize {}));
        }

        // Only Groth16 supported
        if proof_type != 0 {
            return Err(UZKVError::ProofTypeNotSupported(ProofTypeNotSupported {}));
        }

        // Retrieve VK
        let vk_data = self.verification_keys.get(vk_hash);
        if vk_data.is_empty() {
            return Err(UZKVError::VKNotRegistered(VKNotRegistered {}));
        }

        let precomputed_pairing = self.precomputed_pairings.get(vk_hash);

        // Batch verify all proofs
        let results = groth16::batch_verify(&proofs, &public_inputs_vec, &vk_data, &precomputed_pairing)
            .map_err(|_| UZKVError::VerificationFailed(VerificationFailed {}))?;

        // Increment counter by number of valid proofs
        let valid_count = results.iter().filter(|&&r| r).count();
        if valid_count > 0 {
            let count = self.verification_count.get();
            self.verification_count.set(count + U256::from(valid_count));
        }

        Ok(results)
    }

    /// Check if contract is paused
    pub fn is_paused(&self) -> bool {
        self.paused.get()
    }

    /// Check if verification key is registered
    pub fn is_vk_registered(&self, vk_hash: FixedBytes<32>) -> bool {
        self.vk_registered.get(vk_hash).unwrap_or(false)
    }

    /// Mark a nullifier as used (prevent replay attacks)
    pub fn mark_nullifier_used(&mut self, nullifier: FixedBytes<32>) -> Result<bool, UZKVError> {
        // Check if contract is paused
        if self.paused.get() {
            return Err(UZKVError::ContractPaused(ContractPaused {}));
        }

        // Check if already used
        if self.nullifiers.get(nullifier).unwrap_or(false) {
            return Ok(false); // Already used
        }

        // Mark as used
        self.nullifiers.insert(nullifier, true);
        Ok(true)
    }

    /// Check if nullifier has been used
    pub fn is_nullifier_used(&self, nullifier: FixedBytes<32>) -> bool {
        self.nullifiers.get(nullifier).unwrap_or(false)
    }
}
