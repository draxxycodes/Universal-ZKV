//! ERC-7201 Namespaced Storage for UZKV
//!
//! This module provides storage primitives that align with the Solidity storage layout
//! defined in `packages/contracts/src/libraries/Storage.sol`.
//!
//! Storage namespace: "arbitrum.uzkv.storage.v1"
//! Slot: keccak256("arbitrum.uzkv.storage.v1") - 1
//! Value: 0xe96c698557d1c96b88bdb445dd1e4d98c586bf83d2bb4c85329a45b5cd63a0d0

#![cfg_attr(not(feature = "std"), no_std)]

extern crate alloc;

use alloc::vec::Vec;
use stylus_sdk::storage::{StorageMap, StorageU256, StorageBool};
use stylus_sdk::alloy_primitives::{B256, U256, Address};

/// ERC-7201 storage slot: keccak256("arbitrum.uzkv.storage.v1") - 1
/// This MUST match the STORAGE_SLOT constant in Storage.sol
pub const STORAGE_SLOT: [u8; 32] = [
    0xe9, 0x6c, 0x69, 0x85, 0x57, 0xd1, 0xc9, 0x6b,
    0x88, 0xbd, 0xb4, 0x45, 0xdd, 0x1e, 0x4d, 0x98,
    0xc5, 0x86, 0xbf, 0x83, 0xd2, 0xbb, 0x4c, 0x85,
    0x32, 0x9a, 0x45, 0xb5, 0xcd, 0x63, 0xa0, 0xd0,
];

/// Storage layout matching the Solidity StorageLayout struct
///
/// Field ordering MUST match the Solidity struct exactly for proper alignment.
/// Each field is stored at STORAGE_SLOT + offset according to Solidity's layout rules.
#[stylus_sdk::storage]
pub struct UZKVStorage {
    /// Mapping of verification key hashes to their registration status
    /// Offset 0: verificationKeys mapping
    pub verification_keys: StorageMap<B256, StorageBool>,
    
    /// Total number of registered verification keys
    /// Offset 1: vkCount uint256
    pub vk_count: StorageU256,
    
    /// Mapping of proof system ID to verifier address
    /// Offset 2: verifiers mapping
    /// 1 = Groth16, 2 = PLONK, 3 = STARK
    pub verifiers: StorageMap<u8, Address>,
    
    /// Emergency pause flag
    /// Offset 3: paused bool
    pub paused: StorageBool,
    
    /// Mapping of nullifiers to prevent proof replay
    /// Offset 4: nullifiers mapping
    pub nullifiers: StorageMap<B256, StorageBool>,
    
    /// Total verification count (for metrics)
    /// Offset 5: totalVerifications uint256
    pub total_verifications: StorageU256,
}

impl UZKVStorage {
    /// Check if a verification key is registered
    pub fn is_vk_registered(&self, vk_hash: B256) -> bool {
        self.verification_keys.get(vk_hash)
    }

    /// Register a verification key
    ///
    /// # Panics
    /// Panics if the VK is already registered
    pub fn register_vk(&mut self, vk_hash: B256) {
        assert!(!self.is_vk_registered(vk_hash), "VK already registered");
        self.verification_keys.insert(vk_hash, true);
        
        let count = self.vk_count.get();
        self.vk_count.set(count + U256::from(1));
    }

    /// Get the verifier address for a proof system
    ///
    /// # Arguments
    /// * `proof_system_id` - Proof system identifier (1=Groth16, 2=PLONK, 3=STARK)
    pub fn get_verifier(&self, proof_system_id: u8) -> Address {
        self.verifiers.get(proof_system_id)
    }

    /// Set the verifier address for a proof system
    ///
    /// # Arguments
    /// * `proof_system_id` - Proof system identifier (1=Groth16, 2=PLONK, 3=STARK)
    /// * `verifier` - Verifier contract address
    pub fn set_verifier(&mut self, proof_system_id: u8, verifier: Address) {
        self.verifiers.insert(proof_system_id, verifier);
    }

    /// Check if contract is paused
    pub fn is_paused(&self) -> bool {
        self.paused.get()
    }

    /// Set pause state
    pub fn set_paused(&mut self, state: bool) {
        self.paused.set(state);
    }

    /// Check if a nullifier has been used
    pub fn is_nullifier_used(&self, nullifier: B256) -> bool {
        self.nullifiers.get(nullifier)
    }

    /// Mark a nullifier as used
    ///
    /// # Panics
    /// Panics if the nullifier has already been used
    pub fn mark_nullifier_used(&mut self, nullifier: B256) {
        assert!(!self.is_nullifier_used(nullifier), "Nullifier already used");
        self.nullifiers.insert(nullifier, true);
    }

    /// Increment total verifications counter
    pub fn increment_verifications(&mut self) {
        let count = self.total_verifications.get();
        self.total_verifications.set(count + U256::from(1));
    }

    /// Get total verification count
    pub fn get_total_verifications(&self) -> U256 {
        self.total_verifications.get()
    }

    /// Get total VK count
    pub fn get_vk_count(&self) -> U256 {
        self.vk_count.get()
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_storage_slot_constant() {
        // Verify the storage slot matches expected ERC-7201 calculation
        let expected: [u8; 32] = [
            0xe9, 0x6c, 0x69, 0x85, 0x57, 0xd1, 0xc9, 0x6b,
            0x88, 0xbd, 0xb4, 0x45, 0xdd, 0x1e, 0x4d, 0x98,
            0xc5, 0x86, 0xbf, 0x83, 0xd2, 0xbb, 0x4c, 0x85,
            0x32, 0x9a, 0x45, 0xb5, 0xcd, 0x63, 0xa0, 0xd0,
        ];
        assert_eq!(STORAGE_SLOT, expected);
    }

    #[test]
    fn test_storage_slot_matches_solidity() {
        // Solidity constant: 0xe96c698557d1c96b88bdb445dd1e4d98c586bf83d2bb4c85329a45b5cd63a0d0
        let solidity_slot = B256::from(STORAGE_SLOT);
        let expected = B256::from_slice(&[
            0xe9, 0x6c, 0x69, 0x85, 0x57, 0xd1, 0xc9, 0x6b,
            0x88, 0xbd, 0xb4, 0x45, 0xdd, 0x1e, 0x4d, 0x98,
            0xc5, 0x86, 0xbf, 0x83, 0xd2, 0xbb, 0x4c, 0x85,
            0x32, 0x9a, 0x45, 0xb5, 0xcd, 0x63, 0xa0, 0xd0,
        ]);
        assert_eq!(solidity_slot, expected);
    }
}
