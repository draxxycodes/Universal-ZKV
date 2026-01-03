//! PLONK Verifier Module
//! Refactored to use EVM precompiles and remove Arkworks.

pub mod kzg;
pub mod transcript;
pub mod plonk;
// pub mod srs; // Removed

// Re-export main verification function to match uzkv.rs expectation
pub use plonk::verify;

#[cfg(feature = "std")]
pub mod host;

#[cfg(feature = "std")]
pub use host::verify_host;
