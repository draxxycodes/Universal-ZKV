//! Verifier Algebra - Formal interface for heterogeneous ZK verification
//!
//! This module defines the abstract interface that ALL proof systems must implement
//! to participate in the Universal ZK Verifier ecosystem.
//!
//! # Design Philosophy
//! Most ZK systems hardcode verification logic. This module standardizes verifier
//! SEMANTICS, not implementations, enabling:
//! - Machine-checkable security properties
//! - Cost-aware verification routing
//! - Recursion compatibility declarations
//! - Future-proof extensibility
//!
//! # Novelty Statement (Patent-Relevant)
//! This is a **novel systems-level abstraction** that formalizes verifier metadata.
//! Unlike existing systems that expose only `verify()`, this requires verifiers to:
//! - Declare security model (setup type, crypto assumptions, formal verification status)
//! - Declare cost model (base, per-input, per-byte gas costs)
//! - Declare recursion support (which proof systems can be verified recursively)
//!
//! This enables **machine-readable security analysis** and **cost-aware routing**.
//!
//! # References
//! - "On the Size of Pairing-Based Non-Interactive Arguments" (Groth, 2016) - Groth16
//! - "PLONK: Permutations over Lagrange-bases" (Gabizon et al., 2019) - PLONK
//! - "Scalable, transparent, and post-quantum secure computational integrity"
//!   (Ben-Sasson et al., 2018) - STARK foundations
//! - "Fast Reed-Solomon Interactive Oracle Proofs of Proximity"
//!   (Ben-Sasson et al., 2018) - FRI protocol

extern crate alloc;

use alloc::vec::Vec;

/// Setup type classification for proof systems
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
#[repr(u8)]
pub enum SetupType {
    /// Circuit-specific trusted setup (e.g., Groth16)
    /// Requires new ceremony for each circuit change
    Trusted = 0,
    
    /// Universal trusted setup (e.g., PLONK with Powers of Tau)
    /// One ceremony supports all circuits up to a size limit
    Universal = 1,
    
    /// Transparent setup (e.g., STARK)
    /// No trusted ceremony required - uses public randomness
    Transparent = 2,
}

impl SetupType {
    pub fn from_u8(value: u8) -> Option<Self> {
        match value {
            0 => Some(SetupType::Trusted),
            1 => Some(SetupType::Universal),
            2 => Some(SetupType::Transparent),
            _ => None,
        }
    }
    
    pub fn to_u8(self) -> u8 {
        self as u8
    }
}

/// Cryptographic assumption classification
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
#[repr(u8)]
pub enum CryptoAssumption {
    /// Discrete Logarithm Problem (e.g., Schnorr, ECDSA)
    DiscreteLog = 0,
    
    /// Bilinear Pairing assumptions (e.g., Groth16, PLONK with KZG)
    Pairing = 1,
    
    /// Collision-resistant hashing (e.g., STARK, FRI)
    HashBased = 2,
    
    /// Lattice-based (future: zkSTARK with lattice commitments)
    Lattice = 3,
}

impl CryptoAssumption {
    pub fn from_u8(value: u8) -> Option<Self> {
        match value {
            0 => Some(CryptoAssumption::DiscreteLog),
            1 => Some(CryptoAssumption::Pairing),
            2 => Some(CryptoAssumption::HashBased),
            3 => Some(CryptoAssumption::Lattice),
            _ => None,
        }
    }
    
    pub fn to_u8(self) -> u8 {
        self as u8
    }
    
    /// Whether this assumption is post-quantum secure
    pub fn is_post_quantum_secure(self) -> bool {
        matches!(self, CryptoAssumption::HashBased | CryptoAssumption::Lattice)
    }
}

/// Security model declaration for a proof system
///
/// This struct formally declares the security properties of a verifier,
/// enabling machine-readable security analysis.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct SecurityModel {
    /// Type of setup ceremony required
    pub setup_type: SetupType,
    
    /// Underlying cryptographic assumption
    pub crypto_assumption: CryptoAssumption,
    
    /// Whether proofs are post-quantum secure
    pub post_quantum_secure: bool,
    
    /// Security level in bits (e.g., 128, 256)
    pub security_bits: u8,
    
    /// Whether the system has been formally verified
    pub formally_verified: bool,
}

impl SecurityModel {
    /// Create a new SecurityModel
    pub const fn new(
        setup_type: SetupType,
        crypto_assumption: CryptoAssumption,
        security_bits: u8,
    ) -> Self {
        Self {
            setup_type,
            crypto_assumption,
            post_quantum_secure: matches!(
                crypto_assumption,
                CryptoAssumption::HashBased | CryptoAssumption::Lattice
            ),
            security_bits,
            formally_verified: false,
        }
    }
    
    /// Groth16 security model (BN254)
    pub const fn groth16_bn254() -> Self {
        Self {
            setup_type: SetupType::Trusted,
            crypto_assumption: CryptoAssumption::Pairing,
            post_quantum_secure: false,
            security_bits: 128,
            formally_verified: true, // arkworks implementation
        }
    }
    
    /// PLONK security model (KZG on BN254)
    pub const fn plonk_kzg_bn254() -> Self {
        Self {
            setup_type: SetupType::Universal,
            crypto_assumption: CryptoAssumption::Pairing,
            post_quantum_secure: false,
            security_bits: 128,
            formally_verified: false,
        }
    }
    
    /// STARK security model (FRI-based)
    pub const fn stark_fri() -> Self {
        Self {
            setup_type: SetupType::Transparent,
            crypto_assumption: CryptoAssumption::HashBased,
            post_quantum_secure: true,
            security_bits: 128,
            formally_verified: false,
        }
    }
    
    /// Encode to bytes for on-chain storage (5 bytes)
    pub fn encode(&self) -> [u8; 5] {
        [
            self.setup_type.to_u8(),
            self.crypto_assumption.to_u8(),
            if self.post_quantum_secure { 1 } else { 0 },
            self.security_bits,
            if self.formally_verified { 1 } else { 0 },
        ]
    }
    
    /// Decode from bytes
    pub fn decode(bytes: &[u8; 5]) -> Option<Self> {
        Some(Self {
            setup_type: SetupType::from_u8(bytes[0])?,
            crypto_assumption: CryptoAssumption::from_u8(bytes[1])?,
            post_quantum_secure: bytes[2] != 0,
            security_bits: bytes[3],
            formally_verified: bytes[4] != 0,
        })
    }
}

/// Recursion compatibility declaration
///
/// Declares which proof systems this verifier can verify recursively.
/// This is essential for proof aggregation and composition.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct RecursionSupport {
    /// Can verify Groth16 proofs inside this proof system
    pub can_verify_groth16: bool,
    
    /// Can verify PLONK proofs inside this proof system
    pub can_verify_plonk: bool,
    
    /// Can verify STARK proofs inside this proof system
    pub can_verify_stark: bool,
    
    /// Maximum recursion depth supported (0 = no recursion)
    pub max_depth: u8,
}

impl RecursionSupport {
    /// No recursion support
    pub const fn none() -> Self {
        Self {
            can_verify_groth16: false,
            can_verify_plonk: false,
            can_verify_stark: false,
            max_depth: 0,
        }
    }
    
    /// Full recursion support (theoretical - for future Nova/Supernova)
    pub const fn full(max_depth: u8) -> Self {
        Self {
            can_verify_groth16: true,
            can_verify_plonk: true,
            can_verify_stark: true,
            max_depth,
        }
    }
    
    /// SNARK-to-SNARK recursion only
    pub const fn snark_only(max_depth: u8) -> Self {
        Self {
            can_verify_groth16: true,
            can_verify_plonk: true,
            can_verify_stark: false,
            max_depth,
        }
    }
    
    /// Encode to bytes (4 bytes)
    pub fn encode(&self) -> [u8; 4] {
        [
            if self.can_verify_groth16 { 1 } else { 0 },
            if self.can_verify_plonk { 1 } else { 0 },
            if self.can_verify_stark { 1 } else { 0 },
            self.max_depth,
        ]
    }
}

/// Gas cost estimation for verification
///
/// Provides normalized cost estimation across different proof systems.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct GasCost {
    /// Base gas cost (constant overhead)
    pub base: u64,
    
    /// Per-public-input gas cost
    pub per_public_input: u64,
    
    /// Per-proof-byte gas cost (for variable-size proofs like STARK)
    pub per_proof_byte: u64,
}

impl GasCost {
    /// Estimate total gas for a specific proof
    pub fn estimate(&self, public_inputs: usize, proof_bytes: usize) -> u64 {
        self.base
            + (self.per_public_input * public_inputs as u64)
            + (self.per_proof_byte * proof_bytes as u64)
    }
    
    /// Groth16 gas cost model (BN254 on Stylus)
    /// - Base: ~250k gas (pairing operations)
    /// - Per input: ~40k gas (MSM)
    pub const fn groth16() -> Self {
        Self {
            base: 250_000,
            per_public_input: 40_000,
            per_proof_byte: 0, // Fixed-size proof
        }
    }
    
    /// PLONK gas cost model (KZG on BN254)
    /// - Base: ~350k gas (more pairing operations)
    /// - Per input: ~10k gas (lookup)
    pub const fn plonk() -> Self {
        Self {
            base: 350_000,
            per_public_input: 10_000,
            per_proof_byte: 0, // Fixed-size proof
        }
    }
    
    /// STARK gas cost model (FRI-based)
    /// - Base: ~200k gas (hash operations)
    /// - Per byte: ~10 gas (FRI layers)
    pub const fn stark() -> Self {
        Self {
            base: 200_000,
            per_public_input: 5_000,
            per_proof_byte: 10,
        }
    }
}

/// Verification result with metadata
#[derive(Debug, Clone)]
pub struct VerifyResult {
    /// Whether the proof is valid
    pub valid: bool,
    
    /// Actual gas consumed (if measurable)
    pub gas_used: Option<u64>,
    
    /// Optional error message for debugging
    pub error_message: Option<&'static str>,
}

impl VerifyResult {
    pub fn valid() -> Self {
        Self {
            valid: true,
            gas_used: None,
            error_message: None,
        }
    }
    
    pub fn invalid(reason: &'static str) -> Self {
        Self {
            valid: false,
            gas_used: None,
            error_message: Some(reason),
        }
    }
}

/// Core Verifier Algebra Trait
///
/// Every proof system in UZKV MUST implement this trait.
/// This is the foundational abstraction that makes "universal" meaningful.
///
/// # Implementors
/// - `Groth16Verifier` - packages/stylus/src/groth16.rs
/// - `PlonkVerifier` - packages/stylus/src/plonk/mod.rs
/// - `StarkVerifier` - packages/stylus/src/stark/mod.rs
pub trait ZkVerifier {
    /// Unique identifier for this proof system
    /// Must match the `ProofType` enum values
    const PROOF_SYSTEM_ID: u8;
    
    /// Human-readable name for the proof system
    const NAME: &'static str;
    
    /// Get the security model for this verifier
    fn security_model() -> SecurityModel;
    
    /// Get the gas cost model for this verifier
    fn gas_cost_model() -> GasCost;
    
    /// Get recursion compatibility declaration
    fn recursion_support() -> RecursionSupport;
    
    /// Core verification function
    ///
    /// # Arguments
    /// - `proof` - Serialized proof bytes (system-specific format)
    /// - `public_inputs` - Serialized public inputs
    /// - `vk` - Serialized verification key
    ///
    /// # Returns
    /// `VerifyResult` with validity and optional metadata
    fn verify(proof: &[u8], public_inputs: &[u8], vk: &[u8]) -> VerifyResult;
    
    /// Batch verification (optional optimization)
    ///
    /// Default implementation falls back to sequential verification.
    /// Implementors may override for batched pairing checks.
    fn batch_verify(
        proofs: &[Vec<u8>],
        public_inputs: &[Vec<u8>],
        vk: &[u8],
    ) -> Vec<VerifyResult> {
        proofs
            .iter()
            .zip(public_inputs.iter())
            .map(|(proof, inputs)| Self::verify(proof, inputs, vk))
            .collect()
    }
    
    /// Estimate gas for a specific proof (before verification)
    fn estimate_gas(proof_size: usize, public_input_count: usize) -> u64 {
        Self::gas_cost_model().estimate(public_input_count, proof_size)
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_security_model_encode_decode() {
        let model = SecurityModel::groth16_bn254();
        let encoded = model.encode();
        let decoded = SecurityModel::decode(&encoded).unwrap();
        assert_eq!(model, decoded);
    }

    #[test]
    fn test_gas_cost_estimation() {
        let groth16 = GasCost::groth16();
        // 2 public inputs, 256 byte proof
        let estimated = groth16.estimate(2, 256);
        assert_eq!(estimated, 250_000 + 2 * 40_000 + 0); // 330k gas
    }

    #[test]
    fn test_stark_gas_scales_with_proof_size() {
        let stark = GasCost::stark();
        let small_proof = stark.estimate(4, 10_000);
        let large_proof = stark.estimate(4, 100_000);
        
        // Larger proof should cost more
        assert!(large_proof > small_proof);
        // Difference should be ~900k gas (90k bytes * 10 gas/byte)
        assert_eq!(large_proof - small_proof, 900_000);
    }
    
    #[test]
    fn test_post_quantum_security() {
        let groth16 = SecurityModel::groth16_bn254();
        let stark = SecurityModel::stark_fri();
        
        assert!(!groth16.post_quantum_secure);
        assert!(stark.post_quantum_secure);
    }
}
