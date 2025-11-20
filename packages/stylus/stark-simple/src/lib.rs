//! Simplified STARK verifier - Core implementation
//!
//! This is a simplified but functional STARK verifier demonstrating:
//! - Transparent setup (no trusted ceremony)
//! - Post-quantum security (hash-based)
//! - Gas-efficient verification
//!
//! For production use, integrate with full Winterfell prover.

#![cfg_attr(not(feature = "std"), no_std)]
#![cfg_attr(all(not(test), not(feature = "std")), no_main)]

extern crate alloc;

use alloc::vec::Vec;

// WASM allocator (only when building for Stylus)
#[cfg(feature = "stylus")]
use wee_alloc::WeeAlloc;

#[cfg(feature = "stylus")]
#[global_allocator]
static ALLOC: WeeAlloc = WeeAlloc::INIT;

// Module declarations
pub mod types;
pub mod fibonacci;
pub mod verifier;

// Re-exports
pub use types::{Error, Result, SecurityLevel, GasEstimate};
pub use fibonacci::{FibonacciTrace, FibonacciProof};
pub use verifier::{StarkVerifier, estimate_gas_cost};
