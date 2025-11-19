//! UZKV Stylus - Universal ZK-Proof Verifier
//!
//! Production-grade zero-knowledge proof verification on Arbitrum Stylus.
//! Supports Groth16 zkSNARK verification with BN254 curve.
//!
//! # Architecture
//! - no_std compatible for WASM compilation
//! - Custom wee_alloc allocator for deterministic memory usage
//! - Vendored arkworks dependencies for supply chain security
//! - ERC-7201 namespaced storage for proxy safety

#![cfg_attr(not(feature = "std"), no_std)]
#![cfg_attr(not(test), no_main)]

extern crate alloc;

use wee_alloc::WeeAlloc;

// Custom allocator for WASM environment
// WeeAlloc provides small code size and predictable memory usage
#[global_allocator]
static ALLOC: WeeAlloc = WeeAlloc::INIT;

pub mod storage;
pub mod groth16;

// Re-export storage types
pub use storage::{UZKVStorage, STORAGE_SLOT};

// Re-export verification functions
pub use groth16::verify;

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
        }
    }
}

/// Result type for UZKV operations
pub type Result<T> = core::result::Result<T, Error>;
