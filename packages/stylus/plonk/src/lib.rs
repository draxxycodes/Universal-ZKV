//! UZKV PLONK Verifier
//!
//! Production-grade PLONK zkSNARK verification using BN254 curve and KZG commitments.
//! Supports universal trusted setup (Powers of Tau ceremony).
//!
//! # Architecture
//! - KZG polynomial commitments with pairing-based opening proofs
//! - Fiat-Shamir transcript for non-interactive challenge generation
//! - PLONK gate constraints (addition, multiplication, custom gates)
//! - SRS (Structured Reference String) management
//!
//! # Security
//! - All curve points validated before use
//! - Pairing equation verification for KZG openings
//! - Transcript domain separation to prevent replay attacks
//! - Panic-free implementation for WASM safety

#![cfg_attr(not(feature = "std"), no_std)]
#![cfg_attr(not(test), no_main)]

extern crate alloc;

use alloc::vec::Vec;
use stylus_sdk::prelude::*;
use wee_alloc::WeeAlloc;

// Custom allocator for WASM environment
#[global_allocator]
static ALLOC: WeeAlloc = WeeAlloc::INIT;

pub mod kzg;
pub mod transcript;
pub mod plonk;
pub mod srs;

// Re-export main verification function
pub use plonk::verify_plonk_proof;
pub use kzg::verify_kzg_opening;

/// Error types for PLONK operations
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
    /// KZG opening proof verification failed
    KZGVerificationFailed,
    /// SRS (Structured Reference String) invalid or missing
    InvalidSRS,
    /// Transcript error (challenge generation failed)
    TranscriptError,
    /// Polynomial evaluation mismatch
    EvaluationMismatch,
    /// Invalid proof format or structure
    InvalidProof,
    /// Invalid G1 point (not on curve or not in subgroup)
    InvalidG1Point,
    /// Invalid G2 point (not on curve or not in subgroup)
    InvalidG2Point,
    /// Invalid public input
    InvalidPublicInput,
    /// Pairing check failed
    PairingCheckFailed,
    /// Invalid SRS size
    InvalidSrsSize,
    /// Invalid circuit domain
    InvalidDomain,
    /// Multi-scalar multiplication error
    MsmError,
    /// Invalid circuit size
    InvalidCircuitSize,
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
            Error::KZGVerificationFailed => write!(f, "KZG opening proof verification failed"),
            Error::InvalidSRS => write!(f, "Invalid or missing SRS"),
            Error::TranscriptError => write!(f, "Transcript error"),
            Error::EvaluationMismatch => write!(f, "Polynomial evaluation mismatch"),
        }
    }
}

/// Result type for PLONK operations
pub type Result<T> = core::result::Result<T, Error>;

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
            Error::KZGVerificationFailed.to_string(),
            "KZG opening proof verification failed"
        );
    }
}
