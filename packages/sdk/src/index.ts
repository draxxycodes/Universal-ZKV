/**
 * UZKV SDK - Universal ZK Verifier Client
 *
 * TypeScript SDK for interacting with the Universal ZK Verifier
 * Supports Groth16, PLONK, and STARK proof systems
 */

import {
  createPublicClient,
  type PublicClient,
  type Address,
  http,
} from "viem";
import { arbitrumSepolia } from "viem/chains";

// Export Universal Proof Protocol types
export { ProofType, PublicStatement, UniversalProof } from "./types";

// Export Universal Proof Descriptor (UPD v2) types
export {
  CurveId,
  HashFunctionId,
  DescriptorError,
  UniversalProofDescriptor,
} from "./upd";

// Export Cost Model types
export {
  VerificationCost,
  CostBreakdown,
  CostComparison,
  GasLimitRecommendation,
  compareCosts,
  selectCheapest,
  shouldVerify,
  estimateBatchCost,
  getGasLimitRecommendation,
} from "./cost-model";

// Export Security types
export {
  SecurityError,
  SetupType,
  CryptoAssumption,
  SecurityModel,
  RegisteredVK,
  DispatchValidator,
  ValidationError,
  SecurityAuditRecord,
  hashDescriptor,
  createAuditRecord,
} from "./security";

// Export Circuit Helpers
export {
  circuitInputsToPublicStatement,
  fieldElementToBytes32,
  parseSnarkjsPublicInputs,
  createGroth16Proof,
  createPlonkProof,
  createTestPublicStatement,
  validatePublicStatement,
  createProofPayload,
  isNullifierUsed,
  type CircuitPublicInputs,
} from "./circuit-helpers";

export interface Groth16Proof {
  pi_a: [string, string];
  pi_b: [[string, string], [string, string]];
  pi_c: [string, string];
  protocol: "groth16";
  curve: "bn128";
}

export interface VerificationKey {
  protocol: "groth16";
  curve: "bn128";
  nPublic: number;
  vk_alpha_1: [string, string];
  vk_beta_2: [[string, string], [string, string]];
  vk_gamma_2: [[string, string], [string, string]];
  vk_delta_2: [[string, string], [string, string]];
  vk_alphabeta_12: [
    [[string, string], [string, string]],
    [[string, string], [string, string]],
  ];
  IC: Array<[string, string]>;
}

export interface VerifyRequest {
  proof: Groth16Proof;
  publicInputs: string[];
  vk: VerificationKey;
  attestOnChain?: boolean;
}

export interface VerifyResponse {
  valid: boolean;
  proofHash?: string;
  gasEstimate?: number;
  attestation?: {
    success: boolean;
    transactionHash?: string;
    gasUsed?: string;
  };
  error?: string;
}

export interface AttestationStatus {
  proofHash: string;
  isAttested: boolean;
  timestamp?: number;
  timestampISO?: string;
}

export interface UZKVConfig {
  serviceUrl?: string;
  rpcUrl?: string;
  attestorAddress?: string;
}

/**
 * UZKV Client for proof verification
 */
export class UZKVClient {
  private serviceUrl: string;
  private publicClient?: PublicClient;
  private attestorAddress?: Address;

  constructor(config: UZKVConfig = {}) {
    this.serviceUrl = config.serviceUrl || "http://localhost:3001";
    this.attestorAddress = (config.attestorAddress ||
      "0x36e937ebcf56c5dec6ecb0695001becc87738177") as Address;

    if (config.rpcUrl) {
      this.publicClient = createPublicClient({
        chain: arbitrumSepolia,
        transport: http(config.rpcUrl),
      });
    }
  }

  /**
   * Verify a Groth16 proof
   */
  async verify(request: VerifyRequest): Promise<VerifyResponse> {
    try {
      const response = await fetch(`${this.serviceUrl}/verify`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(request),
      });

      if (!response.ok) {
        const error = (await response.json()) as { message?: string };
        throw new Error(error.message || "Verification failed");
      }

      return (await response.json()) as VerifyResponse;
    } catch (error) {
      throw new Error(
        `Failed to verify proof: ${error instanceof Error ? error.message : "Unknown error"}`,
      );
    }
  }

  /**
   * Verify multiple proofs in batch
   */
  async verifyBatch(requests: VerifyRequest[]): Promise<{
    totalProofs: number;
    validProofs: number;
    invalidProofs: number;
    results: Array<{
      index: number;
      valid: boolean;
      proofHash?: string;
      error?: string;
    }>;
  }> {
    try {
      const response = await fetch(`${this.serviceUrl}/verify/batch`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ proofs: requests }),
      });

      if (!response.ok) {
        const error = (await response.json()) as { message?: string };
        throw new Error(error.message || "Batch verification failed");
      }

      return (await response.json()) as {
        totalProofs: number;
        validProofs: number;
        invalidProofs: number;
        results: Array<{
          index: number;
          valid: boolean;
          proofHash?: string;
          error?: string;
        }>;
      };
    } catch (error) {
      throw new Error(
        `Failed to verify proofs: ${error instanceof Error ? error.message : "Unknown error"}`,
      );
    }
  }

  /**
   * Check attestation status for a proof
   */
  async getAttestationStatus(proofHash: string): Promise<AttestationStatus> {
    try {
      const response = await fetch(
        `${this.serviceUrl}/attestation/${proofHash}`,
      );

      if (!response.ok) {
        const error = (await response.json()) as { message?: string };
        throw new Error(error.message || "Failed to get attestation status");
      }

      return (await response.json()) as AttestationStatus;
    } catch (error) {
      throw new Error(
        `Failed to get attestation status: ${error instanceof Error ? error.message : "Unknown error"}`,
      );
    }
  }

  /**
   * Get attestation events
   */
  async getAttestationEvents(proofHash?: string): Promise<{
    count: number;
    events: Array<{
      proofHash: string;
      timestamp: number;
      blockNumber: bigint;
      transactionHash: string;
    }>;
  }> {
    try {
      const url = proofHash
        ? `${this.serviceUrl}/attestation/events?proofHash=${proofHash}`
        : `${this.serviceUrl}/attestation/events`;

      const response = await fetch(url);

      if (!response.ok) {
        const error = (await response.json()) as { message?: string };
        throw new Error(error.message || "Failed to get attestation events");
      }

      return (await response.json()) as {
        count: number;
        events: Array<{
          proofHash: string;
          timestamp: number;
          blockNumber: bigint;
          transactionHash: string;
        }>;
      };
    } catch (error) {
      throw new Error(
        `Failed to get attestation events: ${error instanceof Error ? error.message : "Unknown error"}`,
      );
    }
  }

  /**
   * Health check
   */
  async healthCheck(): Promise<{
    status: string;
    service: string;
    timestamp: string;
  }> {
    try {
      const response = await fetch(`${this.serviceUrl}/health`);

      if (!response.ok) {
        throw new Error("Service unhealthy");
      }

      return (await response.json()) as {
        status: string;
        service: string;
        timestamp: string;
      };
    } catch (error) {
      throw new Error(
        `Health check failed: ${error instanceof Error ? error.message : "Unknown error"}`,
      );
    }
  }

  /**
   * Get service info
   */
  async getServiceInfo(): Promise<any> {
    try {
      const response = await fetch(`${this.serviceUrl}/`);

      if (!response.ok) {
        throw new Error("Failed to get service info");
      }

      return (await response.json()) as any;
    } catch (error) {
      throw new Error(
        `Failed to get service info: ${error instanceof Error ? error.message : "Unknown error"}`,
      );
    }
  }
}

/**
 * Create a UZKV client instance
 */
export function createUZKVClient(config?: UZKVConfig): UZKVClient {
  return new UZKVClient(config);
}
