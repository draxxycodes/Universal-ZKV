//! Fast Reed-Solomon Interactive Oracle Proof (FRI) Verifier
//!
//! FRI is the core polynomial commitment scheme used in STARKs.
//! It proves that a committed polynomial has degree at most d.
//!
//! # Protocol Overview
//! 1. Prover commits to polynomial f(X) via Merkle tree
//! 2. Verifier sends random challenge α
//! 3. Prover "folds" polynomial: f'(X) = f_even(X²) + α·f_odd(X²)
//! 4. Repeat until degree is small enough
//! 5. Prover sends final polynomial in the clear
//! 6. Verifier checks consistency via Merkle proofs
//!
//! # Security
//! - Soundness: If deg(f) > d, prover can fool verifier with prob ≤ d/|𝔽|
//! - Multiple queries reduce error: (d/|𝔽|)^queries
//! - With 28 queries and d=1M, error ≈ 2^-100
//!
//! # Gas Cost
//! - Merkle proof verification: ~5k gas per layer
//! - Field operations: ~100 gas per fold
//! - Total: ~150k-200k gas for 10-layer FRI

use alloc::vec::Vec;
use blake3::Hasher;
use winter_math::{FieldElement, StarkField};
use crate::{Error, Result, SecurityLevel};

/// FRI proof structure
#[derive(Debug, Clone)]
pub struct FriProof<F: StarkField> {
    /// Commitments to folded polynomials (Merkle roots)
    pub layer_commitments: Vec<[u8; 32]>,
    
    /// Merkle proofs for each query
    pub layer_proofs: Vec<Vec<MerkleProof>>,
    
    /// Evaluations at query positions for each layer
    pub layer_evaluations: Vec<Vec<F>>,
    
    /// Final polynomial coefficients (when degree is small)
    pub remainder: Vec<F>,
    
    /// Number of queries (for security)
    pub num_queries: usize,
}

/// Merkle proof for a single element
#[derive(Debug, Clone)]
pub struct MerkleProof {
    /// Path from leaf to root (sibling hashes)
    pub path: Vec<[u8; 32]>,
    
    /// Index of the leaf
    pub index: usize,
}

/// FRI verification options
#[derive(Debug, Clone)]
pub struct FriOptions {
    /// Number of FRI layers (related to polynomial degree)
    pub num_layers: usize,
    
    /// Blowup factor (domain_size / trace_length)
    pub blowup_factor: usize,
    
    /// Number of queries for soundness
    pub num_queries: usize,
    
    /// Maximum remainder degree
    pub max_remainder_degree: usize,
}

impl FriOptions {
    /// Create FRI options for a given security level
    pub fn from_security_level(security: SecurityLevel, trace_length: usize) -> Self {
        // Number of layers = log2(trace_length * blowup_factor / max_remainder)
        let blowup = security.blowup_factor();
        let domain_size = trace_length * blowup;
        let max_remainder_degree = 7; // Small constant
        let num_layers = (domain_size / max_remainder_degree).next_power_of_two().trailing_zeros() as usize;
        
        FriOptions {
            num_layers,
            blowup_factor: blowup,
            num_queries: security.num_queries(),
            max_remainder_degree,
        }
    }
}

/// FRI verifier implementation
pub struct FriVerifier<F: StarkField> {
    options: FriOptions,
    _phantom: core::marker::PhantomData<F>,
}

impl<F: StarkField> FriVerifier<F> {
    /// Create a new FRI verifier with given options
    pub fn new(options: FriOptions) -> Self {
        FriVerifier {
            options,
            _phantom: core::marker::PhantomData,
        }
    }
    
    /// Verify a FRI proof
    ///
    /// # Arguments
    /// * `proof` - The FRI proof to verify
    /// * `challenges` - Random challenges (one per layer)
    /// * `initial_evaluation_domain` - The evaluation domain for the first layer
    ///
    /// # Returns
    /// `Ok(())` if proof is valid, `Err` otherwise
    ///
    /// # Gas Cost
    /// ~150k-200k gas for typical parameters (10 layers, 28 queries)
    pub fn verify(
        &self,
        proof: &FriProof<F>,
        challenges: &[F],
        initial_evaluation_domain: &[F],
    ) -> Result<()> {
        // Validate proof structure
        self.validate_proof_structure(proof)?;
        
        // Validate challenges
        if challenges.len() != self.options.num_layers {
            return Err(Error::FriVerificationFailed);
        }
        
        // Verify each layer
        for layer_idx in 0..self.options.num_layers {
            self.verify_layer(
                proof,
                layer_idx,
                challenges[layer_idx],
                initial_evaluation_domain,
            )?;
        }
        
        // Verify remainder polynomial
        self.verify_remainder(proof)?;
        
        Ok(())
    }
    
    /// Validate FRI proof structure
    fn validate_proof_structure(&self, proof: &FriProof<F>) -> Result<()> {
        // Check number of layers
        if proof.layer_commitments.len() != self.options.num_layers {
            return Err(Error::FriVerificationFailed);
        }
        
        // Check number of queries
        if proof.num_queries != self.options.num_queries {
            return Err(Error::FriVerificationFailed);
        }
        
        // Check remainder size
        if proof.remainder.len() > self.options.max_remainder_degree + 1 {
            return Err(Error::FriVerificationFailed);
        }
        
        Ok(())
    }
    
    /// Verify a single FRI layer
    fn verify_layer(
        &self,
        proof: &FriProof<F>,
        layer_idx: usize,
        challenge: F,
        evaluation_domain: &[F],
    ) -> Result<()> {
        let commitment = proof.layer_commitments[layer_idx];
        let layer_proofs = &proof.layer_proofs[layer_idx];
        let layer_evals = &proof.layer_evaluations[layer_idx];
        
        // Verify each query
        for query_idx in 0..self.options.num_queries {
            let merkle_proof = &layer_proofs[query_idx];
            let evaluation = layer_evals[query_idx];
            
            // Verify Merkle proof
            self.verify_merkle_proof(
                &commitment,
                merkle_proof,
                &evaluation,
            )?;
            
            // Verify folding consistency
            if layer_idx > 0 {
                self.verify_folding(
                    proof,
                    layer_idx,
                    query_idx,
                    challenge,
                    evaluation_domain,
                )?;
            }
        }
        
        Ok(())
    }
    
    /// Verify Merkle proof for a single evaluation
    ///
    /// # Gas Cost
    /// ~5k gas (Blake3 hashing + path verification)
    fn verify_merkle_proof(
        &self,
        root: &[u8; 32],
        proof: &MerkleProof,
        value: &F,
    ) -> Result<()> {
        // Serialize field element
        let leaf_data = value.to_bytes();
        
        // Compute leaf hash
        let mut hasher = Hasher::new();
        hasher.update(&leaf_data);
        let mut current_hash = hasher.finalize().into();
        
        // Verify path to root
        let mut index = proof.index;
        for sibling in &proof.path {
            let mut hasher = Hasher::new();
            
            if index % 2 == 0 {
                // Current is left child
                hasher.update(&current_hash);
                hasher.update(sibling);
            } else {
                // Current is right child
                hasher.update(sibling);
                hasher.update(&current_hash);
            }
            
            current_hash = hasher.finalize().into();
            index /= 2;
        }
        
        // Check root matches
        if &current_hash == root {
            Ok(())
        } else {
            Err(Error::MerkleProofFailed)
        }
    }
    
    /// Verify folding consistency between layers
    ///
    /// Checks that f_{i+1}(X) = f_i(X²) + α·f_i(-X²)
    /// where f_i is the polynomial at layer i
    fn verify_folding(
        &self,
        proof: &FriProof<F>,
        layer_idx: usize,
        query_idx: usize,
        challenge: F,
        evaluation_domain: &[F],
    ) -> Result<()> {
        // Get evaluations from current and previous layer
        let current_eval = proof.layer_evaluations[layer_idx][query_idx];
        let prev_layer_evals = &proof.layer_evaluations[layer_idx - 1];
        
        // Get query position
        let merkle_proof = &proof.layer_proofs[layer_idx][query_idx];
        let query_pos = merkle_proof.index;
        
        // Compute expected evaluation from folding
        // f'(x²) = (f(x) + f(-x))/2 + α·(f(x) - f(-x))/(2x)
        let domain_size = evaluation_domain.len() >> layer_idx;
        let x = evaluation_domain[query_pos % domain_size];
        let x_neg = x.neg();
        
        // Find positions of x and -x in previous layer
        let pos_x = query_pos * 2;
        let pos_neg_x = pos_x + 1;
        
        let f_x = prev_layer_evals[pos_x];
        let f_neg_x = prev_layer_evals[pos_neg_x];
        
        // Compute folding: f'(x²) = (f(x) + f(-x))/2 + α·(f(x) - f(-x))/(2x)
        let two = F::ONE + F::ONE;
        let even_part = (f_x + f_neg_x) / two;
        let odd_part = (f_x - f_neg_x) / (two * x);
        let expected_eval = even_part + challenge * odd_part;
        
        // Check consistency
        if current_eval == expected_eval {
            Ok(())
        } else {
            Err(Error::FriVerificationFailed)
        }
    }
    
    /// Verify the remainder polynomial
    ///
    /// At the end of FRI, we should have a low-degree polynomial
    /// that can be represented explicitly by its coefficients
    fn verify_remainder(&self, proof: &FriProof<F>) -> Result<()> {
        // Check degree bound
        if proof.remainder.len() > self.options.max_remainder_degree + 1 {
            return Err(Error::DegreeBoundViolation);
        }
        
        // Verify remainder is consistent with last layer evaluations
        let last_layer_evals = proof.layer_evaluations.last()
            .ok_or(Error::FriVerificationFailed)?;
        
        // For each query, evaluate remainder polynomial and check match
        for (query_idx, &expected_eval) in last_layer_evals.iter().enumerate() {
            let computed_eval = self.evaluate_polynomial(
                &proof.remainder,
                query_idx,
            );
            
            if computed_eval != expected_eval {
                return Err(Error::EvaluationMismatch);
            }
        }
        
        Ok(())
    }
    
    /// Evaluate polynomial at a point using Horner's method
    ///
    /// # Gas Cost
    /// ~100 gas per coefficient
    fn evaluate_polynomial(&self, coefficients: &[F], x_index: usize) -> F {
        // Convert index to field element
        let x = F::from(x_index as u64);
        
        // Horner's method: p(x) = a₀ + x(a₁ + x(a₂ + ...))
        let mut result = F::ZERO;
        for coeff in coefficients.iter().rev() {
            result = result * x + *coeff;
        }
        result
    }
}

/// Generate FRI challenges from random seed
///
/// Uses Fiat-Shamir heuristic to derive challenges from proof commitments
pub fn generate_fri_challenges<F: StarkField>(
    layer_commitments: &[[u8; 32]],
    seed: &[u8],
) -> Vec<F> {
    let mut challenges = Vec::with_capacity(layer_commitments.len());
    
    for (idx, commitment) in layer_commitments.iter().enumerate() {
        let mut hasher = Hasher::new();
        hasher.update(seed);
        hasher.update(&(idx as u64).to_le_bytes());
        hasher.update(commitment);
        
        let hash = hasher.finalize();
        let challenge = F::from_random_bytes(&hash.as_bytes()[..16])
            .unwrap_or(F::ONE);
        
        challenges.push(challenge);
    }
    
    challenges
}

#[cfg(test)]
mod tests {
    use super::*;
    use winter_math::fields::f128::BaseElement;
    
    type TestField = BaseElement;
    
    #[test]
    fn test_fri_options_creation() {
        let options = FriOptions::from_security_level(
            SecurityLevel::Proven100,
            1024,
        );
        
        assert_eq!(options.blowup_factor, 8);
        assert_eq!(options.num_queries, 28);
        assert!(options.num_layers > 0);
    }
    
    #[test]
    fn test_merkle_proof_validation() {
        // Create a simple 2-layer tree
        let value = TestField::ONE;
        let sibling = TestField::from(2u64);
        
        // Compute leaf hashes
        let mut leaf_hasher = Hasher::new();
        leaf_hasher.update(&value.to_bytes());
        let leaf_hash = leaf_hasher.finalize();
        
        let mut sibling_hasher = Hasher::new();
        sibling_hasher.update(&sibling.to_bytes());
        let sibling_hash = sibling_hasher.finalize();
        
        // Compute root
        let mut root_hasher = Hasher::new();
        root_hasher.update(leaf_hash.as_bytes());
        root_hasher.update(sibling_hash.as_bytes());
        let root = root_hasher.finalize();
        
        // Create proof
        let proof = MerkleProof {
            path: vec![sibling_hash.into()],
            index: 0,
        };
        
        // Verify
        let verifier = FriVerifier::<TestField>::new(FriOptions {
            num_layers: 1,
            blowup_factor: 8,
            num_queries: 1,
            max_remainder_degree: 7,
        });
        
        assert!(verifier.verify_merkle_proof(
            &root.into(),
            &proof,
            &value,
        ).is_ok());
    }
    
    #[test]
    fn test_polynomial_evaluation() {
        let coefficients = vec![
            TestField::from(1u64),  // constant
            TestField::from(2u64),  // x
            TestField::from(3u64),  // x²
        ];
        
        let verifier = FriVerifier::<TestField>::new(FriOptions {
            num_layers: 1,
            blowup_factor: 8,
            num_queries: 1,
            max_remainder_degree: 7,
        });
        
        // p(0) = 1
        assert_eq!(
            verifier.evaluate_polynomial(&coefficients, 0),
            TestField::from(1u64)
        );
        
        // p(1) = 1 + 2 + 3 = 6
        assert_eq!(
            verifier.evaluate_polynomial(&coefficients, 1),
            TestField::from(6u64)
        );
        
        // p(2) = 1 + 4 + 12 = 17
        assert_eq!(
            verifier.evaluate_polynomial(&coefficients, 2),
            TestField::from(17u64)
        );
    }
    
    #[test]
    fn test_generate_fri_challenges() {
        let commitments = vec![
            [1u8; 32],
            [2u8; 32],
            [3u8; 32],
        ];
        
        let seed = b"test_seed";
        let challenges = generate_fri_challenges::<TestField>(&commitments, seed);
        
        assert_eq!(challenges.len(), 3);
        
        // Challenges should be deterministic
        let challenges2 = generate_fri_challenges::<TestField>(&commitments, seed);
        assert_eq!(challenges, challenges2);
        
        // Different seed should give different challenges
        let challenges3 = generate_fri_challenges::<TestField>(&commitments, b"different_seed");
        assert_ne!(challenges, challenges3);
    }
}
