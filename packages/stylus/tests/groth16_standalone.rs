//! Standalone Groth16 Verifier Tests
//!
//! These tests run independently of stylus-sdk to work around
//! Windows nightly toolchain linking issues (LNK1120).
//!
//! Note: This limitation only affects local Windows testing.
//! Linux deployment environment will have full test coverage.

#[cfg(test)]
mod groth16_tests {
    use ark_bn254::{Bn254, Fr, G1Affine, G1Projective, G2Affine, G2Projective};
    use ark_ec::pairing::Pairing;
    use ark_ec::{AffineRepr, CurveGroup};
    use ark_groth16::{Proof, VerifyingKey};
    use ark_serialize::{CanonicalDeserialize, CanonicalSerialize};
    use ark_std::{UniformRand, Zero};

    // Constants from main implementation
    const MAX_PUBLIC_INPUTS: usize = 256;
    const MAX_PROOF_SIZE: usize = 512;
    const MAX_VK_SIZE: usize = 4096;

    #[derive(Debug, Clone, Copy, PartialEq, Eq)]
    pub enum Error {
        DeserializationError,
        MalformedProof,
        InvalidVerificationKey,
        InvalidPublicInputs,
        VerificationFailed,
        InvalidInputSize,
    }

    pub type Result<T> = core::result::Result<T, Error>;

    /// Validate proof components (duplicate of main implementation for testing)
    fn validate_proof(proof: &Proof<Bn254>) -> Result<()> {
        if !proof.a.is_on_curve() {
            return Err(Error::MalformedProof);
        }
        if !proof.a.is_in_correct_subgroup_assuming_on_curve() {
            return Err(Error::MalformedProof);
        }

        if !proof.b.is_on_curve() {
            return Err(Error::MalformedProof);
        }
        if !proof.b.is_in_correct_subgroup_assuming_on_curve() {
            return Err(Error::MalformedProof);
        }

        if !proof.c.is_on_curve() {
            return Err(Error::MalformedProof);
        }
        if !proof.c.is_in_correct_subgroup_assuming_on_curve() {
            return Err(Error::MalformedProof);
        }

        Ok(())
    }

    /// Deserialize public inputs
    fn deserialize_public_inputs(bytes: &[u8]) -> Result<Vec<Fr>> {
        if bytes.len() % 32 != 0 {
            return Err(Error::InvalidPublicInputs);
        }

        let num_inputs = bytes.len() / 32;
        if num_inputs > MAX_PUBLIC_INPUTS {
            return Err(Error::InvalidInputSize);
        }

        let mut inputs = Vec::with_capacity(num_inputs);
        for chunk in bytes.chunks(32) {
            let input = Fr::deserialize_compressed(chunk)
                .map_err(|_| Error::InvalidPublicInputs)?;
            inputs.push(input);
        }

        Ok(inputs)
    }

    #[test]
    fn test_valid_proof_structure() {
        let mut rng = ark_std::test_rng();

        // Generate random valid proof points
        let proof = Proof {
            a: G1Projective::rand(&mut rng).into_affine(),
            b: G2Projective::rand(&mut rng).into_affine(),
            c: G1Projective::rand(&mut rng).into_affine(),
        };

        // Should pass validation
        assert!(validate_proof(&proof).is_ok());
    }

    #[test]
    fn test_identity_point_valid() {
        let mut rng = ark_std::test_rng();

        // Identity point (point at infinity) is valid
        let proof = Proof {
            a: G1Affine::identity(),
            b: G2Projective::rand(&mut rng).into_affine(),
            c: G1Projective::rand(&mut rng).into_affine(),
        };

        assert!(validate_proof(&proof).is_ok());
    }

    #[test]
    fn test_all_identity_points_valid() {
        // All identity points should be valid
        let proof = Proof {
            a: G1Affine::identity(),
            b: G2Affine::identity(),
            c: G1Affine::identity(),
        };

        assert!(validate_proof(&proof).is_ok());
    }

    #[test]
    fn test_proof_serialization_roundtrip() {
        let mut rng = ark_std::test_rng();

        // Generate proof
        let original_proof: Proof<Bn254> = Proof {
            a: G1Projective::rand(&mut rng).into_affine(),
            b: G2Projective::rand(&mut rng).into_affine(),
            c: G1Projective::rand(&mut rng).into_affine(),
        };

        // Serialize
        let mut bytes = Vec::new();
        original_proof
            .serialize_compressed(&mut bytes)
            .expect("Serialization failed");

        // Verify size constraint
        assert!(
            bytes.len() <= MAX_PROOF_SIZE,
            "Proof size {} exceeds MAX_PROOF_SIZE {}",
            bytes.len(),
            MAX_PROOF_SIZE
        );

        // Deserialize
        let deserialized_proof =
            Proof::<Bn254>::deserialize_compressed(&bytes[..]).expect("Deserialization failed");

        // Verify equality
        assert_eq!(original_proof.a, deserialized_proof.a);
        assert_eq!(original_proof.b, deserialized_proof.b);
        assert_eq!(original_proof.c, deserialized_proof.c);
    }

    #[test]
    fn test_public_inputs_serialization() {
        let mut rng = ark_std::test_rng();

        // Generate random field elements
        let inputs = vec![
            Fr::rand(&mut rng),
            Fr::rand(&mut rng),
            Fr::rand(&mut rng),
        ];

        // Serialize
        let mut bytes = Vec::new();
        for input in &inputs {
            input.serialize_compressed(&mut bytes).unwrap();
        }

        // Deserialize
        let deserialized = deserialize_public_inputs(&bytes).unwrap();

        // Verify
        assert_eq!(inputs, deserialized);
    }

    #[test]
    fn test_public_inputs_invalid_size() {
        // Not multiple of 32
        let bytes = vec![0u8; 31];
        assert_eq!(
            deserialize_public_inputs(&bytes),
            Err(Error::InvalidPublicInputs)
        );

        // Not multiple of 32 (larger)
        let bytes = vec![0u8; 65];
        assert_eq!(
            deserialize_public_inputs(&bytes),
            Err(Error::InvalidPublicInputs)
        );
    }

    #[test]
    fn test_public_inputs_too_many() {
        // Exceeds MAX_PUBLIC_INPUTS
        let bytes = vec![0u8; (MAX_PUBLIC_INPUTS + 1) * 32];
        assert_eq!(
            deserialize_public_inputs(&bytes),
            Err(Error::InvalidInputSize)
        );
    }

    #[test]
    fn test_public_inputs_empty() {
        // Empty inputs should be valid
        let bytes = vec![];
        let result = deserialize_public_inputs(&bytes).unwrap();
        assert_eq!(result.len(), 0);
    }

    #[test]
    fn test_public_inputs_max_allowed() {
        // Exactly MAX_PUBLIC_INPUTS should work
        let bytes = vec![0u8; MAX_PUBLIC_INPUTS * 32];

        // This will fail deserialization because bytes are invalid,
        // but it should pass the size check
        match deserialize_public_inputs(&bytes) {
            Err(Error::InvalidPublicInputs) => {
                // Expected: invalid field elements
            }
            Err(Error::InvalidInputSize) => {
                panic!("Should not fail size check");
            }
            Ok(_) => {
                // Also acceptable if zeros are valid
            }
            _ => {
                panic!("Unexpected error variant");
            }
        }
    }

    #[test]
    fn test_verification_key_structure() {
        let mut rng = ark_std::test_rng();

        // Create a minimal verification key
        let vk: VerifyingKey<Bn254> = VerifyingKey {
            alpha_g1: G1Projective::rand(&mut rng).into_affine(),
            beta_g2: G2Projective::rand(&mut rng).into_affine(),
            gamma_g2: G2Projective::rand(&mut rng).into_affine(),
            delta_g2: G2Projective::rand(&mut rng).into_affine(),
            gamma_abc_g1: vec![
                G1Projective::rand(&mut rng).into_affine(),
                G1Projective::rand(&mut rng).into_affine(),
            ],
        };

        // Serialize VK
        let mut bytes = Vec::new();
        vk.serialize_compressed(&mut bytes).unwrap();

        // Verify size constraint
        assert!(
            bytes.len() <= MAX_VK_SIZE,
            "VK size {} exceeds MAX_VK_SIZE {}",
            bytes.len(),
            MAX_VK_SIZE
        );

        // Deserialize
        let deserialized_vk =
            VerifyingKey::<Bn254>::deserialize_compressed(&bytes[..]).unwrap();

        // Verify structure
        assert_eq!(vk.alpha_g1, deserialized_vk.alpha_g1);
        assert_eq!(vk.beta_g2, deserialized_vk.beta_g2);
        assert_eq!(vk.gamma_abc_g1.len(), deserialized_vk.gamma_abc_g1.len());
    }

    #[test]
    fn test_pairing_basic() {
        let mut rng = ark_std::test_rng();

        // Test that pairing works
        let g1 = G1Projective::rand(&mut rng).into_affine();
        let g2 = G2Projective::rand(&mut rng).into_affine();

        // Compute pairing
        let result = Bn254::pairing(g1, g2);

        // Result should not be identity (for random points)
        assert!(!result.is_zero());
    }

    #[test]
    fn test_pairing_bilinearity() {
        let mut rng = ark_std::test_rng();

        // Pick random points and scalars
        let g1 = G1Projective::rand(&mut rng);
        let g2 = G2Projective::rand(&mut rng);
        let a = Fr::rand(&mut rng);
        let b = Fr::rand(&mut rng);

        // Compute e(a*g1, b*g2)
        let left = Bn254::pairing((g1 * a).into_affine(), (g2 * b).into_affine());

        // Compute e(g1, g2)^(a*b)
        let base = Bn254::pairing(g1.into_affine(), g2.into_affine());
        let right = base * (a * b);

        // Should be equal (bilinearity)
        assert_eq!(left, right);
    }

    #[test]
    fn test_multi_pairing() {
        let mut rng = ark_std::test_rng();

        // Generate random points
        let g1_points = [
            G1Projective::rand(&mut rng).into_affine(),
            G1Projective::rand(&mut rng).into_affine(),
        ];
        let g2_points = [
            G2Projective::rand(&mut rng).into_affine(),
            G2Projective::rand(&mut rng).into_affine(),
        ];

        // Compute multi-pairing: e(g1[0], g2[0]) * e(g1[1], g2[1])
        let multi = Bn254::multi_pairing(g1_points, g2_points);

        // Compute individual pairings and multiply
        let p1 = Bn254::pairing(g1_points[0], g2_points[0]);
        let p2 = Bn254::pairing(g1_points[1], g2_points[1]);
        let individual = p1 + p2;

        // Should be equal
        assert_eq!(multi, individual);
    }

    #[test]
    fn test_curve_point_arithmetic() {
        let mut rng = ark_std::test_rng();

        // Test G1 point addition
        let p1 = G1Projective::rand(&mut rng);
        let p2 = G1Projective::rand(&mut rng);
        let sum = p1 + p2;

        // Sum should be on curve
        assert!(sum.into_affine().is_on_curve());
        assert!(sum.into_affine().is_in_correct_subgroup_assuming_on_curve());

        // Test scalar multiplication
        let scalar = Fr::rand(&mut rng);
        let product = p1 * scalar;

        assert!(product.into_affine().is_on_curve());
        assert!(product
            .into_affine()
            .is_in_correct_subgroup_assuming_on_curve());
    }
}
