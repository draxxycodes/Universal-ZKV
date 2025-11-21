//! Simplified STARK verifier - Core implementation
//!
//! This is a simplified but functional STARK verifier demonstrating:
//! - Transparent setup (no trusted ceremony)
//! - Post-quantum security (hash-based)
//! - Gas-efficient verification
//!
//! For production use, integrate with full Winterfell prover.

use alloc::vec::Vec;

// Module declarations
pub mod types;
pub mod fibonacci;
pub mod verifier;

// Re-exports
pub use types::{Error, Result, SecurityLevel, GasEstimate};
pub use fibonacci::{FibonacciTrace, FibonacciProof};
pub use verifier::{StarkVerifier, estimate_gas_cost};
