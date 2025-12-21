//! Fiat-Shamir Transcript
//!
//! Implements cryptographic transcript for non-interactive challenge generation
//! in PLONK protocol. Uses Keccak256 (SHA-3) for hashing to match Ethereum's
//! native hash function.
//!
//! # Protocol
//! 1. Prover commits to witness polynomials → Transcript absorbs commitments
//! 2. Transcript squeezes challenge → Prover uses challenge to build next round
//! 3. Repeat for all PLONK rounds (wire commitments, permutation, opening points)
//!
//! # Security
//! - Domain separation prevents cross-protocol attacks
//! - Absorb order is strictly defined to prevent malleability
//! - Challenge generation is deterministic (given same inputs)

use alloc::vec::Vec;
use ark_bn254::{Fr, G1Affine};
use ark_ff::PrimeField;
use ark_serialize::CanonicalSerialize;
use sha3::{Digest, Keccak256};


/// Fiat-Shamir transcript for PLONK protocol
///
/// Maintains state of all absorbed messages and generates verifier challenges.
/// Must be used identically by prover and verifier for proof to be valid.
pub struct Transcript {
    /// Internal Keccak256 hasher state
    hasher: Keccak256,
    /// Domain separation label
    domain_label: Vec<u8>,
}

impl Transcript {
    /// Create a new transcript with domain separation label
    ///
    /// # Arguments
    /// * `label` - Protocol identifier (e.g., "plonk_bn254_v1")
    ///
    /// # Domain Separation
    /// Different protocols must use different labels to prevent cross-protocol attacks.
    /// The label is absorbed first, establishing unique transcript state.
    pub fn new(label: &[u8]) -> Self {
        let mut hasher = Keccak256::new();
        
        // Absorb domain label first (for domain separation)
        hasher.update(label);
        
        Self {
            hasher,
            domain_label: label.to_vec(),
        }
    }

    /// Absorb a field element into the transcript
    ///
    /// # Arguments
    /// * `label` - Message label for domain separation
    /// * `element` - Field element to absorb
    ///
    /// # Format
    /// Serializes field element to 32 bytes (little-endian) before hashing.
    pub fn absorb_field(&mut self, label: &[u8], element: &Fr) {
        // Absorb label
        self.hasher.update(label);
        
        // Serialize field element (32 bytes)
        let mut bytes = Vec::new();
        element.serialize_compressed(&mut bytes).unwrap();
        
        // Absorb field element bytes
        self.hasher.update(&bytes);
    }

    /// Absorb a G1 point into the transcript
    ///
    /// # Arguments
    /// * `label` - Message label for domain separation
    /// * `point` - G1 affine point to absorb
    ///
    /// # Format
    /// Serializes G1 point in compressed format (32 bytes) before hashing.
    pub fn absorb_point(&mut self, label: &[u8], point: &G1Affine) {
        // Absorb label
        self.hasher.update(label);
        
        // Serialize G1 point (compressed)
        let mut bytes = Vec::new();
        point.serialize_compressed(&mut bytes).unwrap();
        
        // Absorb point bytes
        self.hasher.update(&bytes);
    }

    /// Absorb multiple G1 points (for commitments vector)
    ///
    /// # Arguments
    /// * `label` - Message label for domain separation
    /// * `points` - Vector of G1 points
    pub fn absorb_points(&mut self, label: &[u8], points: &[G1Affine]) {
        // Absorb label
        self.hasher.update(label);
        
        // Absorb count first (for length extension resistance)
        let count = points.len() as u64;
        self.hasher.update(&count.to_le_bytes());
        
        // Absorb each point
        for point in points {
            let mut bytes = Vec::new();
            point.serialize_compressed(&mut bytes).unwrap();
            self.hasher.update(&bytes);
        }
    }

    /// Absorb raw bytes into the transcript
    ///
    /// # Arguments
    /// * `label` - Message label for domain separation
    /// * `data` - Raw bytes to absorb
    pub fn absorb_bytes(&mut self, label: &[u8], data: &[u8]) {
        // Absorb label
        self.hasher.update(label);
        
        // Absorb length first (for length extension resistance)
        let len = data.len() as u64;
        self.hasher.update(&len.to_le_bytes());
        
        // Absorb data
        self.hasher.update(data);
    }

    /// Squeeze a challenge field element from the transcript
    ///
    /// # Arguments
    /// * `label` - Challenge label for domain separation
    ///
    /// # Returns
    /// * `Fr` - Challenge field element
    ///
    /// # Algorithm
    /// 1. Absorb challenge label
    /// 2. Finalize hash to get 32 bytes
    /// 3. Interpret bytes as field element (modulo reduction)
    /// 4. Reset hasher with hash output for next challenge
    ///
    /// # Security
    /// Each squeeze operation produces a new independent challenge.
    /// The transcript state is updated after each squeeze to prevent reuse.
    pub fn squeeze_challenge(&mut self, label: &[u8]) -> Fr {
        // Clone current hasher state
        let mut challenge_hasher = self.hasher.clone();
        
        // Absorb challenge label
        challenge_hasher.update(label);
        
        // Finalize to get hash output
        let hash_output = challenge_hasher.finalize();
        
        // Convert 32-byte hash to field element
        // This performs modulo reduction if needed
        let challenge = Fr::from_be_bytes_mod_order(&hash_output);
        
        // Update transcript state with hash output (for next challenge)
        self.hasher.update(&hash_output);
        
        challenge
    }

    /// Squeeze multiple challenge field elements
    ///
    /// # Arguments
    /// * `label` - Base challenge label
    /// * `count` - Number of challenges to generate
    ///
    /// # Returns
    /// * `Vec<Fr>` - Vector of challenge field elements
    ///
    /// # Implementation
    /// Generates independent challenges by appending counter to label.
    pub fn squeeze_challenges(&mut self, label: &[u8], count: usize) -> Vec<Fr> {
        let mut challenges = Vec::with_capacity(count);
        
        for i in 0..count {
            // Create unique label for each challenge
            let mut challenge_label = label.to_vec();
            challenge_label.extend_from_slice(&(i as u64).to_le_bytes());
            
            // Squeeze challenge
            let challenge = self.squeeze_challenge(&challenge_label);
            challenges.push(challenge);
        }
        
        challenges
    }

    /// Reset transcript to initial state (after domain label)
    ///
    /// Used when starting a new proof verification in the same session.
    pub fn reset(&mut self) {
        self.hasher = Keccak256::new();
        self.hasher.update(&self.domain_label);
    }
}

/// PLONK protocol transcript labels
///
/// Standardized labels for PLONK rounds to ensure compatibility.
pub mod labels {
    /// Protocol domain label
    pub const PLONK_PROTOCOL: &[u8] = b"plonk_bn254_v1";
    
    /// Verification key labels
    pub const VK_DOMAIN: &[u8] = b"plonk_vk";
    
    /// Wire commitment labels
    pub const WIRE_A: &[u8] = b"plonk_wire_a";
    pub const WIRE_B: &[u8] = b"plonk_wire_b";
    pub const WIRE_C: &[u8] = b"plonk_wire_c";
    pub const WIRE_COMMITMENT: &[u8] = b"plonk_wire_comm";
    
    /// Permutation commitment labels
    pub const PERM_Z: &[u8] = b"plonk_perm_z";
    pub const PERMUTATION_COMMITMENT: &[u8] = b"plonk_perm_comm";
    pub const PERMUTATION_EVAL: &[u8] = b"plonk_perm_eval";
    
    /// Quotient commitment labels
    pub const QUOTIENT_T: &[u8] = b"plonk_quotient_t";
    pub const QUOTIENT_COMMITMENT: &[u8] = b"plonk_quotient_comm";
    
    /// Challenge labels
    pub const CHALLENGE_BETA: &[u8] = b"plonk_challenge_beta";
    pub const CHALLENGE_GAMMA: &[u8] = b"plonk_challenge_gamma";
    pub const CHALLENGE_ALPHA: &[u8] = b"plonk_challenge_alpha";
    pub const CHALLENGE_ZETA: &[u8] = b"plonk_challenge_zeta";
    pub const CHALLENGE_V: &[u8] = b"plonk_challenge_v";
    pub const CHALLENGE_U: &[u8] = b"plonk_challenge_u";
    
    /// Shorter aliases for common use
    pub const BETA_CHALLENGE: &[u8] = b"plonk_beta";
    pub const GAMMA_CHALLENGE: &[u8] = b"plonk_gamma";
    pub const ALPHA_CHALLENGE: &[u8] = b"plonk_alpha";
    pub const ZETA_CHALLENGE: &[u8] = b"plonk_zeta";
    pub const V_CHALLENGE: &[u8] = b"plonk_v";
    pub const U_CHALLENGE: &[u8] = b"plonk_u";
    
    /// Evaluation labels
    pub const WIRE_EVAL: &[u8] = b"plonk_wire_eval";
    pub const SELECTOR_EVAL: &[u8] = b"plonk_selector_eval";
    
    /// Opening proof labels
    pub const OPENING_W: &[u8] = b"plonk_opening_w";
    pub const OPENING_W_OMEGA: &[u8] = b"plonk_opening_w_omega";
    pub const OPENING_PROOF: &[u8] = b"plonk_opening_proof";
    
    /// Public inputs label
    pub const PUBLIC_INPUTS: &[u8] = b"plonk_public_inputs";
    pub const PUBLIC_INPUT: &[u8] = b"plonk_public_input";
}

#[cfg(test)]
mod tests {
    use super::*;
    use ark_std::UniformRand;

    #[test]
    fn test_transcript_deterministic() {
        let mut transcript1 = Transcript::new(b"test_protocol");
        let mut transcript2 = Transcript::new(b"test_protocol");

        let mut rng = ark_std::test_rng();
        let element = Fr::rand(&mut rng);

        // Absorb same element into both transcripts
        transcript1.absorb_field(b"test_elem", &element);
        transcript2.absorb_field(b"test_elem", &element);

        // Squeeze challenges should be identical
        let challenge1 = transcript1.squeeze_challenge(b"test_challenge");
        let challenge2 = transcript2.squeeze_challenge(b"test_challenge");

        assert_eq!(challenge1, challenge2);
    }

    #[test]
    fn test_transcript_different_domain_labels() {
        let mut transcript1 = Transcript::new(b"protocol_v1");
        let mut transcript2 = Transcript::new(b"protocol_v2");

        let mut rng = ark_std::test_rng();
        let element = Fr::rand(&mut rng);

        // Absorb same element
        transcript1.absorb_field(b"elem", &element);
        transcript2.absorb_field(b"elem", &element);

        // Challenges should be different (different domain labels)
        let challenge1 = transcript1.squeeze_challenge(b"challenge");
        let challenge2 = transcript2.squeeze_challenge(b"challenge");

        assert_ne!(challenge1, challenge2);
    }

    #[test]
    fn test_transcript_different_labels() {
        let mut transcript = Transcript::new(b"test_protocol");

        let mut rng = ark_std::test_rng();
        let element = Fr::rand(&mut rng);

        // Absorb with different labels
        transcript.absorb_field(b"label_a", &element);
        let challenge1 = transcript.squeeze_challenge(b"challenge");

        transcript.reset();
        transcript.absorb_field(b"label_b", &element);
        let challenge2 = transcript.squeeze_challenge(b"challenge");

        // Challenges should be different (different absorption labels)
        assert_ne!(challenge1, challenge2);
    }

    #[test]
    fn test_transcript_order_matters() {
        let mut rng = ark_std::test_rng();
        let elem1 = Fr::rand(&mut rng);
        let elem2 = Fr::rand(&mut rng);

        let mut transcript1 = Transcript::new(b"test_protocol");
        transcript1.absorb_field(b"e1", &elem1);
        transcript1.absorb_field(b"e2", &elem2);
        let challenge1 = transcript1.squeeze_challenge(b"c");

        let mut transcript2 = Transcript::new(b"test_protocol");
        transcript2.absorb_field(b"e2", &elem2);
        transcript2.absorb_field(b"e1", &elem1);
        let challenge2 = transcript2.squeeze_challenge(b"c");

        // Challenges should be different (different absorption order)
        assert_ne!(challenge1, challenge2);
    }

    #[test]
    fn test_squeeze_multiple_challenges() {
        let mut transcript = Transcript::new(b"test_protocol");
        
        let challenges = transcript.squeeze_challenges(b"multi", 5);
        
        assert_eq!(challenges.len(), 5);
        
        // All challenges should be different
        for i in 0..challenges.len() {
            for j in (i + 1)..challenges.len() {
                assert_ne!(challenges[i], challenges[j]);
            }
        }
    }

    #[test]
    fn test_transcript_reset() {
        let mut transcript = Transcript::new(b"test_protocol");
        
        let mut rng = ark_std::test_rng();
        let element = Fr::rand(&mut rng);
        
        transcript.absorb_field(b"elem", &element);
        let challenge1 = transcript.squeeze_challenge(b"c");
        
        // Reset and replay same operations
        transcript.reset();
        transcript.absorb_field(b"elem", &element);
        let challenge2 = transcript.squeeze_challenge(b"c");
        
        // Should get same challenge after reset
        assert_eq!(challenge1, challenge2);
    }

    #[test]
    fn test_absorb_bytes_length_matters() {
        let mut transcript1 = Transcript::new(b"test");
        let mut transcript2 = Transcript::new(b"test");

        // Same bytes, different lengths (one has extra zeros)
        transcript1.absorb_bytes(b"data", &[1, 2, 3]);
        transcript2.absorb_bytes(b"data", &[1, 2, 3, 0, 0]);

        let c1 = transcript1.squeeze_challenge(b"c");
        let c2 = transcript2.squeeze_challenge(b"c");

        // Should be different (length is absorbed)
        assert_ne!(c1, c2);
    }
}
