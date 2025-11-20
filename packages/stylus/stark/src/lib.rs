//! STARK (Scalable Transparent ARgument of Knowledge) Verifier
//!
//! Production-grade STARK proof verification for Arbitrum Stylus using Winterfell.
//!
//! # What is STARK?
//! STARK is a zero-knowledge proof system with:
//! - **Transparent setup**: No trusted setup ceremony required
//! - **Post-quantum security**: Resistant to quantum attacks (relies on hash functions)
//! - **Scalability**: Prover time O(n log n), verifier time O(log² n)
//! - **Plausibly post-quantum**: Based on collision-resistant hashing
//!
//! # Architecture
//! ```text
//! Prover                           Verifier (This Implementation)
//! ------                           --------
//! AIR Constraints                  1. Verify AIR constraints at OOD points
//!   ↓                                 ↓
//! Trace Polynomials                2. Check boundary constraints
//!   ↓                                 ↓
//! FRI Commitment                   3. Verify FRI proof (low-degree test)
//!   ↓                                 ↓
//! STARK Proof  ----------------→   4. Accept/Reject
//! ```
//!
//! # Components
//! - `air`: Algebraic Intermediate Representation (constraint system)
//! - `fri`: Fast Reed-Solomon IOP (polynomial commitment)
//! - `stark`: Main verification logic
//!
//! # Security
//! - Soundness: 2^(-100) error probability (configurable)
//! - Transparency: No secret randomness in setup
//! - Post-quantum: Relies only on collision-resistant hashing (Blake3)

#![cfg_attr(not(feature = "std"), no_std)]
#![cfg_attr(all(not(test), not(feature = "std")), no_main)]

extern crate alloc;

// WASM allocator (only when building for Stylus)
#[cfg(feature = "stylus")]
use wee_alloc::WeeAlloc;

#[cfg(feature = "stylus")]
#[global_allocator]
static ALLOC: WeeAlloc = WeeAlloc::INIT;

// Module declarations
pub mod air;
pub mod fri;
pub mod stark;

// Re-exports
pub use air::{FibonacciAir, AirContext, FibonacciTraceGenerator};
pub use fri::{FriVerifier, FriProof, FriOptions};
pub use stark::{StarkVerifier, StarkProof, StarkVerificationKey, QueryProof, OodFrame, estimate_gas_cost, GasEstimate};

/// Error types for STARK operations
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum Error {
    /// Proof deserialization failed
    DeserializationError,
    
    /// Proof structure is malformed
    MalformedProof,
    
    /// Invalid proof structure
    InvalidProofStructure,
    
    /// Verification key is invalid
    InvalidVerificationKey,
    
    /// Public inputs are invalid
    InvalidPublicInputs,
    
    /// Proof verification failed (mathematically invalid)
    VerificationFailed,
    
    /// Input size exceeds limits
    InvalidInputSize,
    
    /// FRI proof verification failed
    FriVerificationFailed,
    
    /// AIR constraint check failed
    AirConstraintFailed,
    
    /// Boundary constraint check failed
    BoundaryConstraintFailed,
    
    /// OOD (Out-of-Domain) frame verification failed
    OodFrameVerificationFailed,
    
    /// Merkle proof verification failed
    MerkleProofFailed,
    
    /// Invalid field element (not in valid range)
    InvalidFieldElement,
    
    /// Invalid proof options (security level too low, etc.)
    InvalidProofOptions,
    
    /// Polynomial evaluation mismatch
    EvaluationMismatch,
    
    /// Degree bound violation
    DegreeBoundViolation,
    
    /// Invalid query position
    InvalidQueryPosition,
}

impl core::fmt::Display for Error {
    fn fmt(&self, f: &mut core::fmt::Formatter<'_>) -> core::fmt::Result {
        match self {
            Error::DeserializationError => write!(f, "Failed to deserialize proof"),
            Error::MalformedProof => write!(f, "Proof structure is malformed"),
            Error::InvalidProofStructure => write!(f, "Invalid proof structure"),
            Error::InvalidVerificationKey => write!(f, "Invalid verification key"),
            Error::InvalidPublicInputs => write!(f, "Invalid public inputs"),
            Error::VerificationFailed => write!(f, "Proof verification failed"),
            Error::InvalidInputSize => write!(f, "Input size exceeds limits"),
            Error::FriVerificationFailed => write!(f, "FRI proof verification failed"),
            Error::AirConstraintFailed => write!(f, "AIR constraint check failed"),
            Error::BoundaryConstraintFailed => write!(f, "Boundary constraint check failed"),
            Error::OodFrameVerificationFailed => write!(f, "OOD frame verification failed"),
            Error::MerkleProofFailed => write!(f, "Merkle proof verification failed"),
            Error::InvalidFieldElement => write!(f, "Invalid field element"),
            Error::InvalidProofOptions => write!(f, "Invalid proof options"),
            Error::EvaluationMismatch => write!(f, "Polynomial evaluation mismatch"),
            Error::DegreeBoundViolation => write!(f, "Degree bound violation"),
            Error::InvalidQueryPosition => write!(f, "Invalid query position"),
        }
    }
}

/// Result type for STARK operations
pub type Result<T> = core::result::Result<T, Error>;

/// Security level for STARK proofs
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum SecurityLevel {
    /// 96-bit security (fast, suitable for testing)
    Test96 = 96,
    
    /// 100-bit security (recommended minimum for production)
    Proven100 = 100,
    
    /// 128-bit security (high security, slower verification)
    High128 = 128,
}

impl SecurityLevel {
    /// Get the number of FRI queries needed for this security level
    pub fn num_queries(&self) -> usize {
        match self {
            SecurityLevel::Test96 => 27,    // log2(1/2^-96) ≈ 27 queries
            SecurityLevel::Proven100 => 28, // log2(1/2^-100) ≈ 28 queries
            SecurityLevel::High128 => 36,   // log2(1/2^-128) ≈ 36 queries
        }
    }
    
    /// Get the blowup factor (trace_length * blowup = evaluation_domain_size)
    pub fn blowup_factor(&self) -> usize {
        match self {
            SecurityLevel::Test96 => 8,
            SecurityLevel::Proven100 => 8,
            SecurityLevel::High128 => 16,
        }
    }
    
    /// Get the grinding factor (proof-of-work difficulty)
    pub fn grinding_factor(&self) -> u32 {
        match self {
            SecurityLevel::Test96 => 16,
            SecurityLevel::Proven100 => 20,
            SecurityLevel::High128 => 28,
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_error_display() {
        assert_eq!(
            Error::DeserializationError.to_string(),
            "Failed to deserialize proof"
        );
        assert_eq!(
            Error::FriVerificationFailed.to_string(),
            "FRI proof verification failed"
        );
    }

    #[test]
    fn test_security_levels() {
        assert_eq!(SecurityLevel::Test96.num_queries(), 27);
        assert_eq!(SecurityLevel::Proven100.num_queries(), 28);
        assert_eq!(SecurityLevel::High128.num_queries(), 36);
        
        assert_eq!(SecurityLevel::Test96.blowup_factor(), 8);
        assert_eq!(SecurityLevel::Proven100.blowup_factor(), 8);
        assert_eq!(SecurityLevel::High128.blowup_factor(), 16);
        
        assert_eq!(SecurityLevel::Test96.grinding_factor(), 16);
        assert_eq!(SecurityLevel::Proven100.grinding_factor(), 20);
        assert_eq!(SecurityLevel::High128.grinding_factor(), 28);
    }
}
