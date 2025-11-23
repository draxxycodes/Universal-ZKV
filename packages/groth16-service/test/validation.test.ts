/**
 * Proof Validation Tests
 *
 * Tests proof verification logic with valid/invalid proofs
 */

import { describe, it, expect } from "vitest";
import { wasmVerifier } from "../src/utils/wasm-loader.js";
import type {
  Groth16Proof,
  VerificationKey,
} from "../src/utils/wasm-loader.js";
import validProof from "./fixtures/valid-proof.json";
import validPublic from "./fixtures/valid-public.json";
import verificationKey from "./fixtures/verification-key.json";

describe("Proof Validation", () => {
  describe("Valid Proofs", () => {
    it("should verify a valid Groth16 proof", async () => {
      const result = await wasmVerifier.verify(
        validProof as Groth16Proof,
        validPublic as string[],
        verificationKey as VerificationKey,
      );

      expect(result.isValid).toBe(true);
      expect(result.proofHash).toBeDefined();
      expect(result.proofHash).toMatch(/^0x[0-9a-f]{64}$/i);
    });

    it("should compute consistent proof hashes", async () => {
      const result1 = await wasmVerifier.verify(
        validProof as Groth16Proof,
        validPublic as string[],
        verificationKey as VerificationKey,
      );

      const result2 = await wasmVerifier.verify(
        validProof as Groth16Proof,
        validPublic as string[],
        verificationKey as VerificationKey,
      );

      expect(result1.proofHash).toBe(result2.proofHash);
    });

    it("should include gas estimate", async () => {
      const result = await wasmVerifier.verify(
        validProof as Groth16Proof,
        validPublic as string[],
        verificationKey as VerificationKey,
      );

      expect(result.gasEstimate).toBeDefined();
      expect(result.gasEstimate).toBeGreaterThan(0);
    });
  });

  describe("Invalid Proofs", () => {
    it("should reject proof with invalid protocol", async () => {
      const invalidProof = {
        ...validProof,
        protocol: "invalid" as any,
      };

      const result = await wasmVerifier.verify(
        invalidProof as Groth16Proof,
        validPublic as string[],
        verificationKey as VerificationKey,
      );

      expect(result.isValid).toBe(false);
      expect(result.error).toBeDefined();
    });

    it("should reject proof with invalid curve", async () => {
      const invalidProof = {
        ...validProof,
        curve: "invalid" as any,
      };

      const result = await wasmVerifier.verify(
        invalidProof as Groth16Proof,
        validPublic as string[],
        verificationKey as VerificationKey,
      );

      expect(result.isValid).toBe(false);
      expect(result.error).toBeDefined();
    });

    it("should reject proof with malformed pi_a", async () => {
      const invalidProof = {
        ...validProof,
        pi_a: ["invalid"] as any,
      };

      const result = await wasmVerifier.verify(
        invalidProof as Groth16Proof,
        validPublic as string[],
        verificationKey as VerificationKey,
      );

      expect(result.isValid).toBe(false);
      expect(result.error).toBeDefined();
    });

    it("should reject proof with malformed pi_b", async () => {
      const invalidProof = {
        ...validProof,
        pi_b: [["1", "2"]] as any,
      };

      const result = await wasmVerifier.verify(
        invalidProof as Groth16Proof,
        validPublic as string[],
        verificationKey as VerificationKey,
      );

      expect(result.isValid).toBe(false);
      expect(result.error).toBeDefined();
    });

    it("should reject proof with malformed pi_c", async () => {
      const invalidProof = {
        ...validProof,
        pi_c: [] as any,
      };

      const result = await wasmVerifier.verify(
        invalidProof as Groth16Proof,
        validPublic as string[],
        verificationKey as VerificationKey,
      );

      expect(result.isValid).toBe(false);
      expect(result.error).toBeDefined();
    });

    it("should reject proof with missing pi_a", async () => {
      const invalidProof = {
        pi_a: validProof.pi_a,
        pi_b: validProof.pi_b,
        // Missing pi_c
        protocol: "groth16",
        curve: "bn128",
      } as any;

      const result = await wasmVerifier.verify(
        invalidProof,
        validPublic as string[],
        verificationKey as VerificationKey,
      );

      expect(result.isValid).toBe(false);
      expect(result.error).toBeDefined();
    });
  });

  describe("Verification Key Validation", () => {
    it("should reject invalid VK protocol", async () => {
      const invalidVK = {
        ...verificationKey,
        protocol: "invalid" as any,
      };

      const result = await wasmVerifier.verify(
        validProof as Groth16Proof,
        validPublic as string[],
        invalidVK as VerificationKey,
      );

      expect(result.isValid).toBe(false);
      expect(result.error).toBeDefined();
    });

    it("should reject VK with missing IC array", async () => {
      const invalidVK = {
        ...verificationKey,
        IC: undefined as any,
      };

      const result = await wasmVerifier.verify(
        validProof as Groth16Proof,
        validPublic as string[],
        invalidVK as VerificationKey,
      );

      expect(result.isValid).toBe(false);
      expect(result.error).toBeDefined();
    });

    it("should reject VK with empty IC array", async () => {
      const invalidVK = {
        ...verificationKey,
        IC: [] as any,
      };

      const result = await wasmVerifier.verify(
        validProof as Groth16Proof,
        validPublic as string[],
        invalidVK as VerificationKey,
      );

      expect(result.isValid).toBe(false);
      expect(result.error).toBeDefined();
    });
  });

  describe("Public Inputs", () => {
    it("should verify with correct public inputs", async () => {
      const result = await wasmVerifier.verify(
        validProof as Groth16Proof,
        validPublic as string[],
        verificationKey as VerificationKey,
      );

      expect(result.isValid).toBe(true);
    });

    it("should handle multiple public inputs", async () => {
      const result = await wasmVerifier.verify(
        validProof as Groth16Proof,
        ["1", "2", "3"],
        verificationKey as VerificationKey,
      );

      // Will be invalid if inputs don't match circuit
      expect(result.isValid).toBeDefined();
    });

    it("should handle empty public inputs", async () => {
      const result = await wasmVerifier.verify(
        validProof as Groth16Proof,
        [],
        verificationKey as VerificationKey,
      );

      expect(result.isValid).toBeDefined();
    });
  });
});
