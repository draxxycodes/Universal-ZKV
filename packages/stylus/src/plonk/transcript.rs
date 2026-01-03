//! Fiat-Shamir Transcript
//!
//! Implements cryptographic transcript for non-interactive challenge generation
//! in PLONK protocol. Uses Keccak256 (SHA-3) for hashing.
//!
//! # Protocol
//! 1. Prover commits to witness polynomials → Transcript absorbs commitments
//! 2. Transcript squeezes challenge → Prover uses challenge to build next round
//! 3. Repeat for all PLONK rounds (wire commitments, permutation, opening points)
//!
//! # Changes (Precompile Refactor)
//! - Removed `arkworks` dependencies.
//! - Uses `alloy_primitives::U256` (Fr) and `keccak256`.
//! - Manual serialization for points (BigEndian).

use alloc::vec::Vec;
use stylus_sdk::alloy_primitives::U256;
use sha3::{Digest, Keccak256};
use crate::utils::{fr_from_be_bytes_mod};

/// Fiat-Shamir transcript for PLONK protocol
pub struct Transcript {
    /// Internal Keccak256 hasher state
    hasher: Keccak256,
    /// Domain separation label
    domain_label: Vec<u8>,
}

impl Transcript {
    /// Create a new transcript with domain separation label
    pub fn new(label: &[u8]) -> Self {
        let mut hasher = Keccak256::new();
        hasher.update(label);
        
        Self {
            hasher,
            domain_label: label.to_vec(),
        }
    }

    /// Absorb a field element (U256) into the transcript
    pub fn absorb_field(&mut self, label: &[u8], element: &U256) {
        self.hasher.update(label);
        // Serialize U256 as 32 bytes BigEndian
        let bytes = element.to_be_bytes::<32>();
        self.hasher.update(&bytes);
    }

    /// Absorb a G1 point (serialized 64 bytes: X, Y) into the transcript
    /// Note: Expects raw 64-byte uncompressed point (X, Y) or 32-byte compressed?
    /// Standard PLONK usually uses compressed.
    /// Implementation Plan specifies 64 bytes (uncompressed) for logic simplicity in Precompiles (which take uncompressed typically).
    /// But transcript usually wants compressed. 
    /// Let's support absorbing raw bytes provided by the caller.
    pub fn absorb_point_bytes(&mut self, label: &[u8], point_bytes: &[u8]) {
        self.hasher.update(label);
        self.hasher.update(point_bytes);
    }

    /// Absorb raw bytes
    pub fn absorb_bytes(&mut self, label: &[u8], data: &[u8]) {
        self.hasher.update(label);
        let len = data.len() as u64;
        self.hasher.update(&len.to_le_bytes()); // Length prefix
        self.hasher.update(data);
    }

    /// Squeeze a challenge field element from the transcript
    /// Returns U256 (Fr element < r)
    pub fn squeeze_challenge(&mut self, label: &[u8]) -> U256 {
        let mut challenge_hasher = self.hasher.clone();
        challenge_hasher.update(label);
        let hash_output = challenge_hasher.finalize();
        
        // Convert hash to field element (mod r)
        let challenge = fr_from_be_bytes_mod(&hash_output);
        
        // Update state
        self.hasher.update(&hash_output);
        
        challenge
    }

    pub fn reset(&mut self) {
        self.hasher = Keccak256::new();
        self.hasher.update(&self.domain_label);
    }
}

/// PLONK protocol transcript labels
pub mod labels {
    pub const PLONK_PROTOCOL: &[u8] = b"plonk_bn254_v1";
    pub const VK_DOMAIN: &[u8] = b"plonk_vk";
    pub const WIRE_COMMITMENT: &[u8] = b"plonk_wire_comm";
    pub const PERMUTATION_COMMITMENT: &[u8] = b"plonk_perm_comm";
    pub const QUOTIENT_COMMITMENT: &[u8] = b"plonk_quotient_comm";
    pub const BETA_CHALLENGE: &[u8] = b"plonk_beta";
    pub const GAMMA_CHALLENGE: &[u8] = b"plonk_gamma";
    pub const ALPHA_CHALLENGE: &[u8] = b"plonk_alpha";
    pub const ZETA_CHALLENGE: &[u8] = b"plonk_zeta";
    pub const V_CHALLENGE: &[u8] = b"plonk_v";
    pub const U_CHALLENGE: &[u8] = b"plonk_u";
    pub const WIRE_EVAL: &[u8] = b"plonk_wire_eval";
    pub const PERMUTATION_EVAL: &[u8] = b"plonk_perm_eval";
    pub const SELECTOR_EVAL: &[u8] = b"plonk_selector_eval";
    pub const OPENING_PROOF: &[u8] = b"plonk_opening_proof";
    pub const PUBLIC_INPUT: &[u8] = b"plonk_public_input";
}
