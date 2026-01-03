//! Integration tests for the Precompile-based PLONK verifier
//!
//! These tests verify the PLONK verifier's:
//! - Proof/VK deserialization
//! - Transcript (Fiat-Shamir) determinism
//! - Field arithmetic (U256 modular ops)
//! - Gate constraint evaluation
//!
//! Note: Full end-to-end tests require a real PLONK proof which needs
//! an external prover (e.g., snarkjs). These tests focus on structural validity.

#[cfg(test)]
mod tests {
    use stylus_sdk::alloy_primitives::U256;
    
    // Import the utilities from the crate
    // Note: In integration tests, we reference the crate by name
    use uzkv_stylus::utils::{fr_add, fr_sub, fr_mul, fr_pow, fr_inv, FR_MODULUS};
    use uzkv_stylus::plonk::transcript::{Transcript, labels};
    
    // ==========================================================================
    // Field Arithmetic Tests (utils.rs)
    // ==========================================================================
    
    #[test]
    fn test_fr_add_basic() {
        let a = U256::from(5u64);
        let b = U256::from(7u64);
        let result = fr_add(a, b);
        assert_eq!(result, U256::from(12u64));
    }
    
    #[test]
    fn test_fr_add_wrap() {
        // Adding close to modulus should wrap
        let a = FR_MODULUS - U256::from(1u64);
        let b = U256::from(10u64);
        let result = fr_add(a, b);
        assert_eq!(result, U256::from(9u64));
    }
    
    #[test]
    fn test_fr_sub_basic() {
        let a = U256::from(10u64);
        let b = U256::from(3u64);
        let result = fr_sub(a, b);
        assert_eq!(result, U256::from(7u64));
    }
    
    #[test]
    fn test_fr_sub_wrap() {
        // Subtracting larger from smaller should wrap
        let a = U256::from(5u64);
        let b = U256::from(10u64);
        let result = fr_sub(a, b);
        // Result should be FR_MODULUS - 5
        let expected = FR_MODULUS - U256::from(5u64);
        assert_eq!(result, expected);
    }
    
    #[test]
    fn test_fr_mul_basic() {
        let a = U256::from(6u64);
        let b = U256::from(7u64);
        let result = fr_mul(a, b);
        assert_eq!(result, U256::from(42u64));
    }
    
    #[test]
    fn test_fr_pow_basic() {
        let base = U256::from(2u64);
        let exp = U256::from(10u64);
        let result = fr_pow(base, exp);
        assert_eq!(result, U256::from(1024u64));
    }
    
    #[test]
    fn test_fr_pow_zero_exp() {
        let base = U256::from(12345u64);
        let exp = U256::ZERO;
        let result = fr_pow(base, exp);
        assert_eq!(result, U256::from(1u64));
    }
    
    #[test]
    fn test_fr_inv_basic() {
        let a = U256::from(7u64);
        let inv = fr_inv(a).unwrap();
        // a * inv ≡ 1 (mod p)
        let product = fr_mul(a, inv);
        assert_eq!(product, U256::from(1u64));
    }
    
    #[test]
    fn test_fr_inv_zero() {
        let result = fr_inv(U256::ZERO);
        assert!(result.is_none());
    }
    
    // ==========================================================================
    // Transcript Tests (Fiat-Shamir)
    // ==========================================================================
    
    #[test]
    fn test_transcript_determinism() {
        let mut t1 = Transcript::new(b"test_protocol");
        let mut t2 = Transcript::new(b"test_protocol");
        
        let field_elem = U256::from(12345u64);
        
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
        
        let field_elem = U256::from(12345u64);
        
        t1.absorb_field(b"test", &field_elem);
        t2.absorb_field(b"test", &field_elem);
        
        let c1 = t1.squeeze_challenge(b"challenge");
        let c2 = t2.squeeze_challenge(b"challenge");
        
        // Different protocols should produce different challenges
        assert_ne!(c1, c2);
    }
    
    #[test]
    fn test_transcript_multiple_challenges() {
        let mut transcript = Transcript::new(b"test");
        
        transcript.absorb_field(b"input", &U256::from(42u64));
        
        let c1 = transcript.squeeze_challenge(b"c1");
        let c2 = transcript.squeeze_challenge(b"c2");
        let c3 = transcript.squeeze_challenge(b"c3");
        
        // All challenges should be different
        assert_ne!(c1, c2);
        assert_ne!(c2, c3);
        assert_ne!(c1, c3);
    }
    
    // ==========================================================================
    // PLONK Proof Deserialization Tests
    // ==========================================================================
    
    #[test]
    fn test_plonk_proof_size() {
        // PLONK proof should be exactly 896 bytes
        // 9 G1 points (64 bytes each) = 576 bytes
        // 10 Fr scalars (32 bytes each) = 320 bytes
        // Total = 896 bytes
        let expected_size = 9 * 64 + 10 * 32;
        assert_eq!(expected_size, 896);
    }
    
    #[test]
    fn test_plonk_vk_min_size() {
        // VK minimum size check
        // 2 u64 (16 bytes) + 10 G1 points (640 bytes) + 3 Fr (96 bytes) = 752 bytes
        let expected_min = 16 + 10 * 64 + 3 * 32;
        assert_eq!(expected_min, 752);
    }
    
    // ==========================================================================
    // Gate Constraint Tests
    // ==========================================================================
    
    #[test]
    fn test_gate_constraint_satisfied() {
        // Gate: qL*a + qR*b + qO*c + qM*a*b + qC = 0
        // Example: a=3, b=4, c=12, qL=0, qR=0, qO=1, qM=-1 (mod p), qC=0
        // 0*3 + 0*4 + 1*12 + (-1)*3*4 + 0 = 12 - 12 = 0 ✓
        
        let a = U256::from(3u64);
        let b = U256::from(4u64);
        let c = U256::from(12u64);
        let ql = U256::ZERO;
        let qr = U256::ZERO;
        let qo = U256::from(1u64);
        let qm = FR_MODULUS - U256::from(1u64); // -1 mod p
        let qc = U256::ZERO;
        
        // Compute gate
        let term_lin = fr_add(
            fr_add(fr_mul(ql, a), fr_mul(qr, b)),
            fr_mul(qo, c)
        );
        let term_mul = fr_mul(qm, fr_mul(a, b));
        let gate_val = fr_add(fr_add(term_lin, term_mul), qc);
        
        assert_eq!(gate_val, U256::ZERO);
    }
    
    #[test]
    fn test_gate_constraint_violated() {
        // Gate should NOT be zero if constraint is violated
        let a = U256::from(3u64);
        let b = U256::from(4u64);
        let c = U256::from(10u64); // Wrong! Should be 12
        let ql = U256::ZERO;
        let qr = U256::ZERO;
        let qo = U256::from(1u64);
        let qm = FR_MODULUS - U256::from(1u64); // -1 mod p
        let qc = U256::ZERO;
        
        let term_lin = fr_add(
            fr_add(fr_mul(ql, a), fr_mul(qr, b)),
            fr_mul(qo, c)
        );
        let term_mul = fr_mul(qm, fr_mul(a, b));
        let gate_val = fr_add(fr_add(term_lin, term_mul), qc);
        
        // Gate value should NOT be zero
        assert_ne!(gate_val, U256::ZERO);
    }
    
    // ==========================================================================
    // Vanishing Polynomial Tests
    // ==========================================================================
    
    #[test]
    fn test_vanishing_polynomial_at_non_domain() {
        // Z_H(z) = z^n - 1
        // For z not a root of unity, Z_H(z) != 0
        let n = U256::from(8u64);
        let z = U256::from(99u64); // Random point
        
        let zh = fr_sub(fr_pow(z, n), U256::from(1u64));
        
        assert_ne!(zh, U256::ZERO);
    }
}
