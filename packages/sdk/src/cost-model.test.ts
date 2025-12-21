/**
 * Cost Model - Unit Tests
 *
 * Tests for gas estimation, cost comparison, and batch verification.
 */

import { describe, it, expect } from "vitest";
import {
  VerificationCost,
  CostComparison,
  compareCosts,
  selectCheapest,
  shouldVerify,
  estimateBatchCost,
  getGasLimitRecommendation,
} from "./cost-model";
import { UniversalProofDescriptor } from "./upd";
import { ProofType } from "./types";

describe("VerificationCost", () => {
  describe("forGroth16", () => {
    it("should calculate correct cost for 2 inputs", () => {
      const cost = VerificationCost.forGroth16(2);

      expect(cost.proofType).toBe(ProofType.Groth16);
      expect(cost.baseCost).toBe(250_000n);
      expect(cost.perInputCost).toBe(40_000n);
      expect(cost.estimatedTotal).toBe(250_000n + 40_000n * 2n); // 330k
    });

    it("should calculate correct cost for 4 inputs", () => {
      const cost = VerificationCost.forGroth16(4);
      expect(cost.estimatedTotal).toBe(250_000n + 40_000n * 4n); // 410k
    });
  });

  describe("forPlonk", () => {
    it("should calculate correct cost for 4 inputs", () => {
      const cost = VerificationCost.forPlonk(4);

      expect(cost.proofType).toBe(ProofType.PLONK);
      expect(cost.baseCost).toBe(350_000n);
      expect(cost.perInputCost).toBe(10_000n);
      expect(cost.estimatedTotal).toBe(350_000n + 10_000n * 4n); // 390k
    });
  });

  describe("forStark", () => {
    it("should calculate correct cost based on trace length", () => {
      const cost = VerificationCost.forStark(1024, 100);

      expect(cost.proofType).toBe(ProofType.STARK);
      expect(cost.baseCost).toBe(200_000n);
      expect(cost.perByteCost).toBe(10n);
      // proofBytes = ceil(log2(1024)) * 100 * 32 = 10 * 100 * 32 = 32000
      expect(cost.proofBytes).toBe(32000);
    });
  });

  describe("fromDescriptor", () => {
    it("should create cost from Groth16 descriptor", () => {
      const descriptor = UniversalProofDescriptor.groth16(
        4,
        new Uint8Array(32),
        new Uint8Array(32),
      );

      const cost = VerificationCost.fromDescriptor(descriptor);
      expect(cost.proofType).toBe(ProofType.Groth16);
      expect(cost.publicInputs).toBe(4);
    });

    it("should create cost from PLONK descriptor", () => {
      const descriptor = UniversalProofDescriptor.plonk(
        8,
        new Uint8Array(32),
        new Uint8Array(32),
      );

      const cost = VerificationCost.fromDescriptor(descriptor);
      expect(cost.proofType).toBe(ProofType.PLONK);
      expect(cost.publicInputs).toBe(8);
    });
  });

  describe("comparison methods", () => {
    it("cheaperThan should return correct result", () => {
      const groth16 = VerificationCost.forGroth16(2);
      const plonk = VerificationCost.forPlonk(2);

      expect(groth16.cheaperThan(plonk)).toBe(true);
      expect(plonk.cheaperThan(groth16)).toBe(false);
    });

    it("savingsVs should return correct difference", () => {
      const groth16 = VerificationCost.forGroth16(2); // 330k
      const plonk = VerificationCost.forPlonk(2); // 370k

      const savings = groth16.savingsVs(plonk);
      expect(savings).toBe(plonk.estimatedTotal - groth16.estimatedTotal);
      expect(savings).toBeGreaterThan(0n);
    });

    it("withinBudget should check gas limit", () => {
      const cost = VerificationCost.forGroth16(2); // ~330k

      expect(cost.withinBudget(500_000n)).toBe(true);
      expect(cost.withinBudget(300_000n)).toBe(false);
    });
  });

  describe("costBreakdown", () => {
    it("should return percentage breakdown", () => {
      const cost = VerificationCost.forGroth16(2);
      const breakdown = cost.costBreakdown();

      expect(breakdown.basePct).toBeGreaterThan(0);
      expect(breakdown.perInputPct).toBeGreaterThan(0);
      expect(
        breakdown.basePct + breakdown.perInputPct + breakdown.perBytePct,
      ).toBeCloseTo(100, 0);
    });
  });
});

describe("compareCosts", () => {
  it("should return FirstCheaper when first is cheaper", () => {
    const groth16 = VerificationCost.forGroth16(2);
    const plonk = VerificationCost.forPlonk(2);

    expect(compareCosts(groth16, plonk)).toBe(CostComparison.FirstCheaper);
  });

  it("should return SecondCheaper when second is cheaper", () => {
    const groth16 = VerificationCost.forGroth16(2);
    const plonk = VerificationCost.forPlonk(2);

    expect(compareCosts(plonk, groth16)).toBe(CostComparison.SecondCheaper);
  });
});

describe("selectCheapest", () => {
  it("should return null for empty array", () => {
    expect(selectCheapest([])).toBe(null);
  });

  it("should return index of cheapest option", () => {
    const costs = [
      VerificationCost.forPlonk(2), // 370k
      VerificationCost.forGroth16(2), // 330k - Cheaper
      VerificationCost.forStark(1024, 100), // Most expensive
    ];

    expect(selectCheapest(costs)).toBe(1); // Groth16 is cheapest
  });
});

describe("shouldVerify", () => {
  it("should return true when within budget", () => {
    const cost = VerificationCost.forGroth16(2); // ~330k

    expect(shouldVerify(cost, 500_000n, 10)).toBe(true);
  });

  it("should return false when exceeds budget with margin", () => {
    const cost = VerificationCost.forGroth16(2); // ~330k

    // 350k limit with 10% margin = 315k effective limit
    expect(shouldVerify(cost, 350_000n, 10)).toBe(false);
  });

  it("should use default 10% margin", () => {
    const cost = VerificationCost.forGroth16(2); // ~330k

    // 400k limit with default 10% margin = 360k effective limit
    expect(shouldVerify(cost, 400_000n)).toBe(true);
  });
});

describe("estimateBatchCost", () => {
  it("should return 0 for empty array", () => {
    expect(estimateBatchCost([])).toBe(0n);
  });

  it("should return full cost for single proof", () => {
    const cost = VerificationCost.forGroth16(2);
    expect(estimateBatchCost([cost])).toBe(cost.estimatedTotal);
  });

  it("should apply batch discount", () => {
    const cost = VerificationCost.forGroth16(2);
    const batch3 = [cost, cost, cost];

    const totalNaive = cost.estimatedTotal * 3n;
    const batchTotal = estimateBatchCost(batch3);

    // 3 proofs = 10% discount (5% per additional proof)
    expect(batchTotal).toBeLessThan(totalNaive);
    expect(batchTotal).toBe(totalNaive - (totalNaive * 10n) / 100n);
  });

  it("should cap discount at 30%", () => {
    const cost = VerificationCost.forGroth16(2);
    const batch10 = Array(10).fill(cost);

    const totalNaive = cost.estimatedTotal * 10n;
    const batchTotal = estimateBatchCost(batch10);

    // 10 proofs = 45% would be the formula, but capped at 30%
    expect(batchTotal).toBe(totalNaive - (totalNaive * 30n) / 100n);
  });
});

describe("getGasLimitRecommendation", () => {
  it("should return recommendations for Groth16", () => {
    const rec = getGasLimitRecommendation(ProofType.Groth16, 4);

    expect(rec.minimum).toBeGreaterThan(0n);
    expect(rec.recommended).toBeGreaterThan(rec.minimum);
    expect(rec.maximum).toBeGreaterThan(rec.recommended);
  });

  it("should return higher limits for STARK", () => {
    const groth16Rec = getGasLimitRecommendation(ProofType.Groth16, 4);
    const starkRec = getGasLimitRecommendation(ProofType.STARK, 4);

    expect(starkRec.minimum).toBeGreaterThan(groth16Rec.minimum);
  });
});
