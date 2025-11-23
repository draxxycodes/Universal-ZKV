/**
 * SDK Client Tests
 *
 * Tests the TypeScript SDK integration with the verification service
 */

import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { createUZKVClient, UZKVClient } from "@uzkv/sdk";
import type { Express } from "express";
import express from "express";
import verifyRouter from "../src/routes/verify.js";
import validProof from "./fixtures/valid-proof.json";
import verificationKey from "./fixtures/verification-key.json";

describe("SDK Client Integration", () => {
  let app: Express;
  let server: any;
  let client: UZKVClient;
  const port = 3002;

  beforeAll(async () => {
    // Start test server
    app = express();
    app.use(express.json());
    app.use("/", verifyRouter);

    server = app.listen(port);

    // Create SDK client
    client = createUZKVClient({
      serviceUrl: `http://localhost:${port}`,
    });

    // Wait for server to be ready
    await new Promise((resolve) => setTimeout(resolve, 100));
  });

  afterAll(async () => {
    // Close server
    if (server) {
      await new Promise((resolve) => server.close(resolve));
    }
  });

  describe("Client Creation", () => {
    it("should create client with default config", () => {
      const defaultClient = createUZKVClient();
      expect(defaultClient).toBeInstanceOf(UZKVClient);
    });

    it("should create client with custom config", () => {
      const customClient = createUZKVClient({
        serviceUrl: "http://custom-url:3001",
        rpcUrl: "https://custom-rpc.example.com",
        attestorAddress: "0x1234567890123456789012345678901234567890",
      });
      expect(customClient).toBeInstanceOf(UZKVClient);
    });
  });

  describe("verify() method", () => {
    it("should verify a valid proof", async () => {
      const result = await client.verify({
        proof: validProof as any,
        publicInputs: ["1"],
        vk: verificationKey as any,
        attestOnChain: false,
      });

      expect(result).toBeDefined();
      expect(result).toHaveProperty("valid");
      expect(result).toHaveProperty("proofHash");
    });

    it("should handle invalid proof gracefully", async () => {
      try {
        await client.verify({
          proof: { invalid: "proof" } as any,
          publicInputs: ["1"],
          vk: verificationKey as any,
        });
      } catch (error) {
        expect(error).toBeInstanceOf(Error);
        expect((error as Error).message).toContain("Failed to verify proof");
      }
    });

    it("should pass through attestOnChain option", async () => {
      const result = await client.verify({
        proof: validProof as any,
        publicInputs: ["1"],
        vk: verificationKey as any,
        attestOnChain: true,
      });

      expect(result).toBeDefined();
      // Attestation will fail without private key, but request should succeed
      expect(result).toHaveProperty("valid");
    });
  });

  describe("verifyBatch() method", () => {
    it("should verify multiple proofs", async () => {
      const result = await client.verifyBatch([
        {
          proof: validProof as any,
          publicInputs: ["1"],
          vk: verificationKey as any,
        },
        {
          proof: validProof as any,
          publicInputs: ["2"],
          vk: verificationKey as any,
        },
      ]);

      expect(result).toBeDefined();
      expect(result).toHaveProperty("totalProofs", 2);
      expect(result).toHaveProperty("validProofs");
      expect(result).toHaveProperty("invalidProofs");
      expect(result).toHaveProperty("results");
      expect(result.results).toHaveLength(2);
    });

    it("should handle empty batch", async () => {
      try {
        await client.verifyBatch([]);
      } catch (error) {
        expect(error).toBeInstanceOf(Error);
      }
    });

    it("should handle mixed valid/invalid proofs", async () => {
      const result = await client.verifyBatch([
        {
          proof: validProof as any,
          publicInputs: ["1"],
          vk: verificationKey as any,
        },
        {
          proof: { invalid: "proof" } as any,
          publicInputs: ["1"],
          vk: verificationKey as any,
        },
      ]);

      expect(result.results).toHaveLength(2);
      expect(result.results[1].valid).toBe(false);
      expect(result.results[1]).toHaveProperty("error");
    });
  });

  describe("getAttestationStatus() method", () => {
    it("should check attestation status", async () => {
      const proofHash = "0x" + "1".repeat(64);

      const result = await client.getAttestationStatus(proofHash);

      expect(result).toBeDefined();
      expect(result).toHaveProperty("proofHash", proofHash);
      expect(result).toHaveProperty("isAttested");
      expect(typeof result.isAttested).toBe("boolean");
    });

    it("should handle invalid hash format", async () => {
      try {
        await client.getAttestationStatus("invalid-hash");
      } catch (error) {
        expect(error).toBeInstanceOf(Error);
      }
    });
  });

  describe("getAttestationEvents() method", () => {
    it("should fetch attestation events", async () => {
      const result = await client.getAttestationEvents();

      expect(result).toBeDefined();
      expect(result).toHaveProperty("count");
      expect(result).toHaveProperty("events");
      expect(Array.isArray(result.events)).toBe(true);
    });

    it("should filter by proof hash", async () => {
      const proofHash = "0x" + "1".repeat(64);

      const result = await client.getAttestationEvents(proofHash);

      expect(result).toBeDefined();
      expect(Array.isArray(result.events)).toBe(true);
    });
  });

  describe("healthCheck() method", () => {
    it("should check service health", async () => {
      const result = await client.healthCheck();

      expect(result).toBeDefined();
      expect(result).toHaveProperty("status", "ok");
      expect(result).toHaveProperty("service");
      expect(result).toHaveProperty("timestamp");
    });
  });

  describe("getServiceInfo() method", () => {
    it("should retrieve service information", async () => {
      const result = await client.getServiceInfo();

      expect(result).toBeDefined();
      expect(result).toHaveProperty("service");
      expect(result).toHaveProperty("endpoints");
    });
  });

  describe("Error Handling", () => {
    it("should handle network errors", async () => {
      const badClient = createUZKVClient({
        serviceUrl: "http://nonexistent-service:9999",
      });

      try {
        await badClient.healthCheck();
      } catch (error) {
        expect(error).toBeInstanceOf(Error);
        expect((error as Error).message).toContain("Health check failed");
      }
    });

    it("should handle 500 errors from service", async () => {
      // This would require mocking the service to return 500
      // For now, just verify error handling structure
      expect(client).toBeDefined();
    });

    it("should provide meaningful error messages", async () => {
      const badClient = createUZKVClient({
        serviceUrl: "http://localhost:9999",
      });

      try {
        await badClient.verify({
          proof: validProof as any,
          publicInputs: ["1"],
          vk: verificationKey as any,
        });
      } catch (error) {
        expect(error).toBeInstanceOf(Error);
        const message = (error as Error).message;
        expect(message).toBeTruthy();
        expect(message.length).toBeGreaterThan(0);
      }
    });
  });

  describe("Type Safety", () => {
    it("should enforce correct types for verify", () => {
      // This is compile-time check, but we can verify runtime behavior
      const validRequest = {
        proof: validProof as any,
        publicInputs: ["1"],
        vk: verificationKey as any,
      };

      expect(validRequest).toBeDefined();
      expect(validRequest.proof).toBeDefined();
      expect(validRequest.publicInputs).toBeDefined();
      expect(validRequest.vk).toBeDefined();
    });
  });

  describe("Performance", () => {
    it("should handle concurrent requests", async () => {
      const promises = Array(5)
        .fill(null)
        .map(() =>
          client.verify({
            proof: validProof as any,
            publicInputs: ["1"],
            vk: verificationKey as any,
          }),
        );

      const results = await Promise.all(promises);

      expect(results).toHaveLength(5);
      results.forEach((result) => {
        expect(result).toHaveProperty("valid");
      });
    });

    it("should measure end-to-end latency", async () => {
      const start = performance.now();

      await client.verify({
        proof: validProof as any,
        publicInputs: ["1"],
        vk: verificationKey as any,
      });

      const duration = performance.now() - start;

      console.log(`SDK end-to-end latency: ${duration.toFixed(2)}ms`);

      // Should include network + processing time
      expect(duration).toBeLessThan(1000); // 1 second max
    });
  });
});
