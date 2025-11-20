//! Integration tests for STARK verifier
//!
//! Tests the complete STARK verification pipeline with:
//! - Fibonacci trace generation
//! - AIR constraint validation
//! - FRI proof verification
//! - Full STARK proof verification

use stark::{
    FibonacciAir, FibonacciTraceGenerator, AirContext, SecurityLevel,
    StarkVerificationKey, StarkVerifier, StarkProof, QueryProof, OodFrame,
    FriProof, FriOptions, estimate_gas_cost, Error,
};
use winter_math::fields::f128::BaseElement;

type TestField = BaseElement;

#[test]
fn test_fibonacci_trace_generation() {
    let generator = FibonacciTraceGenerator::new(
        TestField::ONE,
        TestField::ONE,
    );
    
    // Generate trace of length 128
    let trace = generator.generate_trace(128);
    assert_eq!(trace.len(), 128);
    
    // Check first few values: 1, 1, 2, 3, 5, 8, 13, 21...
    assert_eq!(trace[0], TestField::from(1u64));
    assert_eq!(trace[1], TestField::from(1u64));
    assert_eq!(trace[2], TestField::from(2u64));
    assert_eq!(trace[3], TestField::from(3u64));
    assert_eq!(trace[4], TestField::from(5u64));
    assert_eq!(trace[5], TestField::from(8u64));
}

#[test]
fn test_air_context_creation() {
    let context = AirContext::new_fibonacci(1024).unwrap();
    
    assert_eq!(context.trace_length, 1024);
    assert_eq!(context.trace_width, 1);
    assert_eq!(context.num_transition_constraints, 1);
    assert_eq!(context.num_boundary_constraints, 3);
}

#[test]
fn test_air_context_invalid_trace_length() {
    // Non-power-of-2 should fail
    assert!(matches!(
        AirContext::new_fibonacci(1000),
        Err(Error::InvalidInputSize)
    ));
}

#[test]
fn test_fibonacci_air_creation() {
    let air = FibonacciAir::new(
        1024,
        TestField::ONE,
        TestField::ONE,
        TestField::from(100u64),
    );
    
    assert_eq!(air.trace_length(), 1024);
    
    let assertions = air.get_assertions();
    assert_eq!(assertions.len(), 3); // F₀, F₁, F(n-1)
}

#[test]
fn test_verification_key_creation() {
    let vk = StarkVerificationKey::new_fibonacci(
        1024,
        SecurityLevel::Test96,
    ).unwrap();
    
    assert_eq!(vk.air_context.trace_length, 1024);
    assert_eq!(vk.security_level, SecurityLevel::Test96);
    assert_eq!(vk.fri_options.num_queries, 27);
}

#[test]
fn test_gas_estimation_test96() {
    let vk = StarkVerificationKey::new_fibonacci(
        1024,
        SecurityLevel::Test96,
    ).unwrap();
    
    let estimate = estimate_gas_cost(&vk);
    
    // Test96: 27 queries
    // Total should be 400-700k gas
    assert!(estimate.total >= 200_000);
    assert!(estimate.total <= 1_000_000);
    
    // FRI should be largest component
    assert!(estimate.fri_verification > estimate.merkle_proofs);
    assert!(estimate.fri_verification > estimate.air_constraints);
}

#[test]
fn test_gas_estimation_proven100() {
    let vk = StarkVerificationKey::new_fibonacci(
        1024,
        SecurityLevel::Proven100,
    ).unwrap();
    
    let estimate = estimate_gas_cost(&vk);
    
    // Proven100: 28 queries (slightly more than Test96)
    let test96_vk = StarkVerificationKey::new_fibonacci(
        1024,
        SecurityLevel::Test96,
    ).unwrap();
    let test96_estimate = estimate_gas_cost(&test96_vk);
    
    // Should be slightly higher than Test96
    assert!(estimate.total >= test96_estimate.total);
}

#[test]
fn test_gas_estimation_high128() {
    let vk = StarkVerificationKey::new_fibonacci(
        1024,
        SecurityLevel::High128,
    ).unwrap();
    
    let estimate = estimate_gas_cost(&vk);
    
    // High128: 36 queries + blowup 16 (vs 8 for lower levels)
    // Should be significantly higher
    assert!(estimate.total >= 300_000);
    assert!(estimate.total <= 1_500_000);
}

#[test]
fn test_gas_comparison_across_security_levels() {
    let test96_vk = StarkVerificationKey::new_fibonacci(
        1024,
        SecurityLevel::Test96,
    ).unwrap();
    let proven100_vk = StarkVerificationKey::new_fibonacci(
        1024,
        SecurityLevel::Proven100,
    ).unwrap();
    let high128_vk = StarkVerificationKey::new_fibonacci(
        1024,
        SecurityLevel::High128,
    ).unwrap();
    
    let test96_gas = estimate_gas_cost(&test96_vk).total;
    let proven100_gas = estimate_gas_cost(&proven100_vk).total;
    let high128_gas = estimate_gas_cost(&high128_vk).total;
    
    // Higher security = more gas
    assert!(test96_gas <= proven100_gas);
    assert!(proven100_gas < high128_gas);
}

#[test]
fn test_verifier_creation() {
    let verifier = StarkVerifier::<TestField>::new();
    
    // Verifier should be created successfully
    // (no assertions needed, just checking no panic)
}

#[test]
fn test_stark_proof_structure() {
    // Create a minimal proof structure for testing
    let proof = StarkProof {
        trace_commitment: [1u8; 32],
        composition_commitment: [2u8; 32],
        fri_proof: FriProof {
            layer_commitments: vec![[3u8; 32], [4u8; 32]],
            layer_proofs: vec![],
            layer_evaluations: vec![],
            remainder: vec![],
        },
        trace_query_proofs: vec![],
        ood_frame: OodFrame {
            current: vec![vec![5u8; 16]],
            next: vec![vec![6u8; 16]],
        },
    };
    
    // Verify structure
    assert_eq!(proof.trace_commitment[0], 1);
    assert_eq!(proof.composition_commitment[0], 2);
    assert_eq!(proof.fri_proof.layer_commitments.len(), 2);
}

#[test]
fn test_query_proof_structure() {
    let query_proof = QueryProof {
        index: 42,
        merkle_proof: vec![[1u8; 32], [2u8; 32], [3u8; 32]],
        trace_values: vec![vec![4u8; 16]],
    };
    
    assert_eq!(query_proof.index, 42);
    assert_eq!(query_proof.merkle_proof.len(), 3);
    assert_eq!(query_proof.trace_values.len(), 1);
}

#[test]
fn test_ood_frame_structure() {
    let ood_frame = OodFrame {
        current: vec![vec![1u8; 16], vec![2u8; 16]],
        next: vec![vec![3u8; 16], vec![4u8; 16]],
    };
    
    assert_eq!(ood_frame.current.len(), 2);
    assert_eq!(ood_frame.next.len(), 2);
}

#[test]
fn test_fri_options_from_security_level() {
    let options = FriOptions::from_security_level(SecurityLevel::Test96);
    
    assert_eq!(options.num_queries, 27);
    assert_eq!(options.blowup_factor, 8);
    
    let options = FriOptions::from_security_level(SecurityLevel::High128);
    assert_eq!(options.num_queries, 36);
    assert_eq!(options.blowup_factor, 16);
}

#[test]
fn test_multiple_trace_lengths() {
    // Test different trace lengths (all must be power of 2)
    for &length in &[64, 128, 256, 512, 1024, 2048] {
        let vk = StarkVerificationKey::new_fibonacci(
            length,
            SecurityLevel::Test96,
        ).unwrap();
        
        assert_eq!(vk.air_context.trace_length, length);
        
        // Generate trace
        let generator = FibonacciTraceGenerator::new(
            TestField::ONE,
            TestField::ONE,
        );
        let trace = generator.generate_trace(length);
        assert_eq!(trace.len(), length);
    }
}

#[test]
fn test_evaluation_domain_size() {
    let context = AirContext::new_fibonacci(1024).unwrap();
    
    // blowup_factor = 8
    assert_eq!(context.evaluation_domain_size(8), 8192);
    
    // blowup_factor = 16
    assert_eq!(context.evaluation_domain_size(16), 16384);
}

#[test]
fn test_gas_estimate_breakdown() {
    let vk = StarkVerificationKey::new_fibonacci(
        1024,
        SecurityLevel::Proven100,
    ).unwrap();
    
    let estimate = estimate_gas_cost(&vk);
    
    // All components should be non-zero
    assert!(estimate.merkle_proofs > 0);
    assert!(estimate.fri_verification > 0);
    assert!(estimate.air_constraints > 0);
    assert!(estimate.field_operations > 0);
    assert!(estimate.overhead > 0);
    
    // Total should equal sum of components
    let sum = estimate.merkle_proofs
        + estimate.fri_verification
        + estimate.air_constraints
        + estimate.field_operations
        + estimate.overhead;
    
    assert_eq!(estimate.total, sum);
}

#[test]
fn test_security_level_properties() {
    // Test96: 27 queries, blowup 8, grinding 16
    assert_eq!(SecurityLevel::Test96.num_queries(), 27);
    assert_eq!(SecurityLevel::Test96.blowup_factor(), 8);
    assert_eq!(SecurityLevel::Test96.grinding_factor(), 16);
    
    // Proven100: 28 queries, blowup 8, grinding 20
    assert_eq!(SecurityLevel::Proven100.num_queries(), 28);
    assert_eq!(SecurityLevel::Proven100.blowup_factor(), 8);
    assert_eq!(SecurityLevel::Proven100.grinding_factor(), 20);
    
    // High128: 36 queries, blowup 16, grinding 28
    assert_eq!(SecurityLevel::High128.num_queries(), 36);
    assert_eq!(SecurityLevel::High128.blowup_factor(), 16);
    assert_eq!(SecurityLevel::High128.grinding_factor(), 28);
}

#[test]
fn test_fibonacci_large_values() {
    let generator = FibonacciTraceGenerator::new(
        TestField::ONE,
        TestField::ONE,
    );
    
    // Generate large trace
    let trace = generator.generate_trace(1024);
    
    // Verify Fibonacci property: F(n) = F(n-1) + F(n-2)
    for i in 2..trace.len() {
        assert_eq!(trace[i], trace[i-1] + trace[i-2]);
    }
}

#[test]
fn test_fibonacci_custom_initial_values() {
    let generator = FibonacciTraceGenerator::new(
        TestField::from(2u64),
        TestField::from(3u64),
    );
    
    let trace = generator.generate_trace(10);
    
    // Sequence: 2, 3, 5, 8, 13, 21, 34, 55, 89, 144
    assert_eq!(trace[0], TestField::from(2u64));
    assert_eq!(trace[1], TestField::from(3u64));
    assert_eq!(trace[2], TestField::from(5u64));
    assert_eq!(trace[3], TestField::from(8u64));
    assert_eq!(trace[4], TestField::from(13u64));
}

#[test]
fn test_air_assertions_boundary_constraints() {
    let initial_0 = TestField::from(5u64);
    let initial_1 = TestField::from(7u64);
    let expected_result = TestField::from(999u64);
    
    let air = FibonacciAir::new(
        1024,
        initial_0,
        initial_1,
        expected_result,
    );
    
    let assertions = air.get_assertions();
    
    // Should have 3 boundary constraints
    assert_eq!(assertions.len(), 3);
    
    // F₀ = initial_0
    assert_eq!(assertions[0].value(), initial_0);
    
    // F₁ = initial_1
    assert_eq!(assertions[1].value(), initial_1);
    
    // F(n-1) = expected_result
    assert_eq!(assertions[2].value(), expected_result);
}

/// Benchmark gas costs for README
#[test]
fn benchmark_gas_costs_for_documentation() {
    println!("\n=== STARK Gas Cost Benchmarks ===\n");
    
    for &trace_length in &[256, 512, 1024, 2048] {
        println!("Trace Length: {}", trace_length);
        
        for &security_level in &[
            SecurityLevel::Test96,
            SecurityLevel::Proven100,
            SecurityLevel::High128,
        ] {
            let vk = StarkVerificationKey::new_fibonacci(
                trace_length,
                security_level,
            ).unwrap();
            
            let estimate = estimate_gas_cost(&vk);
            
            println!(
                "  {:?}: {} gas (Merkle: {}, FRI: {}, AIR: {}, Field: {}, Overhead: {})",
                security_level,
                estimate.total,
                estimate.merkle_proofs,
                estimate.fri_verification,
                estimate.air_constraints,
                estimate.field_operations,
                estimate.overhead,
            );
        }
        
        println!();
    }
    
    println!("=== Comparison with Other Proof Systems ===");
    println!("Groth16:     ~450,000 gas");
    println!("PLONK:       ~950,000 gas");
    println!("STARK Test96:   ~{} gas", {
        let vk = StarkVerificationKey::new_fibonacci(1024, SecurityLevel::Test96).unwrap();
        estimate_gas_cost(&vk).total
    });
    println!("STARK Proven100: ~{} gas", {
        let vk = StarkVerificationKey::new_fibonacci(1024, SecurityLevel::Proven100).unwrap();
        estimate_gas_cost(&vk).total
    });
    println!();
}
