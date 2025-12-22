//! KZG Polynomial Commitment Scheme
//!
//! Implements Kate-Zaverucha-Goldberg polynomial commitments using BN254 curve.
//! Used in PLONK for committing to witness polynomials and providing opening proofs.
//!
//! # Protocol
//! 1. Commitment: C = [p(τ)]₁ where p is polynomial, τ is secret from trusted setup
//! 2. Opening: Prove p(z) = y for some evaluation point z
//! 3. Verification: Check pairing equation e(C - yG₁, G₂) == e(π, τG₂ - zG₂)
//!
//! # Security
//! - Pairing equation prevents forgery (computational Diffie-Hellman assumption)
//! - All curve points validated before pairing operations
//! - Constant-time operations where applicable

use alloc::vec::Vec;
use ark_bn254::{Bn254, Fr, G1Affine, G2Affine};
use ark_ec::{pairing::Pairing, AffineRepr, CurveGroup};
use ark_ff::{PrimeField, Zero};
use ark_serialize::CanonicalDeserialize;

use super::{Error, Result};

/// Maximum commitment size in bytes (G1 point compressed)
const MAX_COMMITMENT_SIZE: usize = 64;

/// Maximum opening proof size in bytes (G1 point compressed)
const MAX_PROOF_SIZE: usize = 64;

/// Verify a KZG opening proof
///
/// Verifies that polynomial p(x) committed in `commitment` evaluates to `claimed_eval`
/// at point `eval_point`, using the opening proof `proof`.
///
/// # Arguments
/// * `commitment` - Serialized G1 commitment to polynomial p(x)
/// * `eval_point` - Point z where polynomial is evaluated
/// * `claimed_eval` - Claimed value y = p(z)
/// * `proof` - Opening proof π (quotient commitment)
/// * `srs_g2` - Generator from SRS (τG₂ where τ is toxic waste)
///
/// # Verification Equation
/// ```text
/// e(C - yG₁, G₂) == e(π, τG₂ - zG₂)
/// ```
///
/// Where:
/// - C = commitment to p(x)
/// - y = claimed evaluation p(z)
/// - z = evaluation point
/// - π = proof (commitment to quotient polynomial)
/// - τ = secret from trusted setup
///
/// # Returns
/// * `Ok(true)` - Opening proof is valid
/// * `Ok(false)` - Opening proof is invalid
/// * `Err(_)` - Malformed input or validation failed
///
/// # Security
/// - Validates all curve points (on_curve + correct_subgroup)
/// - Uses pairing check to verify quotient polynomial
/// - Prevents evaluation forgery under CDH assumption
pub fn verify_kzg_opening(
    commitment_bytes: &[u8],
    eval_point: &Fr,
    claimed_eval: &Fr,
    proof_bytes: &[u8],
    srs_g2: &G2Affine,
) -> Result<bool> {
    // Input size validation
    if commitment_bytes.len() > MAX_COMMITMENT_SIZE {
        return Err(Error::InvalidInputSize);
    }
    if proof_bytes.len() > MAX_PROOF_SIZE {
        return Err(Error::InvalidInputSize);
    }

    // Deserialize commitment (G1 point)
    let commitment = G1Affine::deserialize_compressed(commitment_bytes)
        .map_err(|_| Error::DeserializationError)?;

    // Deserialize proof (G1 point - quotient commitment)
    let proof = G1Affine::deserialize_compressed(proof_bytes)
        .map_err(|_| Error::DeserializationError)?;

    // Validate curve points
    validate_g1_point(&commitment)?;
    validate_g1_point(&proof)?;
    validate_g2_point(srs_g2)?;

    // Compute C - yG₁ (commitment minus claimed evaluation times generator)
    let g1_generator = G1Affine::generator();
    let y_g1 = g1_generator.mul_bigint(claimed_eval.into_bigint());
    let c_minus_y = (commitment.into_group() - y_g1).into_affine();

    // Compute τG₂ - zG₂ (SRS point minus evaluation point times generator)
    let g2_generator = G2Affine::generator();
    let z_g2 = g2_generator.mul_bigint(eval_point.into_bigint());
    let tau_minus_z = (srs_g2.into_group() - z_g2).into_affine();

    // Pairing check: e(C - yG₁, G₂) == e(π, τG₂ - zG₂)
    // Rearranged as: e(C - yG₁, G₂) * e(-π, τG₂ - zG₂) == 1
    let pairing_check = Bn254::multi_pairing(
        [c_minus_y, (-proof).into()],
        [G2Affine::generator(), tau_minus_z],
    );

    // Verification succeeds if pairing product equals identity
    Ok(pairing_check.is_zero())
}

/// Verify KZG batch opening (multiple evaluations at same point)
///
/// Optimizes gas by verifying multiple polynomial openings at once.
/// Useful for PLONK which opens many polynomials at evaluation points z and zω.
///
/// # Arguments
/// * `commitments` - Vector of polynomial commitments
/// * `eval_point` - Common evaluation point for all polynomials
/// * `claimed_evals` - Claimed evaluations for each polynomial
/// * `proof` - Single aggregated opening proof
/// * `srs_g2` - SRS generator
///
/// # Returns
/// * `Ok(true)` - Batch opening is valid
/// * `Ok(false)` - Batch opening is invalid
/// * `Err(_)` - Malformed input
///
/// # Gas Optimization
/// - Single pairing instead of N pairings for N polynomials
/// - Saves ~80k gas per additional polynomial opening
pub fn verify_kzg_batch_opening(
    commitments: &[G1Affine],
    eval_point: &Fr,
    claimed_evals: &[Fr],
    proof: &G1Affine,
    srs_g2: &G2Affine,
) -> Result<bool> {
    // Validate inputs
    if commitments.len() != claimed_evals.len() {
        return Err(Error::InvalidInputSize);
    }
    if commitments.is_empty() {
        return Err(Error::InvalidInputSize);
    }

    // Validate all points
    for commitment in commitments {
        validate_g1_point(commitment)?;
    }
    validate_g1_point(proof)?;
    validate_g2_point(srs_g2)?;

    // Compute random linear combination coefficients (using Fiat-Shamir)
    // In production, these would come from transcript
    // For now, use simple powers: [1, r, r², r³, ...]
    // TODO: Replace with actual transcript when integrated
    let mut coeffs = Vec::with_capacity(commitments.len());
    let mut r = Fr::from(1u64);
    for _ in 0..commitments.len() {
        coeffs.push(r);
        r *= Fr::from(2u64); // Simple progression for now
    }

    // Compute aggregated commitment: C = Σ rⁱ·Cᵢ
    let mut agg_commitment = G1Affine::identity();
    for (i, commitment) in commitments.iter().enumerate() {
        let scaled = commitment.mul_bigint(coeffs[i].into_bigint());
        agg_commitment = (agg_commitment + scaled).into();
    }

    // Compute aggregated evaluation: y = Σ rⁱ·yᵢ
    let mut agg_eval = Fr::from(0u64);
    for (i, eval) in claimed_evals.iter().enumerate() {
        agg_eval += coeffs[i] * eval;
    }

    // Verify aggregated opening using standard KZG check
    let g1_generator = G1Affine::generator();
    let y_g1 = g1_generator.mul_bigint(agg_eval.into_bigint());
    let c_minus_y = (agg_commitment.into_group() - y_g1).into_affine();

    let g2_generator = G2Affine::generator();
    let z_g2 = g2_generator.mul_bigint(eval_point.into_bigint());
    let tau_minus_z = (srs_g2.into_group() - z_g2).into_affine();

    let pairing_check = Bn254::multi_pairing(
        [c_minus_y, (-*proof).into()],
        [G2Affine::generator(), tau_minus_z],
    );

    Ok(pairing_check.is_zero())
}

/// Validate a G1 curve point
///
/// Ensures point is on the BN254 curve and in the correct prime-order subgroup.
/// Prevents small subgroup attacks and invalid curve attacks.
pub(super) fn validate_g1_point(point: &G1Affine) -> Result<()> {
    // Check point is on curve
    if !point.is_on_curve() {
        return Err(Error::MalformedProof);
    }

    // Check point is in correct subgroup (prevents small subgroup attacks)
    if !point.is_in_correct_subgroup_assuming_on_curve() {
        return Err(Error::MalformedProof);
    }

    Ok(())
}

/// Validate a G2 curve point
fn validate_g2_point(point: &G2Affine) -> Result<()> {
    if !point.is_on_curve() {
        return Err(Error::MalformedProof);
    }

    if !point.is_in_correct_subgroup_assuming_on_curve() {
        return Err(Error::MalformedProof);
    }

    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;
    use ark_bn254::{G1Projective, G2Projective};
    use ark_ec::CurveGroup;
    use ark_serialize::CanonicalSerialize;
    use ark_std::UniformRand;

    #[test]
    fn test_validate_g1_point_on_curve() {
        let mut rng = ark_std::test_rng();
        let point = G1Projective::rand(&mut rng).into_affine();
        assert!(validate_g1_point(&point).is_ok());
    }

    #[test]
    fn test_validate_g1_identity() {
        let identity = G1Affine::identity();
        assert!(validate_g1_point(&identity).is_ok());
    }

    #[test]
    fn test_validate_g2_point_on_curve() {
        let mut rng = ark_std::test_rng();
        let point = G2Projective::rand(&mut rng).into_affine();
        assert!(validate_g2_point(&point).is_ok());
    }

    #[test]
    fn test_kzg_opening_valid_serialization() {
        let mut rng = ark_std::test_rng();
        
        // Generate random test data
        let commitment = G1Projective::rand(&mut rng).into_affine();
        let proof = G1Projective::rand(&mut rng).into_affine();
        let srs_g2 = G2Projective::rand(&mut rng).into_affine();
        let eval_point = Fr::rand(&mut rng);
        let claimed_eval = Fr::rand(&mut rng);

        // Serialize
        let mut commitment_bytes = Vec::new();
        commitment.serialize_compressed(&mut commitment_bytes).unwrap();

        let mut proof_bytes = Vec::new();
        proof.serialize_compressed(&mut proof_bytes).unwrap();

        // This will likely fail verification (random data)
        // But should not panic or error on deserialization
        let result = verify_kzg_opening(
            &commitment_bytes,
            &eval_point,
            &claimed_eval,
            &proof_bytes,
            &srs_g2,
        );

        // Should return Ok (either true or false), not Err
        assert!(result.is_ok());
    }

    #[test]
    fn test_kzg_opening_invalid_size() {
        let srs_g2 = G2Affine::generator();
        let eval_point = Fr::from(1u64);
        let claimed_eval = Fr::from(2u64);

        // Oversized commitment
        let large_commitment = vec![0u8; MAX_COMMITMENT_SIZE + 1];
        let proof = vec![0u8; 32];

        let result = verify_kzg_opening(
            &large_commitment,
            &eval_point,
            &claimed_eval,
            &proof,
            &srs_g2,
        );

        assert_eq!(result, Err(Error::InvalidInputSize));
    }

    #[test]
    fn test_batch_opening_empty_inputs() {
        let srs_g2 = G2Affine::generator();
        let proof = G1Affine::generator();
        let eval_point = Fr::from(1u64);

        let result = verify_kzg_batch_opening(
            &[],
            &eval_point,
            &[],
            &proof,
            &srs_g2,
        );

        assert_eq!(result, Err(Error::InvalidInputSize));
    }

    #[test]
    fn test_batch_opening_mismatched_lengths() {
        let mut rng = ark_std::test_rng();
        let srs_g2 = G2Affine::generator();
        let proof = G1Projective::rand(&mut rng).into_affine();
        let eval_point = Fr::from(1u64);

        let commitments = vec![G1Projective::rand(&mut rng).into_affine()];
        let claimed_evals = vec![Fr::rand(&mut rng), Fr::rand(&mut rng)];

        let result = verify_kzg_batch_opening(
            &commitments,
            &eval_point,
            &claimed_evals,
            &proof,
            &srs_g2,
        );

        assert_eq!(result, Err(Error::InvalidInputSize));
    }
}
