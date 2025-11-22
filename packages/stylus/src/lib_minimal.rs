//! UZKV Stylus - Universal ZK-Proof Verifier (Minimal Version)
//!
//! Production-grade Groth16 verification on Arbitrum Stylus

#![cfg_attr(not(feature = "export-abi"), no_main)]
#![cfg_attr(not(any(test, feature = "export-abi")), no_std)]

extern crate alloc;

use alloc::vec::Vec;
use stylus_sdk::{
    alloy_primitives::{FixedBytes, U256},
    crypto::keccak,
    prelude::*,
    storage::{StorageBool, StorageBytes, StorageMap, StorageU256},
};

pub mod groth16;

// Storage definition
#[storage]
#[entrypoint]
pub struct UZKVContract {
    verification_count: StorageU256,
    verification_keys: StorageMap<FixedBytes<32>, StorageBytes>,
    vk_registered: StorageMap<FixedBytes<32>, StorageBool>,
}

/// Public contract interface
#[public]
impl UZKVContract {
    /// Verify a Groth16 proof
    pub fn verify_groth16(
        &mut self,
        proof: Vec<u8>,
        public_inputs: Vec<u8>,
        vk_hash: FixedBytes<32>,
    ) -> Result<bool, Vec<u8>> {
        // Retrieve verification key from storage
        let vk_data = self.verification_keys.get(vk_hash).get_bytes();
        if vk_data.is_empty() {
            return Err(b"VK not registered".to_vec());
        }

        // Verify the proof
        let is_valid = groth16::verify(&proof, &public_inputs, &vk_data)
            .map_err(|_| b"Verification failed".to_vec())?;

        // Increment counter for valid proofs
        if is_valid {
            let count = self.verification_count.get();
            self.verification_count.set(count + U256::from(1));
        }

        Ok(is_valid)
    }

    /// Register a verification key
    pub fn register_vk(&mut self, vk: Vec<u8>) -> Result<FixedBytes<32>, Vec<u8>> {
        // Compute VK hash
        let vk_hash = keccak(&vk);

        // Store if not already registered
        if !self.vk_registered.get(vk_hash) {
            self.verification_keys.setter(vk_hash).set_bytes(&vk);
            self.vk_registered.setter(vk_hash).set(true);
        }

        Ok(vk_hash)
    }

    /// Get total verification count
    pub fn get_verification_count(&self) -> U256 {
        self.verification_count.get()
    }

    /// Check if VK is registered
    pub fn is_vk_registered(&self, vk_hash: FixedBytes<32>) -> bool {
        self.vk_registered.get(vk_hash)
    }
}
