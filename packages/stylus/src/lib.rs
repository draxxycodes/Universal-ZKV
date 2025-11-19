//! UZKV Stylus - Universal ZK-Proof Verifier
//!
//! This library provides zero-knowledge proof verification on Arbitrum Stylus.

#![cfg_attr(not(feature = "std"), no_std)]

extern crate alloc;

pub mod storage;

// Re-export storage types
pub use storage::{UZKVStorage, STORAGE_SLOT};
