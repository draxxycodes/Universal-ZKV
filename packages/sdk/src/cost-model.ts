/**
 * Cost-Aware Verification Model
 *
 * TypeScript implementation of gas estimation and verification path selection.
 * Provides pre-verification cost analysis for universal ZK verification.
 *
 * Features:
 * - Pre-verification gas estimation - Know costs before committing
 * - Cost comparison across proof systems
 * - Budget-aware verification routing
 * - Batch verification discount calculation
 *
 * @see packages/stylus/src/cost_model.rs for Rust implementation
 */

import { ProofType } from "./types";
import { UniversalProofDescriptor } from "./upd";

/**
 * Cost breakdown as percentages
 */
export interface CostBreakdown {
  /** Base cost percentage */
  basePct: number;
  /** Per-input cost percentage */
  perInputPct: number;
  /** Per-byte cost percentage */
  perBytePct: number;
}

/**
 * Cost comparison result
 */
export enum CostComparison {
  /** First is cheaper */
  FirstCheaper = "FirstCheaper",
  /** Second is cheaper */
  SecondCheaper = "SecondCheaper",
  /** Costs are equal */
  Equal = "Equal",
}

/**
 * Gas limit recommendations
 */
export interface GasLimitRecommendation {
  /** Minimum recommended gas limit */
  minimum: bigint;
  /** Comfortable margin (10% buffer) */
  recommended: bigint;
  /** Safe maximum for complex operations */
  maximum: bigint;
}

/**
 * Normalized verification cost with breakdown
 *
 * Captures the full cost structure for a verification operation,
 * enabling both estimation and comparison across proof systems.
 */
export class VerificationCost {
  /** Proof system type */
  public readonly proofType: ProofType;

  /** Base gas cost */
  public readonly baseCost: bigint;

  /** Per-input gas cost */
  public readonly perInputCost: bigint;

  /** Per-byte gas cost */
  public readonly perByteCost: bigint;

  /** Number of public inputs */
  public readonly publicInputs: number;

  /** Proof size in bytes */
  public readonly proofBytes: number;

  /** Estimated total gas */
  public readonly estimatedTotal: bigint;

  private constructor(params: {
    proofType: ProofType;
    baseCost: bigint;
    perInputCost: bigint;
    perByteCost: bigint;
    publicInputs: number;
    proofBytes: number;
  }) {
    this.proofType = params.proofType;
    this.baseCost = params.baseCost;
    this.perInputCost = params.perInputCost;
    this.perByteCost = params.perByteCost;
    this.publicInputs = params.publicInputs;
    this.proofBytes = params.proofBytes;

    // Calculate total
    this.estimatedTotal =
      this.baseCost +
      this.perInputCost * BigInt(this.publicInputs) +
      this.perByteCost * BigInt(this.proofBytes);
  }

  /**
   * Calculate verification cost for Groth16 proof
   *
   * Cost model:
   * - Base: 250,000 gas (4 pairing checks)
   * - Per input: 40,000 gas (MSM operations)
   * - Per byte: 0 (fixed-size proof)
   *
   * Typical total: 250k + 40k * inputs ≈ 330k for 2 inputs
   */
  static forGroth16(publicInputs: number): VerificationCost {
    return new VerificationCost({
      proofType: ProofType.Groth16,
      baseCost: 250_000n,
      perInputCost: 40_000n,
      perByteCost: 0n,
      publicInputs,
      proofBytes: 256, // Standard Groth16 proof size
    });
  }

  /**
   * Calculate verification cost for PLONK proof
   *
   * Cost model:
   * - Base: 350,000 gas (more pairings than Groth16)
   * - Per input: 10,000 gas (commitment lookups)
   * - Per byte: 0 (fixed-size proof)
   *
   * Typical total: 350k + 10k * inputs ≈ 390k for 4 inputs
   */
  static forPlonk(
    publicInputs: number,
    circuitSize: number = 0,
  ): VerificationCost {
    // Circuit size adds a small overhead (not modeled precisely)
    const circuitOverhead = BigInt(Math.floor(circuitSize / 10000)) * 1000n;

    return new VerificationCost({
      proofType: ProofType.PLONK,
      baseCost: 350_000n + circuitOverhead,
      perInputCost: 10_000n,
      perByteCost: 0n,
      publicInputs,
      proofBytes: 800, // Typical PLONK proof size
    });
  }

  /**
   * Calculate verification cost for STARK proof
   *
   * Cost model:
   * - Base: 200,000 gas (hash operations)
   * - Per input: 5,000 gas (minimal)
   * - Per byte: 10 gas (FRI layer verification)
   *
   * Typical total: 200k + 10 * proof_bytes ≈ 700k for 50KB proof
   */
  static forStark(
    traceLength: number,
    securityBits: number = 100,
  ): VerificationCost {
    // Proof size is approximately log2(traceLength) * securityBits * 32
    const layers = Math.ceil(Math.log2(traceLength || 1));
    const proofBytes = layers * securityBits * 32;

    return new VerificationCost({
      proofType: ProofType.STARK,
      baseCost: 200_000n,
      perInputCost: 5_000n,
      perByteCost: 10n,
      publicInputs: 0, // STARK typically has minimal public inputs
      proofBytes,
    });
  }

  /**
   * Create cost from UniversalProofDescriptor
   *
   * Uses the descriptor's metadata to compute accurate gas estimate.
   */
  static fromDescriptor(
    descriptor: UniversalProofDescriptor,
  ): VerificationCost {
    const proofType = descriptor.proofType();

    if (proofType === null) {
      throw new Error("Unknown proof type in descriptor");
    }

    switch (proofType) {
      case ProofType.Groth16:
        return new VerificationCost({
          proofType: ProofType.Groth16,
          baseCost: 250_000n,
          perInputCost: 40_000n,
          perByteCost: 0n,
          publicInputs: descriptor.publicInputCount,
          proofBytes: descriptor.proofLength,
        });

      case ProofType.PLONK:
        return new VerificationCost({
          proofType: ProofType.PLONK,
          baseCost: 350_000n,
          perInputCost: 10_000n,
          perByteCost: 0n,
          publicInputs: descriptor.publicInputCount,
          proofBytes: descriptor.proofLength,
        });

      case ProofType.STARK:
        return new VerificationCost({
          proofType: ProofType.STARK,
          baseCost: 200_000n,
          perInputCost: 5_000n,
          perByteCost: 10n,
          publicInputs: descriptor.publicInputCount,
          proofBytes: descriptor.proofLength,
        });

      default:
        throw new Error(`Unsupported proof type: ${proofType}`);
    }
  }

  /**
   * Check if this cost is cheaper than another
   */
  cheaperThan(other: VerificationCost): boolean {
    return this.estimatedTotal < other.estimatedTotal;
  }

  /**
   * Get the gas savings compared to another cost
   * Positive means this is cheaper, negative means other is cheaper
   */
  savingsVs(other: VerificationCost): bigint {
    return other.estimatedTotal - this.estimatedTotal;
  }

  /**
   * Check if cost is within a gas budget
   */
  withinBudget(gasLimit: bigint): boolean {
    return this.estimatedTotal <= gasLimit;
  }

  /**
   * Get cost breakdown as percentages
   */
  costBreakdown(): CostBreakdown {
    if (this.estimatedTotal === 0n) {
      return { basePct: 0, perInputPct: 0, perBytePct: 0 };
    }

    const total = Number(this.estimatedTotal);
    const inputTotal = Number(this.perInputCost) * this.publicInputs;
    const byteTotal = Number(this.perByteCost) * this.proofBytes;

    return {
      basePct: (Number(this.baseCost) / total) * 100,
      perInputPct: (inputTotal / total) * 100,
      perBytePct: (byteTotal / total) * 100,
    };
  }
}

/**
 * Compare verification costs and return recommendation
 */
export function compareCosts(
  a: VerificationCost,
  b: VerificationCost,
): CostComparison {
  if (a.estimatedTotal < b.estimatedTotal) {
    return CostComparison.FirstCheaper;
  } else if (a.estimatedTotal > b.estimatedTotal) {
    return CostComparison.SecondCheaper;
  } else {
    return CostComparison.Equal;
  }
}

/**
 * Select cheapest verification path from multiple options
 *
 * @param costs Array of verification costs
 * @returns Index of the cheapest option, or null if empty
 */
export function selectCheapest(costs: VerificationCost[]): number | null {
  if (costs.length === 0) {
    return null;
  }

  let cheapestIndex = 0;
  let cheapestCost = costs[0].estimatedTotal;

  for (let i = 1; i < costs.length; i++) {
    if (costs[i].estimatedTotal < cheapestCost) {
      cheapestCost = costs[i].estimatedTotal;
      cheapestIndex = i;
    }
  }

  return cheapestIndex;
}

/**
 * Budget-aware verification routing
 *
 * Returns true if verification should proceed, false if too expensive.
 *
 * @param cost Verification cost
 * @param gasLimit Available gas limit
 * @param safetyMarginPct Safety margin percentage (0-100)
 */
export function shouldVerify(
  cost: VerificationCost,
  gasLimit: bigint,
  safetyMarginPct: number = 10,
): boolean {
  // Calculate effective limit with safety margin
  const margin = (gasLimit * BigInt(safetyMarginPct)) / 100n;
  const effectiveLimit = gasLimit - margin;

  return cost.estimatedTotal <= effectiveLimit;
}

/**
 * Estimate total cost for batch verification
 *
 * Batch verification can be more efficient due to shared setup costs.
 * Discount factor: 5% per additional proof (up to 30% max discount)
 *
 * @param costs Array of individual verification costs
 * @returns Total batch cost after discounts
 */
export function estimateBatchCost(costs: VerificationCost[]): bigint {
  if (costs.length === 0) {
    return 0n;
  }

  // Sum all individual costs
  let total = 0n;
  for (const cost of costs) {
    total += cost.estimatedTotal;
  }

  // Apply batch discount (5% per additional proof, max 30%)
  const discountPct = Math.min((costs.length - 1) * 5, 30);
  const discount = (total * BigInt(discountPct)) / 100n;

  return total - discount;
}

/**
 * Get gas limit recommendation for a proof type
 */
export function getGasLimitRecommendation(
  proofType: ProofType,
  publicInputs: number,
): GasLimitRecommendation {
  let cost: VerificationCost;

  switch (proofType) {
    case ProofType.Groth16:
      cost = VerificationCost.forGroth16(publicInputs);
      break;
    case ProofType.PLONK:
      cost = VerificationCost.forPlonk(publicInputs);
      break;
    case ProofType.STARK:
      cost = VerificationCost.forStark(1024, 100); // Default trace length
      break;
    default:
      cost = VerificationCost.forGroth16(publicInputs);
  }

  const minimum = cost.estimatedTotal;
  const recommended = (minimum * 110n) / 100n; // 10% buffer
  const maximum = (minimum * 150n) / 100n; // 50% buffer

  return { minimum, recommended, maximum };
}
