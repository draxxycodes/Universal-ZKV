/**
 * End-to-End Tests: Complete Verification Flow
 *
 * Tests the complete flow from proof generation to verification to attestation
 */

import { describe, it, expect, beforeAll } from "vitest";
import request from "supertest";
import express, { type Express } from "express";
import { readFile } from "fs/promises";
import { join } from "path";
import { exec } from "child_process";
import { promisify } from "util";
import verifyRouter from "../../src/routes/verify.js";
import { wasmVerifier } from "../../src/utils/wasm-loader.js";

const execAsync = promisify(exec);

describe("End-to-End Verification Flow", () => {
  let app: Express;
  const CIRCUITS_PATH = join(__dirname, "../../../circuits");
  const SCRIPTS_PATH = join(CIRCUITS_PATH, "scripts");

  beforeAll(async () => {
    app = express();
    app.use(express.json({ limit: "10mb" }));
    app.use("/", verifyRouter);

    await wasmVerifier.initialize();
  });

  describe("Complete Poseidon Workflow", () => {
    it("should generate input, create proof, and verify", async () => {
      // Step 1: Generate test input
      const { stdout: inputStdout } = await execAsync(
        `node ${join(SCRIPTS_PATH, "generate-test-inputs.cjs")} 1`,
        { cwd: CIRCUITS_PATH },
      );
      expect(inputStdout).toContain("Generated");

      // Step 2: Generate PLONK proof using CLI
      const inputPath = join(
        CIRCUITS_PATH,
        "test-inputs/poseidon_test/input_1.json",
      );
      const outputPath = join(CIRCUITS_PATH, "temp-proof");

      const { stdout: proofStdout } = await execAsync(
        `node ${join(SCRIPTS_PATH, "plonk-cli.cjs")} generate poseidon_test ${inputPath} ${outputPath}`,
        { cwd: CIRCUITS_PATH },
      );
      expect(proofStdout).toContain("Generated");

      // Step 3: Verify proof via API
      const proof = JSON.parse(
        await readFile(join(outputPath, "proof.json"), "utf-8"),
      );
      const publicSignals = JSON.parse(
        await readFile(join(outputPath, "public.json"), "utf-8"),
      );

      const response = await request(app)
        .post("/verify")
        .send({
          circuitType: "poseidon_test",
          proof,
          publicSignals,
        })
        .expect(200);

      expect(response.body.verified).toBe(true);
      expect(response.body.proofHash).toBeDefined();
      expect(response.body.verificationTime).toBeGreaterThan(0);
    });
  });

  describe("Complete EdDSA Workflow", () => {
    it("should generate signature, create proof, and verify", async () => {
      // Step 1: Generate EdDSA signature
      const { stdout: sigStdout } = await execAsync(
        `node ${join(SCRIPTS_PATH, "generate-eddsa-signatures.cjs")} 1 false`,
        { cwd: CIRCUITS_PATH },
      );
      expect(sigStdout).toContain("Generated");

      // Step 2: Generate PLONK proof
      const inputPath = join(
        CIRCUITS_PATH,
        "test-inputs/eddsa_verify/input_1.json",
      );
      const outputPath = join(CIRCUITS_PATH, "temp-proof-eddsa");

      const { stdout: proofStdout } = await execAsync(
        `node ${join(SCRIPTS_PATH, "plonk-cli.cjs")} generate eddsa_verify ${inputPath} ${outputPath}`,
        { cwd: CIRCUITS_PATH },
      );
      expect(proofStdout).toContain("Generated");

      // Step 3: Verify proof via API
      const proof = JSON.parse(
        await readFile(join(outputPath, "proof.json"), "utf-8"),
      );
      const publicSignals = JSON.parse(
        await readFile(join(outputPath, "public.json"), "utf-8"),
      );

      const response = await request(app)
        .post("/verify")
        .send({
          circuitType: "eddsa_verify",
          proof,
          publicSignals,
        })
        .expect(200);

      expect(response.body.verified).toBe(true);
    });
  });

  describe("Complete Merkle Workflow", () => {
    it("should generate Merkle proof, create PLONK proof, and verify", async () => {
      // Step 1: Generate Merkle proof
      const { stdout: merkleStdout } = await execAsync(
        `node ${join(SCRIPTS_PATH, "generate-merkle-proofs-fast.cjs")} 1 20 false`,
        { cwd: CIRCUITS_PATH },
      );
      expect(merkleStdout).toContain("Generated");

      // Step 2: Generate PLONK proof
      const inputPath = join(
        CIRCUITS_PATH,
        "test-inputs/merkle_proof/input_1.json",
      );
      const outputPath = join(CIRCUITS_PATH, "temp-proof-merkle");

      const { stdout: proofStdout } = await execAsync(
        `node ${join(SCRIPTS_PATH, "plonk-cli.cjs")} generate merkle_proof ${inputPath} ${outputPath}`,
        { cwd: CIRCUITS_PATH },
      );
      expect(proofStdout).toContain("Generated");

      // Step 3: Verify proof via API
      const proof = JSON.parse(
        await readFile(join(outputPath, "proof.json"), "utf-8"),
      );
      const publicSignals = JSON.parse(
        await readFile(join(outputPath, "public.json"), "utf-8"),
      );

      const response = await request(app)
        .post("/verify")
        .send({
          circuitType: "merkle_proof",
          proof,
          publicSignals,
        })
        .expect(200);

      expect(response.body.verified).toBe(true);
    });
  });

  describe("Batch Workflow", () => {
    it("should generate and verify batch of proofs", async () => {
      // Generate 5 test inputs
      await execAsync(
        `node ${join(SCRIPTS_PATH, "generate-test-inputs.cjs")} 5`,
        { cwd: CIRCUITS_PATH },
      );

      // Generate proofs for all inputs
      const proofs = [];
      for (let i = 1; i <= 5; i++) {
        const inputPath = join(
          CIRCUITS_PATH,
          `test-inputs/poseidon_test/input_${i}.json`,
        );
        const outputPath = join(CIRCUITS_PATH, `temp-batch/proof_${i}`);

        await execAsync(
          `node ${join(SCRIPTS_PATH, "plonk-cli.cjs")} generate poseidon_test ${inputPath} ${outputPath}`,
          { cwd: CIRCUITS_PATH },
        );

        const proof = JSON.parse(
          await readFile(join(outputPath, "proof.json"), "utf-8"),
        );
        const publicSignals = JSON.parse(
          await readFile(join(outputPath, "public.json"), "utf-8"),
        );
        proofs.push({ circuitType: "poseidon_test", proof, publicSignals });
      }

      // Verify batch
      const response = await request(app)
        .post("/verify/batch")
        .send({ proofs })
        .expect(200);

      expect(response.body.summary).toMatchObject({
        total: 5,
        verified: 5,
        failed: 0,
      });
    });
  });

  describe("Error Recovery", () => {
    it("should handle proof generation failure gracefully", async () => {
      // Try to generate proof with invalid input
      try {
        await execAsync(
          `node ${join(SCRIPTS_PATH, "plonk-cli.cjs")} generate poseidon_test non-existent.json output`,
          { cwd: CIRCUITS_PATH },
        );
      } catch (error: any) {
        expect(error).toBeDefined();
        expect(error.stderr || error.message).toContain("Error");
      }
    });

    it("should handle verification of corrupted proof", async () => {
      const response = await request(app)
        .post("/verify")
        .send({
          circuitType: "poseidon_test",
          proof: {
            pi_a: ["corrupted"],
            pi_b: [["data"]],
            pi_c: ["here"],
            protocol: "plonk",
          },
          publicSignals: ["123"],
        })
        .expect(400);

      expect(response.body).toHaveProperty("error");
    });
  });

  describe("Performance Benchmarks", () => {
    it("should benchmark full workflow performance", async () => {
      const iterations = 10;
      const timings = {
        inputGeneration: [] as number[],
        proofGeneration: [] as number[],
        verification: [] as number[],
        total: [] as number[],
      };

      for (let i = 0; i < iterations; i++) {
        const workflowStart = Date.now();

        // Input generation
        const inputStart = Date.now();
        await execAsync(
          `node ${join(SCRIPTS_PATH, "generate-test-inputs.cjs")} 1`,
          { cwd: CIRCUITS_PATH },
        );
        timings.inputGeneration.push(Date.now() - inputStart);

        // Proof generation
        const proofStart = Date.now();
        const inputPath = join(
          CIRCUITS_PATH,
          "test-inputs/poseidon_test/input_1.json",
        );
        const outputPath = join(CIRCUITS_PATH, `temp-bench/proof_${i}`);

        await execAsync(
          `node ${join(SCRIPTS_PATH, "plonk-cli.cjs")} generate poseidon_test ${inputPath} ${outputPath}`,
          { cwd: CIRCUITS_PATH },
        );
        timings.proofGeneration.push(Date.now() - proofStart);

        // Verification
        const verifyStart = Date.now();
        const proof = JSON.parse(
          await readFile(join(outputPath, "proof.json"), "utf-8"),
        );
        const publicSignals = JSON.parse(
          await readFile(join(outputPath, "public.json"), "utf-8"),
        );

        await request(app).post("/verify").send({
          circuitType: "poseidon_test",
          proof,
          publicSignals,
        });
        timings.verification.push(Date.now() - verifyStart);

        timings.total.push(Date.now() - workflowStart);
      }

      // Calculate averages
      const avgInputGen =
        timings.inputGeneration.reduce((a, b) => a + b, 0) / iterations;
      const avgProofGen =
        timings.proofGeneration.reduce((a, b) => a + b, 0) / iterations;
      const avgVerify =
        timings.verification.reduce((a, b) => a + b, 0) / iterations;
      const avgTotal = timings.total.reduce((a, b) => a + b, 0) / iterations;

      console.log("\n=== Performance Benchmark Results ===");
      console.log(`Input Generation: ${avgInputGen.toFixed(2)}ms`);
      console.log(`Proof Generation: ${avgProofGen.toFixed(2)}ms`);
      console.log(`Verification: ${avgVerify.toFixed(2)}ms`);
      console.log(`Total Workflow: ${avgTotal.toFixed(2)}ms`);
      console.log("=====================================\n");

      // Assertions
      expect(avgInputGen).toBeLessThan(500);
      expect(avgProofGen).toBeLessThan(2000);
      expect(avgVerify).toBeLessThan(1000);
      expect(avgTotal).toBeLessThan(3000);
    });
  });
});
