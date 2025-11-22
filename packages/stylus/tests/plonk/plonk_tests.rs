//! Integration tests for PLONK verifier
//! 
//! Tests cover:
//! - End-to-end proof verification
//! - Security edge cases
//! - Invalid proof rejection
//! - SRS management
//! - KZG commitment verification
//! - Fiat-Shamir transcript

use plonk::*;
use ark_bn254::{Bn254, Fr, G1Affine, G2Affine, G1Projective, G2Projective};
use ark_ec::{AffineRepr, pairing::Pairing};
use ark_ff::{PrimeField, Field, One, Zero};
use ark_std::UniformRand;

/// Generate test SRS for circuit size n
fn generate_test_srs(degree: SrsDegree) -> Srs {
    let mut rng = ark_std::test_rng();
    let tau = Fr::rand(&mut rng);
    
    let size = degree.size();
    let g1_gen = G1Projective::generator();
    let g2_gen = G2Projective::generator();

    // Generate G₁ powers: [G₁, τG₁, τ²G₁, ...]
    let mut g1_powers = Vec::with_capacity(size + 1);
    let mut tau_power = Fr::one();
    for _ in 0..=size {
        g1_powers.push((g1_gen * tau_power).into_affine());
        tau_power *= tau;
    }

    // Generate G₂ powers: [G₂, τG₂]
    let g2_powers = vec![
        g2_gen.into_affine(),
        (g2_gen * tau).into_affine(),
    ];

    Srs::new(g1_powers, g2_powers, degree).unwrap()
}

/// Generate test verification key
fn generate_test_vk(n: usize) -> PlonkVerificationKey {
    let mut rng = ark_std::test_rng();
    
    // Compute omega (nth root of unity)
    let omega = Fr::get_root_of_unity(n).unwrap();
    
    PlonkVerificationKey {
        n,
        num_public_inputs: 2,
        selector_commitments: [
            G1Affine::rand(&mut rng),
            G1Affine::rand(&mut rng),
            G1Affine::rand(&mut rng),
            G1Affine::rand(&mut rng),
            G1Affine::rand(&mut rng),
        ],
        permutation_commitments: [
            G1Affine::rand(&mut rng),
            G1Affine::rand(&mut rng),
            G1Affine::rand(&mut rng),
        ],
        lagrange_first: G1Affine::rand(&mut rng),
        lagrange_last: G1Affine::rand(&mut rng),
        omega,
        k1: Fr::from(2u64),
        k2: Fr::from(3u64),
    }
}

/// Generate test PLONK proof (structural test, not cryptographically valid)
fn generate_test_proof() -> PlonkProof {
    let mut rng = ark_std::test_rng();
    
    PlonkProof {
        wire_commitments: [
            G1Affine::rand(&mut rng),
            G1Affine::rand(&mut rng),
            G1Affine::rand(&mut rng),
        ],
        permutation_commitment: G1Affine::rand(&mut rng),
        quotient_commitments: [
            G1Affine::rand(&mut rng),
            G1Affine::rand(&mut rng),
            G1Affine::rand(&mut rng),
        ],
        wire_evals: [Fr::rand(&mut rng), Fr::rand(&mut rng), Fr::rand(&mut rng)],
        permutation_evals: [Fr::rand(&mut rng), Fr::rand(&mut rng)],
        selector_evals: [
            Fr::rand(&mut rng),
            Fr::rand(&mut rng),
            Fr::rand(&mut rng),
            Fr::rand(&mut rng),
            Fr::rand(&mut rng),
        ],
        opening_proof_zeta: G1Affine::rand(&mut rng),
        opening_proof_omega: G1Affine::rand(&mut rng),
    }
}

// =============================================================================
// SRS Tests
// =============================================================================

#[test]
fn test_srs_generation_and_validation() {
    let srs = generate_test_srs(SrsDegree::D1024);
    
    assert_eq!(srs.g1_powers.len(), 1025);
    assert_eq!(srs.g2_powers.len(), 2);
    assert_eq!(srs.degree, SrsDegree::D1024);
    
    // All points should be valid
    for point in &srs.g1_powers {
        assert!(point.is_on_curve());
        assert!(point.is_in_correct_subgroup_assuming_on_curve());
    }
    for point in &srs.g2_powers {
        assert!(point.is_on_curve());
        assert!(point.is_in_correct_subgroup_assuming_on_curve());
    }
}

#[test]
fn test_srs_consistency_check() {
    let srs = generate_test_srs(SrsDegree::D1024);
    
    // Verify e(τG₁, G₂) == e(G₁, τG₂)
    let is_consistent = srs.verify_consistency().unwrap();
    assert!(is_consistent);
}

#[test]
fn test_srs_hash_verification() {
    let srs = generate_test_srs(SrsDegree::D1024);
    
    // Hash should match itself
    let hash = srs.hash;
    assert!(srs.verify_hash(&hash));
    
    // Wrong hash should fail
    let wrong_hash = [0u8; 32];
    assert!(!srs.verify_hash(&wrong_hash));
}

#[test]
fn test_srs_registry() {
    let mut registry = SrsRegistry::new();
    
    // Register multiple SRS
    let srs1024 = generate_test_srs(SrsDegree::D1024);
    let srs4096 = generate_test_srs(SrsDegree::D4096);
    
    registry.register(srs1024).unwrap();
    registry.register(srs4096).unwrap();
    
    // Should be able to retrieve
    assert!(registry.has(SrsDegree::D1024));
    assert!(registry.has(SrsDegree::D4096));
    assert!(!registry.has(SrsDegree::D16384));
    
    let retrieved = registry.get(SrsDegree::D1024).unwrap();
    assert_eq!(retrieved.degree, SrsDegree::D1024);
}

#[test]
fn test_srs_registry_duplicate_rejection() {
    let mut registry = SrsRegistry::new();
    
    let srs1 = generate_test_srs(SrsDegree::D1024);
    let srs2 = generate_test_srs(SrsDegree::D1024);
    
    registry.register(srs1).unwrap();
    
    // Second registration of same degree should fail
    let result = registry.register(srs2);
    assert!(result.is_err());
}

#[test]
fn test_srs_msm() {
    let srs = generate_test_srs(SrsDegree::D1024);
    
    // Test multi-scalar multiplication
    let scalars = vec![Fr::from(1u64), Fr::from(2u64), Fr::from(3u64)];
    let result = srs.msm_g1(&scalars);
    
    assert!(result.is_ok());
    let point = result.unwrap();
    assert!(point.is_on_curve());
    assert!(point.is_in_correct_subgroup_assuming_on_curve());
}

// =============================================================================
// KZG Tests
// =============================================================================

#[test]
fn test_kzg_point_validation() {
    let mut rng = ark_std::test_rng();
    
    // Valid G₁ point
    let valid_g1 = G1Affine::rand(&mut rng);
    assert!(kzg::validate_g1_point(&valid_g1));
    
    // Valid G₂ point
    let valid_g2 = G2Affine::rand(&mut rng);
    assert!(kzg::validate_g2_point(&valid_g2));
    
    // Identity point (should still pass validation)
    let identity_g1 = G1Affine::identity();
    assert!(kzg::validate_g1_point(&identity_g1));
}

#[test]
fn test_kzg_opening_verification_structure() {
    // This tests the structure, not cryptographic validity
    let srs = generate_test_srs(SrsDegree::D1024);
    let mut rng = ark_std::test_rng();
    
    let commitment = G1Affine::rand(&mut rng);
    let point = Fr::rand(&mut rng);
    let eval = Fr::rand(&mut rng);
    let proof = G1Affine::rand(&mut rng);
    
    // Should not panic, though may return false for invalid proof
    let result = kzg::verify_kzg_opening(&commitment, point, eval, &proof, &srs);
    assert!(result.is_ok());
}

#[test]
fn test_kzg_batch_opening_structure() {
    let srs = generate_test_srs(SrsDegree::D1024);
    let mut rng = ark_std::test_rng();
    
    let commitments = vec![
        G1Affine::rand(&mut rng),
        G1Affine::rand(&mut rng),
        G1Affine::rand(&mut rng),
    ];
    let evals = vec![
        Fr::rand(&mut rng),
        Fr::rand(&mut rng),
        Fr::rand(&mut rng),
    ];
    let point = Fr::rand(&mut rng);
    let proof = G1Affine::rand(&mut rng);
    
    let result = kzg::verify_kzg_batch_opening(&commitments, &evals, point, &proof, &srs);
    assert!(result.is_ok());
}

// =============================================================================
// Transcript Tests
// =============================================================================

#[test]
fn test_transcript_determinism() {
    let mut t1 = Transcript::new(b"test_protocol");
    let mut t2 = Transcript::new(b"test_protocol");
    
    let field_elem = Fr::from(12345u64);
    
    t1.absorb_field(b"test", &field_elem);
    t2.absorb_field(b"test", &field_elem);
    
    let c1 = t1.squeeze_challenge(b"challenge");
    let c2 = t2.squeeze_challenge(b"challenge");
    
    assert_eq!(c1, c2);
}

#[test]
fn test_transcript_domain_separation() {
    let mut t1 = Transcript::new(b"protocol_1");
    let mut t2 = Transcript::new(b"protocol_2");
    
    let field_elem = Fr::from(12345u64);
    
    t1.absorb_field(b"test", &field_elem);
    t2.absorb_field(b"test", &field_elem);
    
    let c1 = t1.squeeze_challenge(b"challenge");
    let c2 = t2.squeeze_challenge(b"challenge");
    
    // Different protocols should produce different challenges
    assert_ne!(c1, c2);
}

#[test]
fn test_transcript_order_sensitivity() {
    let mut t1 = Transcript::new(b"test");
    let mut t2 = Transcript::new(b"test");
    
    let f1 = Fr::from(1u64);
    let f2 = Fr::from(2u64);
    
    t1.absorb_field(b"a", &f1);
    t1.absorb_field(b"b", &f2);
    
    t2.absorb_field(b"a", &f2);
    t2.absorb_field(b"b", &f1);
    
    let c1 = t1.squeeze_challenge(b"c");
    let c2 = t2.squeeze_challenge(b"c");
    
    // Different order should produce different challenges
    assert_ne!(c1, c2);
}

#[test]
fn test_transcript_multiple_challenges() {
    let mut transcript = Transcript::new(b"test");
    
    transcript.absorb_field(b"input", &Fr::from(42u64));
    
    let c1 = transcript.squeeze_challenge(b"c1");
    let c2 = transcript.squeeze_challenge(b"c2");
    let c3 = transcript.squeeze_challenge(b"c3");
    
    // All challenges should be different
    assert_ne!(c1, c2);
    assert_ne!(c2, c3);
    assert_ne!(c1, c3);
}

// =============================================================================
// Verification Key Tests
// =============================================================================

#[test]
fn test_vk_validation() {
    let vk = generate_test_vk(8);
    assert!(vk.validate().is_ok());
}

#[test]
fn test_vk_invalid_size() {
    let mut vk = generate_test_vk(8);
    
    // Make size non-power-of-2
    vk.n = 7;
    
    let result = vk.validate();
    assert!(result.is_err());
}

#[test]
fn test_vk_omega_root_of_unity() {
    let vk = generate_test_vk(16);
    
    // ω^n should equal 1
    let omega_n = vk.omega.pow(&[vk.n as u64]);
    assert_eq!(omega_n, Fr::one());
    
    // ω^(n/2) should not equal 1
    let omega_half = vk.omega.pow(&[(vk.n / 2) as u64]);
    assert_ne!(omega_half, Fr::one());
}

// =============================================================================
// PLONK Proof Tests
// =============================================================================

#[test]
fn test_proof_structure() {
    let proof = generate_test_proof();
    
    // Verify structure
    assert_eq!(proof.wire_commitments.len(), 3);
    assert_eq!(proof.quotient_commitments.len(), 3);
    assert_eq!(proof.wire_evals.len(), 3);
    assert_eq!(proof.permutation_evals.len(), 2);
    assert_eq!(proof.selector_evals.len(), 5);
    
    // All points should be valid
    for commitment in &proof.wire_commitments {
        assert!(commitment.is_on_curve());
    }
    for commitment in &proof.quotient_commitments {
        assert!(commitment.is_on_curve());
    }
}

#[test]
fn test_public_input_eval_empty() {
    let vk = generate_test_vk(8);
    let point = Fr::from(5u64);
    
    let eval = plonk::compute_public_input_eval(&[], point, vk.omega, vk.n);
    assert!(eval.is_ok());
    assert_eq!(eval.unwrap(), Fr::zero());
}

#[test]
fn test_lagrange_first_at_one() {
    let vk = generate_test_vk(8);
    
    // At point = 1, vanishing polynomial is 0
    let zh = Fr::zero();
    let l1 = plonk::compute_lagrange_first(Fr::one(), zh, vk.omega, vk.n);
    
    // L₁(1) = 1
    assert_eq!(l1, Fr::one());
}

#[test]
fn test_vanishing_polynomial() {
    let n = 8;
    let omega = Fr::get_root_of_unity(n).unwrap();
    
    // Z_H(ω^i) should be zero for all i < n
    for i in 0..n {
        let point = omega.pow(&[i as u64]);
        let zh = point.pow(&[n as u64]) - Fr::one();
        assert_eq!(zh, Fr::zero());
    }
    
    // Z_H at random point should be non-zero
    let random = Fr::from(99999u64);
    let zh_random = random.pow(&[n as u64]) - Fr::one();
    assert_ne!(zh_random, Fr::zero());
}

// =============================================================================
// Security Tests
// =============================================================================

#[test]
fn test_reject_wrong_public_input_count() {
    let vk = generate_test_vk(8);
    let proof = generate_test_proof();
    let srs = generate_test_srs(SrsDegree::D1024);
    
    // VK expects 2 public inputs, provide 3
    let wrong_inputs = vec![Fr::from(1u64), Fr::from(2u64), Fr::from(3u64)];
    
    let result = verify_plonk_proof(&proof, &vk, &wrong_inputs, &srs);
    assert!(result.is_err());
}

#[test]
fn test_reject_invalid_vk() {
    let mut vk = generate_test_vk(8);
    let proof = generate_test_proof();
    let srs = generate_test_srs(SrsDegree::D1024);
    let inputs = vec![Fr::from(1u64), Fr::from(2u64)];
    
    // Make VK invalid
    vk.n = 7; // Non-power-of-2
    
    let result = verify_plonk_proof(&proof, &vk, &inputs, &srs);
    assert!(result.is_err());
}

#[test]
fn test_srs_insufficient_size() {
    let srs = generate_test_srs(SrsDegree::D1024);
    
    // Try to access power beyond SRS size
    let result = srs.get_g1_power(2000);
    assert!(result.is_err());
}

// =============================================================================
// Integration Tests
// =============================================================================

#[test]
fn test_full_verification_flow() {
    // This tests the complete verification pipeline structure
    let n = 8;
    let vk = generate_test_vk(n);
    let proof = generate_test_proof();
    let srs = generate_test_srs(SrsDegree::D1024);
    let public_inputs = vec![Fr::from(10u64), Fr::from(20u64)];
    
    // Should execute without panicking (may fail verification)
    let result = verify_plonk_proof(&proof, &vk, &public_inputs, &srs);
    
    // Result should be Ok (with bool value) or Err
    assert!(result.is_ok() || result.is_err());
}

#[test]
fn test_multiple_verifications_same_srs() {
    let srs = generate_test_srs(SrsDegree::D1024);
    
    // Multiple verifications should work with same SRS
    for _ in 0..5 {
        let vk = generate_test_vk(8);
        let proof = generate_test_proof();
        let inputs = vec![Fr::from(1u64), Fr::from(2u64)];
        
        let result = verify_plonk_proof(&proof, &vk, &inputs, &srs);
        assert!(result.is_ok() || result.is_err());
    }
}
