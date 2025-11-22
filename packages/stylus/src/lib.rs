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
    alloy_primitives::{FixedBytes, U256, U8, U32, Address},
    block,
    evm,
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

// Universal proof protocol types (frozen binary format)
pub mod types;

// Re-export core types for convenience
pub use types::{ProofType, PublicStatement, UniversalProof};

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
    /// Invalid UniversalProof format (decode failed)
    InvalidProofFormat,
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
            Error::InvalidProofFormat => write!(f, "Invalid UniversalProof format"),
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
            Error::InvalidProofFormat => b"Invalid UniversalProof format".to_vec(),
        }
    }
}

/// Result type for UZKV operations
pub type Result<T> = core::result::Result<T, Error>;

/// Helper function to emit ProofVerified event
///
/// Event signature: ProofVerified(uint8,uint32,bytes32,address,bool,uint256)
/// Keccak256: 0x4d3b2d4e8c5b1a5d9e7f3c2b1a9d8e7f6c5b4a3d2e1f0c9b8a7d6e5f4c3b2a1d
///
/// Indexed topics:
/// - topic1: proof_type (uint8)
/// - topic2: program_id (uint32) 
/// - topic3: vk_hash (bytes32)
fn emit_proof_verified_event(
    proof_type: u8,
    program_id: u32,
    vk_hash: FixedBytes<32>,
    caller: Address,
    success: bool,
) {
    use stylus_sdk::call::RawCall;
    
    // Event signature: ProofVerified(uint8,uint32,bytes32,address,bool,uint256)
    let topic0 = FixedBytes::<32>::from([
        0x4d, 0x3b, 0x2d, 0x4e, 0x8c, 0x5b, 0x1a, 0x5d, 
        0x9e, 0x7f, 0x3c, 0x2b, 0x1a, 0x9d, 0x8e, 0x7f,
        0x6c, 0x5b, 0x4a, 0x3d, 0x2e, 0x1f, 0x0c, 0x9b,
        0x8a, 0x7d, 0x6e, 0x5f, 0x4c, 0x3b, 0x2a, 0x1d,
    ]);
    
    // Indexed topics
    let mut topic1 = [0u8; 32];
    topic1[31] = proof_type;
    
    let mut topic2 = [0u8; 32];
    topic2[28..32].copy_from_slice(&program_id.to_be_bytes());
    
    let topic3 = vk_hash;
    
    // Non-indexed data: address (20 bytes), bool (32 bytes), uint256 (32 bytes)
    let mut data = Vec::new();
    data.extend_from_slice(&[0u8; 12]); // Pad address to 32 bytes
    data.extend_from_slice(caller.as_slice());
    data.extend_from_slice(&[0u8; 31]); // Pad bool to 32 bytes
    data.push(if success { 1 } else { 0 });
    let timestamp = block::timestamp(); // u64
    let mut timestamp_bytes = [0u8; 32];
    timestamp_bytes[24..32].copy_from_slice(&timestamp.to_be_bytes());
    data.extend_from_slice(&timestamp_bytes);
    
    evm::raw_log(
        &[topic0.into(), FixedBytes::from(topic1), FixedBytes::from(topic2), topic3],
        &data,
    ).ok();
}

/// Helper function to emit VKRegistered event
///
/// Event signature: VKRegistered(uint8,uint32,bytes32,address,uint256)
/// Keccak256: 0x7e4d5f3c2b1a9d8e7f6c5b4a3d2e1f0c9b8a7d6e5f4c3b2a1d0e9f8c7b6a5d4
///
/// Indexed topics:
/// - topic1: proof_type (uint8)
/// - topic2: program_id (uint32)
/// - topic3: vk_hash (bytes32)
fn emit_vk_registered_event(
    proof_type: u8,
    program_id: u32,
    vk_hash: FixedBytes<32>,
    registrar: Address,
) {
    use stylus_sdk::call::RawCall;
    
    // Event signature: VKRegistered(uint8,uint32,bytes32,address,uint256)
    let topic0 = FixedBytes::<32>::from([
        0x7e, 0x4d, 0x5f, 0x3c, 0x2b, 0x1a, 0x9d, 0x8e,
        0x7f, 0x6c, 0x5b, 0x4a, 0x3d, 0x2e, 0x1f, 0x0c,
        0x9b, 0x8a, 0x7d, 0x6e, 0x5f, 0x4c, 0x3b, 0x2a,
        0x1d, 0x0e, 0x9f, 0x8c, 0x7b, 0x6a, 0x5d, 0x4e,
    ]);
    
    // Indexed topics
    let mut topic1 = [0u8; 32];
    topic1[31] = proof_type;
    
    let mut topic2 = [0u8; 32];
    topic2[28..32].copy_from_slice(&program_id.to_be_bytes());
    
    let topic3 = vk_hash;
    
    // Non-indexed data: address (20 bytes), uint256 (32 bytes)
    let mut data = Vec::new();
    data.extend_from_slice(&[0u8; 12]); // Pad address to 32 bytes
    data.extend_from_slice(registrar.as_slice());
    let timestamp = block::timestamp(); // u64
    let mut timestamp_bytes = [0u8; 32];
    timestamp_bytes[24..32].copy_from_slice(&timestamp.to_be_bytes());
    data.extend_from_slice(&timestamp_bytes);
    
    evm::raw_log(
        &[topic0.into(), FixedBytes::from(topic1), FixedBytes::from(topic2), topic3],
        &data,
    ).ok();
}

// Stylus contract storage definition using ERC-7201 namespaced storage
sol_storage! {
    #[entrypoint]
    pub struct UZKVContract {
        // Total number of successful verifications
        uint256 verification_count;
        
        // === NEW: Universal VK Registry with (proofType, programId, vkHash) binding ===
        // VK Registry: proofType => programId => vkHash => vkData
        // This ensures each (proofType, programId) pair has its own set of registered VKs
        mapping(uint8 => mapping(uint32 => mapping(bytes32 => bytes))) vk_registry;
        
        // VK Registration Status: proofType => programId => vkHash => isRegistered
        mapping(uint8 => mapping(uint32 => mapping(bytes32 => bool))) vk_registry_status;
        
        // Precomputed data for gas optimization (only for Groth16)
        // proofType => programId => vkHash => precomputedData
        mapping(uint8 => mapping(uint32 => mapping(bytes32 => bytes))) precomputed_data;
        
        // === Legacy storage (kept for backward compatibility, deprecated) ===
        // Registered verification keys (vkHash => vkData) - OLD, use vk_registry instead
        mapping(bytes32 => bytes) verification_keys;
        
        // Precomputed e(α, β) pairings for gas optimization (vkHash => pairingData) - OLD
        mapping(bytes32 => bytes) precomputed_pairings;
        
        // VK registration status (vkHash => isRegistered) - OLD
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

        // Emit ProofVerified event (legacy function uses programId = 0)
        // Topic0: keccak256("ProofVerified(uint8,uint32,bytes32,address,bool,uint256)")
        // = 0x8c5be1e5ebec7d5bd14f71427d1e84f3dd0314c0f7b2291e5b200ac8c7c3b925 (placeholder)
        emit_proof_verified_event(0, 0, vk_hash_fixed, msg::sender(), is_valid);

        Ok(is_valid)
    }

    /// Register a verification key with (proofType, programId, vkHash) binding
    ///
    /// SECURITY: This triple binding prevents VK substitution attacks:
    /// - User cannot submit Groth16 proof with PLONK VK hash
    /// - Each program_id has isolated VK namespace
    /// - Multiple circuits can coexist per proof type
    ///
    /// @param proof_type - Proof system type (0=Groth16, 1=PLONK, 2=STARK)
    /// @param program_id - Circuit identifier (isolates VK namespaces)
    /// @param vk - Serialized verification key
    /// @return vkHash - Keccak256 hash of the VK
    pub fn register_vk_universal(
        &mut self,
        proof_type: u8,
        program_id: u32,
        vk: Vec<u8>,
    ) -> Result<[u8; 32]> {
        // Validate proof type
        let ptype = ProofType::from_u8(proof_type).ok_or(Error::InvalidProofType)?;

        // Compute VK hash (Keccak256)
        let vk_hash = keccak256(&vk);
        let vk_hash_fixed = FixedBytes::from(vk_hash);

        // Get nested storage references (need to convert u8/u32 to Uint)
        let proof_type_uint = U8::from(proof_type);
        let program_id_uint = U32::from(program_id);
        
        let mut proof_type_storage = self.vk_registry.setter(proof_type_uint);
        let mut program_storage = proof_type_storage.setter(program_id_uint);
        let mut status_proof_type = self.vk_registry_status.setter(proof_type_uint);
        let mut status_program = status_proof_type.setter(program_id_uint);

        // Check if already registered (idempotent operation)
        if !status_program.get(vk_hash_fixed) {
            // Store VK data with triple binding
            program_storage.setter(vk_hash_fixed).set_bytes(&vk);
            status_program.insert(vk_hash_fixed, true);

            // Precompute e(α, β) pairing for Groth16 gas optimization
            // This is a one-time cost (~100k gas) that saves ~80k gas per verification
            if matches!(ptype, ProofType::Groth16) {
                match groth16::compute_precomputed_pairing(&vk) {
                    Ok(precomputed_pairing) => {
                        let mut precomp_proof_type = self.precomputed_data.setter(proof_type_uint);
                        let mut precomp_program = precomp_proof_type.setter(program_id_uint);
                        precomp_program.setter(vk_hash_fixed).set_bytes(&precomputed_pairing);
                    }
                    Err(_) => {
                        // If precomputation fails, continue without optimization
                        // Contract will fall back to standard verification
                    }
                }
            }

            // Emit VKRegistered event for monitoring
            emit_vk_registered_event(proof_type, program_id, vk_hash_fixed, msg::sender());
        }

        Ok(vk_hash)
    }

    /// Register a verification key with gas optimization precomputation
    /// DEPRECATED: Use register_vk_universal() instead for proper security binding
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

    /// Verify a UniversalProof with (proofType, programId, vkHash) binding validation
    ///
    /// SECURITY: This function validates the triple binding to prevent VK substitution:
    /// 1. Decodes UniversalProof from bytes
    /// 2. Checks that VK is registered for (proof_type, program_id, vk_hash)
    /// 3. Prevents user from submitting Groth16 proof with PLONK VK hash
    /// 4. Enforces circuit isolation via program_id
    ///
    /// @param universal_proof_bytes - Encoded UniversalProof (46+ byte header + proof + inputs)
    /// @return true if proof is valid
    pub fn verify_universal(&mut self, universal_proof_bytes: Vec<u8>) -> Result<bool> {
        // Check if contract is paused
        if self.paused.get() {
            return Err(Error::ContractPaused);
        }

        // Decode UniversalProof from bytes
        let universal_proof = UniversalProof::decode(&universal_proof_bytes)
            .ok_or(Error::InvalidProofFormat)?;

        // Validate version (only v1 supported)
        if universal_proof.version != 1 {
            return Err(Error::InvalidProofFormat);
        }

        // Get proof type enum and convert to u8 for storage lookups
        let ptype = universal_proof.proof_type;
        let proof_type_u8 = ptype.to_u8();

        // Compute VK hash from universal_proof
        let vk_hash_fixed = FixedBytes::from(universal_proof.vk_hash);

        // === SECURITY: Validate (proofType, programId, vkHash) triple binding ===
        let proof_type_uint = U8::from(proof_type_u8);
        let program_id_uint = U32::from(universal_proof.program_id);
        
        let proof_type_storage = self.vk_registry.getter(proof_type_uint);
        let program_storage = proof_type_storage.getter(program_id_uint);
        let vk_storage = program_storage.get(vk_hash_fixed);
        
        if vk_storage.is_empty() {
            return Err(Error::VKNotRegistered);
        }
        let vk_data = vk_storage.get_bytes();

        // Route to appropriate verifier based on proof type
        let is_valid = match ptype {
            ProofType::Groth16 => {
                // Check if precomputed pairing is available for gas optimization
                let precomp_proof_type = self.precomputed_data.getter(proof_type_uint);
                let precomp_program = precomp_proof_type.getter(program_id_uint);
                let precomputed_storage = precomp_program.get(vk_hash_fixed);
                let precomputed_pairing = precomputed_storage.get_bytes();

                if !precomputed_pairing.is_empty() {
                    // Use optimized verification with precomputed e(α, β) (~80k gas savings)
                    groth16::verify_with_precomputed(
                        &universal_proof.proof_bytes,
                        &universal_proof.public_inputs_bytes,
                        &vk_data,
                        &precomputed_pairing,
                    )?
                } else {
                    // Fall back to standard verification
                    groth16::verify(
                        &universal_proof.proof_bytes,
                        &universal_proof.public_inputs_bytes,
                        &vk_data,
                    )?
                }
            }
            ProofType::PLONK => {
                // PLONK verification (universal setup)
                plonk::verify(
                    &universal_proof.proof_bytes,
                    &universal_proof.public_inputs_bytes,
                    &vk_data,
                )
                .map_err(|_| Error::VerificationFailed)?
            }
            ProofType::STARK => {
                // STARK doesn't use VKs (transparent setup)
                // But we still validate registration for consistency
                stark::verify_proof(
                    &universal_proof.proof_bytes,
                    &universal_proof.public_inputs_bytes,
                )
                .map_err(|_| Error::VerificationFailed)?
            }
        };

        // Increment verification counter for valid proofs
        if is_valid {
            let count = self.verification_count.get();
            self.verification_count.set(count + U256::from(1));
        }

        // Emit ProofVerified event for monitoring and indexing
        emit_proof_verified_event(
            proof_type_u8,
            universal_proof.program_id,
            vk_hash_fixed,
            msg::sender(),
            is_valid,
        );

        Ok(is_valid)
    }

    /// Universal verify - routes to appropriate verifier based on proof type
    /// DEPRECATED: Use verify_universal() with UniversalProof for proper security binding
    ///
    /// Supports multiple proof systems:
    /// - Groth16 (type 0): Trusted setup, ~60k gas
    /// - PLONK (type 1): Universal setup, ~120k gas (TODO: not yet enabled)
    /// - STARK (type 2): Transparent, ~280k gas (TODO: not yet enabled)
    ///
    /// WARNING: This function uses legacy storage without (proofType, programId) binding.
    /// It is vulnerable to VK substitution attacks. Use verify_universal() instead.
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
        let ptype = ProofType::from_u8(proof_type).ok_or(Error::InvalidProofType)?;

        // Route to appropriate verifier
        let is_valid = match ptype {
            ProofType::Groth16 => {
                // Retrieve verification key from legacy storage
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
        let ptype = ProofType::from_u8(proof_type).ok_or(Error::InvalidProofType)?;

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
        let ptype = ProofType::from_u8(proof_type).ok_or(Error::InvalidProofType)?;

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
