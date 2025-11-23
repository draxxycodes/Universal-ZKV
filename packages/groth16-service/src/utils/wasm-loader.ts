/**
 * Groth16 Verifier using snarkjs
 *
 * Production-grade off-chain Groth16 verification using snarkjs library.
 * The Stylus WASM contract on-chain is used only for attestation.
 *
 * Architecture:
 * - Off-chain: snarkjs verifies proofs (this file)
 * - On-chain: Stylus contract attests valid proofs at 0x36e937ebcf56c5dec6ecb0695001becc87738177
 */

import { groth16 } from "snarkjs";
import { createHash } from "crypto";
import pino from "pino";

const logger = pino({ name: "groth16-verifier" });

export interface Groth16Proof {
  pi_a: [string, string];
  pi_b: [[string, string], [string, string]];
  pi_c: [string, string];
  protocol: string;
  curve: string;
}

export interface VerificationKey {
  protocol: string;
  curve: string;
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

export interface VerificationResult {
  isValid: boolean;
  proofHash?: string;
  error?: string;
  gasEstimate?: number;
}

class Groth16WasmVerifier {
  private initialized = false;

  /**
   * Initialize the verifier (snarkjs doesn't require initialization)
   */
  async initialize(): Promise<void> {
    if (this.initialized) {
      logger.debug("Groth16 verifier already initialized");
      return;
    }

    logger.info("Initializing Groth16 verifier with snarkjs");
    this.initialized = true;
  }

  /**
   * Verify a Groth16 proof using snarkjs
   */
  async verify(
    proof: Groth16Proof,
    publicInputs: string[],
    vk: VerificationKey,
  ): Promise<VerificationResult> {
    if (!this.initialized) {
      await this.initialize();
    }

    try {
      logger.info(
        { publicInputsCount: publicInputs.length },
        "Verifying Groth16 proof",
      );

      // Validate proof structure
      this.validateProof(proof);
      this.validateVerificationKey(vk);

      // Debug logging
      logger.debug(
        {
          publicInputs,
          proofStructure: {
            pi_a_length: proof.pi_a?.length,
            pi_b_length: proof.pi_b?.length,
            pi_c_length: proof.pi_c?.length,
            protocol: proof.protocol,
            curve: proof.curve,
          },
          vkProtocol: vk.protocol,
        },
        "Verification inputs",
      );

      // Verify using snarkjs
      const isValid = await groth16.verify(vk, publicInputs, proof);

      const proofHash = this.computeProofHash(proof);

      // Estimate gas for on-chain attestation via Stylus contract
      const gasEstimate = 50000; // Approximate gas cost

      logger.info({ isValid, proofHash }, "Verification complete");

      return {
        isValid,
        proofHash,
        gasEstimate,
      };
    } catch (error) {
      logger.error(
        {
          error,
          errorMessage:
            error instanceof Error ? error.message : "Unknown error",
          errorStack: error instanceof Error ? error.stack : undefined,
        },
        "Verification failed",
      );
      return {
        isValid: false,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }

  /**
   * Validate proof structure
   * @private
   */
  private validateProof(proof: Groth16Proof): void {
    // snarkjs uses projective coordinates (3 elements: [x, y, z])
    // where the actual point is (x/z, y/z)
    if (!proof.pi_a || (proof.pi_a.length !== 2 && proof.pi_a.length !== 3)) {
      throw new Error(
        "Invalid proof: pi_a must be an array of 2 or 3 elements",
      );
    }
    if (!proof.pi_b || !Array.isArray(proof.pi_b) || proof.pi_b.length < 2) {
      throw new Error(
        "Invalid proof: pi_b must be an array with at least 2 elements",
      );
    }
    if (!proof.pi_c || (proof.pi_c.length !== 2 && proof.pi_c.length !== 3)) {
      throw new Error(
        "Invalid proof: pi_c must be an array of 2 or 3 elements",
      );
    }
    if (proof.protocol !== "groth16") {
      throw new Error(
        `Invalid protocol: expected 'groth16', got '${proof.protocol}'`,
      );
    }
    if (proof.curve !== "bn128") {
      throw new Error(`Invalid curve: expected 'bn128', got '${proof.curve}'`);
    }
  }

  /**
   * Validate verification key structure
   * @private
   */
  private validateVerificationKey(vk: VerificationKey): void {
    if (vk.protocol !== "groth16") {
      throw new Error(
        `Invalid VK protocol: expected 'groth16', got '${vk.protocol}'`,
      );
    }
    if (vk.curve !== "bn128") {
      throw new Error(`Invalid VK curve: expected 'bn128', got '${vk.curve}'`);
    }
    if (!vk.IC || !Array.isArray(vk.IC)) {
      throw new Error("Invalid VK: IC must be an array");
    }
    if (vk.IC.length === 0) {
      throw new Error("Invalid VK: IC array cannot be empty");
    }
  }

  /**
   * Compute SHA-256 hash of the proof
   * @private
   */
  private computeProofHash(proof: Groth16Proof): string {
    // Deterministic serialization for consistent hashing
    const proofData = JSON.stringify({
      pi_a: proof.pi_a,
      pi_b: proof.pi_b,
      pi_c: proof.pi_c,
    });

    const hash = createHash("sha256");
    hash.update(proofData);
    return `0x${hash.digest("hex")}`;
  }
}

// Export singleton instance
export const wasmVerifier = new Groth16WasmVerifier();
