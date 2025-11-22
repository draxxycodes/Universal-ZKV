//! Fibonacci sequence computation and proof generation
//!
//! Proves: F(n+2) = F(n+1) + F(n)

use alloc::vec::Vec;
use alloc::vec;
use super::types::{Error, Result};

/// Fibonacci execution trace
#[derive(Debug, Clone)]
pub struct FibonacciTrace {
    /// Sequence values: [F₀, F₁, F₂, ..., Fₙ]
    pub values: Vec<u64>,
}

impl FibonacciTrace {
    /// Generate Fibonacci trace
    pub fn generate(length: usize) -> Result<Self> {
        if !length.is_power_of_two() {
            return Err(Error::InvalidInputSize);
        }
        
        let mut values = Vec::with_capacity(length);
        
        // Initial values
        values.push(1u64);
        if length > 1 {
            values.push(1u64);
        }
        
        // Generate sequence
        for i in 2..length {
            let next = values[i - 1].wrapping_add(values[i - 2]);
            values.push(next);
        }
        
        Ok(FibonacciTrace { values })
    }
    
    /// Verify constraint at position i: F(i+2) = F(i+1) + F(i)
    pub fn verify_constraint(&self, i: usize) -> bool {
        if i + 2 >= self.values.len() {
            return false;
        }
        
        let expected = self.values[i].wrapping_add(self.values[i + 1]);
        self.values[i + 2] == expected
    }
    
    /// Compute hash of trace (Merkle root)
    pub fn compute_commitment(&self) -> [u8; 32] {
        use blake3::Hasher;
        
        let mut hasher = Hasher::new();
        hasher.update(b"fibonacci_trace");
        
        for &value in &self.values {
            hasher.update(&value.to_le_bytes());
        }
        
        *hasher.finalize().as_bytes()
    }
}

/// Simplified Fibonacci STARK proof
#[derive(Debug, Clone)]
pub struct FibonacciProof {
    /// Commitment to execution trace
    pub trace_commitment: [u8; 32],
    
    /// Sampled trace values (for random queries)
    pub query_values: Vec<(usize, u64)>,
     
    /// Merkle proofs for queries
    pub merkle_proofs: Vec<Vec<[u8; 32]>>,
    
    /// Expected result F(n-1)
    pub expected_result: u64,
}

impl FibonacciProof {
    /// Generate proof from trace
    pub fn generate(trace: &FibonacciTrace, num_queries: usize) -> Self {
        let trace_commitment = trace.compute_commitment();
        
        // Sample random positions (deterministic from commitment)
        let query_positions = Self::sample_positions(
            &trace_commitment,
            trace.values.len(),
            num_queries,
        );
        
        // Collect query values
        let query_values: Vec<(usize, u64)> = query_positions
            .iter()
            .map(|&pos| (pos, trace.values[pos]))
            .collect();
        
        // Generate Merkle proofs (simplified - real impl would use full Merkle tree)
        let merkle_proofs = vec![vec![]; num_queries];
        
        FibonacciProof {
            trace_commitment,
            query_values,
            merkle_proofs,
            expected_result: *trace.values.last().unwrap_or(&0),
        }
    }
    
    /// Sample random positions deterministically
    fn sample_positions(seed: &[u8; 32], domain_size: usize, count: usize) -> Vec<usize> {
        use blake3::Hasher;
        
        let mut positions = Vec::with_capacity(count);
        
        for i in 0..count {
            let mut hasher = Hasher::new();
            hasher.update(b"query_position");
            hasher.update(seed);
            hasher.update(&i.to_le_bytes());
            
            let hash = hasher.finalize();
            let bytes = hash.as_bytes();
            
            let mut pos_bytes = [0u8; 8];
            pos_bytes.copy_from_slice(&bytes[0..8]);
            let pos = (u64::from_le_bytes(pos_bytes) as usize) % domain_size;
            
            positions.push(pos);
        }
        
        positions
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    
    #[test]
    fn test_fibonacci_generation() {
        let trace = FibonacciTrace::generate(16).unwrap();
        
        // Check first few values: 1, 1, 2, 3, 5, 8, 13, 21
        assert_eq!(trace.values[0], 1);
        assert_eq!(trace.values[1], 1);
        assert_eq!(trace.values[2], 2);
        assert_eq!(trace.values[3], 3);
        assert_eq!(trace.values[4], 5);
        assert_eq!(trace.values[5], 8);
    }
    
    #[test]
    fn test_constraint_verification() {
        let trace = FibonacciTrace::generate(16).unwrap();
        
        // All constraints should be satisfied
        for i in 0..trace.values.len() - 2 {
            assert!(trace.verify_constraint(i));
        }
    }
    
    #[test]
    fn test_proof_generation() {
        let trace = FibonacciTrace::generate(64).unwrap();
        let proof = FibonacciProof::generate(&trace, 27);
        
        assert_eq!(proof.query_values.len(), 27);
        assert_eq!(proof.trace_commitment.len(), 32);
    }
}
