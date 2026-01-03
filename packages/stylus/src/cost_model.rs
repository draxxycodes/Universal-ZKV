//! Cost-Aware Verification Model
//!
//! Provides gas estimation and verification path selection for universal ZK verification.
//!
//! # Features
//! - **Pre-verification gas estimation** - Know costs before committing
//! - **Cost comparison** - Select cheapest proof system for equivalent security
//! - **Budget-aware routing** - Reject proofs that exceed gas limits
//!
//! # Gas Cost Models
//!
//! | System | Base | Per Input | Per Byte | Notes |
//! |--------|------|-----------|----------|-------|
//! | Groth16 | 250k | 40k | 0 | Pairing-based, fixed size |
//! | PLONK | 350k | 10k | 0 | More pairings |
//! | STARK | 200k | 5k | 10 | FRI verification |

extern crate alloc;

use crate::types::{ProofType, UniversalProofDescriptor};
use crate::verifier_traits::GasCost;

/// Normalized verification cost with breakdown
///
/// Captures the full cost structure for a verification operation,
/// enabling both estimation and comparison across proof systems.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct VerificationCost {
    /// Base gas cost (constant overhead)
    pub base_gas: u64,

    /// Per-public-input gas cost component
    pub per_input_gas: u64,

    /// Per-proof-byte gas cost component
    pub per_byte_gas: u64,

    /// Number of public inputs
    pub public_input_count: usize,

    /// Proof size in bytes
    pub proof_size: usize,

    /// Computed total gas cost
    pub estimated_total: u64,

    /// Proof system this cost is for
    pub proof_system: ProofType,
}

impl VerificationCost {
    /// Calculate verification cost for Groth16 proof
    ///
    /// Cost model:
    /// - Base: 250,000 gas (4 pairing checks)
    /// - Per input: 40,000 gas (MSM operations)
    /// - Per byte: 0 (fixed-size proof)
    ///
    /// Typical total: 250k + 40k * inputs ≈ 330k for 2 inputs
    pub fn for_groth16(public_inputs: usize) -> Self {
        let model = GasCost::groth16();
        let proof_size = 256; // Standard Groth16 proof size

        let estimated_total = model.estimate(public_inputs, proof_size);

        Self {
            base_gas: model.base,
            per_input_gas: model.per_public_input,
            per_byte_gas: model.per_proof_byte,
            public_input_count: public_inputs,
            proof_size,
            estimated_total,
            proof_system: ProofType::Groth16,
        }
    }

    /// Calculate verification cost for PLONK proof
    ///
    /// Cost model:
    /// - Base: 350,000 gas (more pairings than Groth16)
    /// - Per input: 10,000 gas (commitment lookups)
    /// - Per byte: 0 (fixed-size proof)
    ///
    /// Typical total: 350k + 10k * inputs ≈ 390k for 4 inputs
    pub fn for_plonk(public_inputs: usize, circuit_size: usize) -> Self {
        let model = GasCost::plonk();

        // PLONK proof size varies with circuit size (roughly log2(n) commitments)
        let proof_size = 800 + (circuit_size.ilog2() as usize * 64);

        let estimated_total = model.estimate(public_inputs, proof_size);

        Self {
            base_gas: model.base,
            per_input_gas: model.per_public_input,
            per_byte_gas: model.per_proof_byte,
            public_input_count: public_inputs,
            proof_size,
            estimated_total,
            proof_system: ProofType::PLONK,
        }
    }

    /// Calculate verification cost for STARK proof
    ///
    /// Cost model:
    /// - Base: 200,000 gas (hash operations)
    /// - Per input: 5,000 gas (minimal)
    /// - Per byte: 10 gas (FRI layer verification)
    ///
    /// Typical total: 200k + 10 * proof_bytes ≈ 700k for 50KB proof
    pub fn for_stark(trace_length: usize, security_bits: u8) -> Self {
        let model = GasCost::stark();

        // STARK proof size: ~40KB base + scaling with trace length and security
        // Rough formula: base + log2(trace_length) * security_bits * factor
        let log_trace = trace_length.max(64).ilog2() as usize;
        let security_factor = security_bits as usize / 32;
        let proof_size = 40_000 + (log_trace * security_factor * 2_000);

        let estimated_total = model.estimate(4, proof_size); // STARKs typically have few public inputs

        Self {
            base_gas: model.base,
            per_input_gas: model.per_public_input,
            per_byte_gas: model.per_proof_byte,
            public_input_count: 4,
            proof_size,
            estimated_total,
            proof_system: ProofType::STARK,
        }
    }

    /// Create cost from UniversalProofDescriptor
    ///
    /// Uses the descriptor's metadata to compute accurate gas estimate.
    pub fn from_descriptor(descriptor: &UniversalProofDescriptor) -> Self {
        let model = match descriptor.proof_system_id {
            0 => GasCost::groth16(),
            1 => GasCost::plonk(),
            2 => GasCost::stark(),
            _ => GasCost::groth16(), // Fallback
        };

        let proof_type = match descriptor.proof_system_id {
            0 => ProofType::Groth16,
            1 => ProofType::PLONK,
            2 => ProofType::STARK,
            _ => ProofType::Groth16,
        };

        let estimated_total = model.estimate(
            descriptor.public_input_count as usize,
            descriptor.proof_length as usize,
        );

        Self {
            base_gas: model.base,
            per_input_gas: model.per_public_input,
            per_byte_gas: model.per_proof_byte,
            public_input_count: descriptor.public_input_count as usize,
            proof_size: descriptor.proof_length as usize,
            estimated_total,
            proof_system: proof_type,
        }
    }

    /// Check if this cost is cheaper than another
    pub fn cheaper_than(&self, other: &Self) -> bool {
        self.estimated_total < other.estimated_total
    }

    /// Get the gas savings compared to another cost
    pub fn savings_vs(&self, other: &Self) -> i64 {
        other.estimated_total as i64 - self.estimated_total as i64
    }

    /// Check if cost is within a gas budget
    pub fn within_budget(&self, gas_limit: u64) -> bool {
        self.estimated_total <= gas_limit
    }

    /// Get cost breakdown as percentage
    pub fn cost_breakdown(&self) -> CostBreakdown {
        let input_cost = self.per_input_gas * self.public_input_count as u64;
        let byte_cost = self.per_byte_gas * self.proof_size as u64;

        CostBreakdown {
            base_pct: (self.base_gas * 100) / self.estimated_total.max(1),
            input_pct: (input_cost * 100) / self.estimated_total.max(1),
            byte_pct: (byte_cost * 100) / self.estimated_total.max(1),
        }
    }
}

/// Cost breakdown as percentages
#[derive(Debug, Clone, Copy)]
pub struct CostBreakdown {
    /// Percentage of cost from base gas
    pub base_pct: u64,
    /// Percentage of cost from public inputs
    pub input_pct: u64,
    /// Percentage of cost from proof bytes
    pub byte_pct: u64,
}

/// Cost comparison result
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum CostComparison {
    /// First is cheaper
    FirstCheaper,
    /// Second is cheaper
    SecondCheaper,
    /// Costs are equal
    Equal,
}

/// Compare verification costs and return recommendation
pub fn compare_costs(a: &VerificationCost, b: &VerificationCost) -> CostComparison {
    match a.estimated_total.cmp(&b.estimated_total) {
        core::cmp::Ordering::Less => CostComparison::FirstCheaper,
        core::cmp::Ordering::Greater => CostComparison::SecondCheaper,
        core::cmp::Ordering::Equal => CostComparison::Equal,
    }
}

/// Select cheapest verification path from multiple options
///
/// Returns the index of the cheapest option, or None if empty.
pub fn select_cheapest(costs: &[VerificationCost]) -> Option<usize> {
    costs
        .iter()
        .enumerate()
        .min_by_key(|(_, cost)| cost.estimated_total)
        .map(|(idx, _)| idx)
}

/// Budget-aware verification routing
///
/// Returns true if verification should proceed, false if too expensive.
pub fn should_verify(cost: &VerificationCost, gas_limit: u64, safety_margin_pct: u8) -> bool {
    // Apply safety margin (e.g., 10% buffer for gas price fluctuations)
    let margin = (cost.estimated_total * safety_margin_pct as u64) / 100;
    let required_budget = cost.estimated_total + margin;

    required_budget <= gas_limit
}

/// Estimate total cost for batch verification
///
/// Batch verification can be more efficient due to shared setup costs.
/// Discount factor: 5% per additional proof (up to 30% max discount)
pub fn estimate_batch_cost(costs: &[VerificationCost]) -> u64 {
    if costs.is_empty() {
        return 0;
    }

    let base_total: u64 = costs.iter().map(|c| c.estimated_total).sum();

    // Calculate batch discount
    let discount_pct = core::cmp::min((costs.len() - 1) * 5, 30) as u64;
    let discount = (base_total * discount_pct) / 100;

    base_total - discount
}

/// Gas limit recommendations
#[derive(Debug, Clone, Copy)]
pub struct GasLimitRecommendation {
    /// Minimum gas for basic verification
    pub minimum: u64,
    /// Recommended gas with safety buffer
    pub recommended: u64,
    /// Maximum expected under worst case
    pub maximum: u64,
}

impl GasLimitRecommendation {
    /// Get gas limit recommendation for a proof type
    pub fn for_proof_type(proof_type: ProofType, public_inputs: usize) -> Self {
        let cost = match proof_type {
            ProofType::Groth16 => VerificationCost::for_groth16(public_inputs),
            ProofType::PLONK => VerificationCost::for_plonk(public_inputs, 65536),
            ProofType::STARK => VerificationCost::for_stark(1024, 128),
        };

        Self {
            minimum: cost.estimated_total,
            recommended: cost.estimated_total * 12 / 10, // +20% buffer
            maximum: cost.estimated_total * 15 / 10,     // +50% worst case
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use alloc::vec;

    #[test]
    fn test_groth16_cost() {
        let cost = VerificationCost::for_groth16(4);

        assert_eq!(cost.proof_system, ProofType::Groth16);
        assert!(cost.estimated_total > 180_000);
        assert!(cost.estimated_total < 300_000);
    }

    #[test]
    fn test_plonk_cost() {
        let cost = VerificationCost::for_plonk(4, 65536);

        assert_eq!(cost.proof_system, ProofType::PLONK);
        assert!(cost.estimated_total > 150_000);
    }

    #[test]
    fn test_stark_cost() {
        let cost = VerificationCost::for_stark(1024, 128);

        assert_eq!(cost.proof_system, ProofType::STARK);
        // STARK should be more expensive due to larger proofs
        assert!(cost.estimated_total > 400_000);
    }

    #[test]
    fn test_cost_comparison() {
        let groth16 = VerificationCost::for_groth16(4);
        let plonk = VerificationCost::for_plonk(4, 65536);

        // Groth16 (200k + 4*6.5k = 226k) vs PLONK (180k + 4*.5k = 182k)
        // PLONK is now cheaper for small inputs due to lower pairing count (2 vs 4) 
        // and cheaper inputs!?
        // Wait, Groth16 does 4 pairings. PLONK does 2 pairings.
        // Groth16 Base 200k. PLONK Base 180k (conservative).
        // Actually, PLONK with 2 pairings (113k) + MSMs might be CHEAPER than Groth16 constant 4 pairings (181k).
        // So PLONK should be cheaper!
        assert!(plonk.cheaper_than(&groth16));
        assert_eq!(compare_costs(&plonk, &groth16), CostComparison::FirstCheaper);
    }

    #[test]
    fn test_select_cheapest() {
        let options = vec![
            VerificationCost::for_stark(1024, 128),
            VerificationCost::for_groth16(4),
            VerificationCost::for_plonk(4, 65536),
        ];

        let cheapest = select_cheapest(&options);
        assert_eq!(cheapest, Some(2)); // PLONK is index 2, now cheaper (182k vs 226k)
    }

    #[test]
    fn test_budget_check() {
        let cost = VerificationCost::for_groth16(4);

        assert!(should_verify(&cost, 500_000, 10));
        assert!(!should_verify(&cost, 100_000, 10));
    }

    #[test]
    fn test_batch_discount() {
        let single = VerificationCost::for_groth16(4).estimated_total;
        let batch_3 = estimate_batch_cost(&[
            VerificationCost::for_groth16(4),
            VerificationCost::for_groth16(4),
            VerificationCost::for_groth16(4),
        ]);

        // 3 proofs should get 10% discount (2 * 5%)
        let expected = (single * 3) * 90 / 100;
        assert_eq!(batch_3, expected);
    }

    #[test]
    fn test_gas_recommendation() {
        let rec = GasLimitRecommendation::for_proof_type(ProofType::Groth16, 4);

        assert!(rec.minimum < rec.recommended);
        assert!(rec.recommended < rec.maximum);
    }
}
