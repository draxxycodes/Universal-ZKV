#![cfg_attr(not(feature = "std"), no_std)]
#![cfg_attr(not(test), no_main)]

extern crate alloc;

use alloc::vec::Vec;
use stylus_sdk::{
    alloy_primitives::{Address, FixedBytes, U256, keccak256},
    prelude::*,
    msg,
};

use wee_alloc::WeeAlloc;

#[global_allocator]
static ALLOC: WeeAlloc = WeeAlloc::INIT;

#[cfg(not(feature = "std"))]
#[panic_handler]
fn panic(_info: &core::panic::PanicInfo) -> ! {
    loop {}
}

sol_storage! {
    #[entrypoint]
    pub struct ProofAttestor {
        address owner;
        address attestor;
        mapping(bytes32 => bool) attested_proofs;
        uint256 attestation_count;
        bool initialized;
    }
}

#[external]
impl ProofAttestor {
    /// Initialize the contract with an attestor address
    /// Can only be called once
    pub fn initialize(&mut self, attestor_address: Address) -> Result<(), Vec<u8>> {
        if self.initialized.get() {
            return Err(b"Already initialized".to_vec());
        }

        self.owner.set(msg::sender());
        self.attestor.set(attestor_address);
        self.initialized.set(true);

        Ok(())
    }

    /// Attest a proof hash (only callable by attestor)
    pub fn attest_proof(&mut self, proof_hash: FixedBytes<32>) -> Result<(), Vec<u8>> {
        if msg::sender() != self.attestor.get() {
            return Err(b"Only attestor can attest".to_vec());
        }

        if self.attested_proofs.get(proof_hash) {
            return Err(b"Proof already attested".to_vec());
        }

        self.attested_proofs.insert(proof_hash, true);
        self.attestation_count.set(self.attestation_count.get() + U256::from(1));

        // Log event without sol! macro - SDK 0.5.0 doesn't support it
        // Events can be added later if needed
        
        Ok(())
    }

    /// Check if a proof hash has been attested
    pub fn is_attested(&self, proof_hash: FixedBytes<32>) -> Result<bool, Vec<u8>> {
        Ok(self.attested_proofs.get(proof_hash))
    }

    /// Get the total number of attestations
    pub fn get_attestation_count(&self) -> Result<U256, Vec<u8>> {
        Ok(self.attestation_count.get())
    }

    /// Get the current attestor address
    pub fn get_attestor(&self) -> Result<Address, Vec<u8>> {
        Ok(self.attestor.get())
    }

    /// Set a new attestor address (only owner)
    pub fn set_attestor(&mut self, new_attestor: Address) -> Result<(), Vec<u8>> {
        if msg::sender() != self.owner.get() {
            return Err(b"Only owner can set attestor".to_vec());
        }

        self.attestor.set(new_attestor);
        
        Ok(())
    }

    /// Transfer ownership to a new address (only owner)
    pub fn transfer_ownership(&mut self, new_owner: Address) -> Result<(), Vec<u8>> {
        if msg::sender() != self.owner.get() {
            return Err(b"Only owner can transfer ownership".to_vec());
        }

        self.owner.set(new_owner);
        
        Ok(())
    }

    /// Recover signer from a proof hash and signature
    /// This is a utility function to verify signatures off-chain
    pub fn recover_signer(
        &self,
        proof_hash: FixedBytes<32>,
        v: u8,
        r: FixedBytes<32>,
        s: FixedBytes<32>,
    ) -> Result<Address, Vec<u8>> {
        // Prepare the message hash (Ethereum signed message format)
        let mut message = Vec::new();
        message.extend_from_slice(b"\x19Ethereum Signed Message:\n32");
        message.extend_from_slice(proof_hash.as_slice());

        // Hash the message
        let message_hash = keccak256(&message);

        // For SDK 0.5.0, we can't easily call ecrecover precompile
        // This would need to be implemented differently or removed
        // For now, return an error indicating it's not supported
        Err(b"ecrecover not available in SDK 0.5.0".to_vec())
    }

    /// Get the owner address
    pub fn get_owner(&self) -> Result<Address, Vec<u8>> {
        Ok(self.owner.get())
    }
}
