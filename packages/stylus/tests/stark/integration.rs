//! Comprehensive integration tests for STARK verifier

use stark_simple::{
    FibonacciTrace, FibonacciProof, StarkVerifier,
    SecurityLevel, estimate_gas_cost,
};

#[test]
fn test_end_to_end_verification() {
    // Generate Fibonacci trace
    let trace = FibonacciTrace::generate(64).expect("Failed to generate trace");
    
    // Generate proof
    let proof = FibonacciProof::generate(&trace, 27);
    
    // Verify proof
    let verifier = StarkVerifier::new(SecurityLevel::Test96);
    let result = verifier.verify(&proof, 64, [1, 1]);
    
    assert!(result.is_ok(), "Verification should succeed");
}

#[test]
fn test_multiple_trace_lengths() {
    for &length in &[64, 128, 256, 512] {
        let trace = FibonacciTrace::generate(length)
            .expect(&format!("Failed to generate trace of length {}", length));
        
        let proof = FibonacciProof::generate(&trace, 27);
        let verifier = StarkVerifier::new(SecurityLevel::Test96);
        
        let result = verifier.verify(&proof, length, [1, 1]);
        assert!(result.is_ok(), "Verification failed for length {}", length);
    }
}

#[test]
fn test_all_security_levels() {
    let trace = FibonacciTrace::generate(128).unwrap();
    
    for &level in &[SecurityLevel::Test96, SecurityLevel::Proven100, SecurityLevel::High128] {
        let num_queries = level.num_queries();
        let proof = FibonacciProof::generate(&trace, num_queries);
        
        let verifier = StarkVerifier::new(level);
        let result = verifier.verify(&proof, 128, [1, 1]);
        
        assert!(result.is_ok(), "Verification failed for {:?}", level);
    }
}

#[test]
fn test_gas_estimation_accuracy() {
    let test96 = estimate_gas_cost(SecurityLevel::Test96);
    let proven100 = estimate_gas_cost(SecurityLevel::Proven100);
    let high128 = estimate_gas_cost(SecurityLevel::High128);
    
    // Test96: 27 queries * 7k/query + overhead = ~239k
    assert!(test96.total >= 200_000 && test96.total <= 300_000,
        "Test96 gas estimate out of range: {}", test96.total);
    
    // Proven100: 28 queries * 7k/query + overhead = ~246k
    assert!(proven100.total >= 200_000 && proven100.total <= 300_000,
        "Proven100 gas estimate out of range: {}", proven100.total);
    
    // High128: 36 queries * 7k/query + overhead = ~352k
    assert!(high128.total >= 300_000 && high128.total <= 400_000,
        "High128 gas estimate out of range: {}", high128.total);
    
    // Higher security should cost more gas
    assert!(test96.total < high128.total,
        "High128 should cost more than Test96");
}

#[test]
fn test_100_proofs_batch() {
    let verifier = StarkVerifier::new(SecurityLevel::Test96);
    
    for i in 0..100 {
        let length = if i % 2 == 0 { 64 } else { 128 };
        
        let trace = FibonacciTrace::generate(length)
            .expect(&format!("Failed on iteration {}", i));
        
        let proof = FibonacciProof::generate(&trace, 27);
        let result = verifier.verify(&proof, length, [1, 1]);
        
        assert!(result.is_ok(), "Proof {} verification failed", i);
    }
}

#[test]
fn test_constraint_validation() {
    let trace = FibonacciTrace::generate(64).unwrap();
    
    // All constraints should be satisfied
    for i in 0..62 { // 64 - 2 = 62 constraints
        assert!(trace.verify_constraint(i),
            "Constraint {} should be satisfied", i);
    }
}

#[test]
fn test_gas_breakdown_proportions() {
    let estimate = estimate_gas_cost(SecurityLevel::Proven100);
    
    // Merkle proofs should be largest component (28 queries * 5k = 140k)
    assert!(estimate.merkle_proofs > estimate.constraint_checks,
        "Merkle proofs should dominate gas cost");
    
    // Total should equal sum
    let sum = estimate.merkle_proofs 
        + estimate.constraint_checks
        + estimate.field_operations
        + estimate.overhead;
    
    assert_eq!(estimate.total, sum, "Gas components should sum to total");
}

#[test]
fn test_comparison_with_other_systems() {
    // Expected gas costs (from project requirements)
    const GROTH16_GAS: usize = 450_000;
    const PLONK_GAS: usize = 950_000;
    
    let test96 = estimate_gas_cost(SecurityLevel::Test96);
    let proven100 = estimate_gas_cost(SecurityLevel::Proven100);
    
    // STARK should be competitive with Groth16
    assert!(test96.total < GROTH16_GAS * 2,
        "STARK Test96 ({}) should be reasonably close to Groth16 ({})",
        test96.total, GROTH16_GAS);
    
    // STARK should be better than PLONK
    assert!(proven100.total < PLONK_GAS,
        "STARK Proven100 ({}) should be cheaper than PLONK ({})",
        proven100.total, PLONK_GAS);
}
