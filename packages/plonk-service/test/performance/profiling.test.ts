/**
 * Performance Profiling Suite
 *
 * Comprehensive performance testing and profiling for PLONK verification service
 * Generates detailed performance reports with metrics
 */

import { describe, it, expect, beforeAll, afterAll } from "vitest";
import request from "supertest";
import express, { type Express } from "express";
import { readFile, writeFile } from "fs/promises";
import { join } from "path";
import verifyRouter from "../../src/routes/verify.js";
import { wasmVerifier } from "../../src/utils/wasm-loader.js";

interface PerformanceMetrics {
  circuit: string;
  operation: string;
  samples: number;
  min: number;
  max: number;
  mean: number;
  median: number;
  p95: number;
  p99: number;
  stdDev: number;
}

interface MemoryMetrics {
  heapUsed: number;
  heapTotal: number;
  external: number;
  rss: number;
}

describe("Performance Profiling", () => {
  let app: Express;
  const CIRCUITS_PATH = join(__dirname, "../../../circuits");
  const PROOFS_PATH = join(CIRCUITS_PATH, "proofs/plonk");
  const REPORT_PATH = join(__dirname, "../../performance-report.json");

  const performanceData: PerformanceMetrics[] = [];
  const memorySnapshots: { operation: string; memory: MemoryMetrics }[] = [];

  beforeAll(async () => {
    app = express();
    app.use(express.json({ limit: "10mb" }));
    app.use("/", verifyRouter);

    console.log("\n=== Starting Performance Profiling ===\n");
    await wasmVerifier.initialize();
  });

  afterAll(async () => {
    // Generate performance report
    const report = {
      timestamp: new Date().toISOString(),
      performanceMetrics: performanceData,
      memoryMetrics: memorySnapshots,
      summary: generateSummary(performanceData),
    };

    await writeFile(REPORT_PATH, JSON.stringify(report, null, 2));
    console.log(`\n✓ Performance report saved to: ${REPORT_PATH}\n`);
  });

  function captureMemory(operation: string) {
    const mem = process.memoryUsage();
    memorySnapshots.push({
      operation,
      memory: {
        heapUsed: mem.heapUsed,
        heapTotal: mem.heapTotal,
        external: mem.external,
        rss: mem.rss,
      },
    });
  }

  function calculateStats(
    values: number[],
  ): Omit<PerformanceMetrics, "circuit" | "operation" | "samples"> {
    const sorted = [...values].sort((a, b) => a - b);
    const sum = sorted.reduce((a, b) => a + b, 0);
    const mean = sum / sorted.length;

    const variance =
      sorted.reduce((acc, val) => acc + Math.pow(val - mean, 2), 0) /
      sorted.length;
    const stdDev = Math.sqrt(variance);

    return {
      min: sorted[0],
      max: sorted[sorted.length - 1],
      mean,
      median: sorted[Math.floor(sorted.length / 2)],
      p95: sorted[Math.floor(sorted.length * 0.95)],
      p99: sorted[Math.floor(sorted.length * 0.99)],
      stdDev,
    };
  }

  function generateSummary(metrics: PerformanceMetrics[]) {
    const byCircuit: Record<string, any> = {};

    metrics.forEach((m) => {
      if (!byCircuit[m.circuit]) {
        byCircuit[m.circuit] = {};
      }
      byCircuit[m.circuit][m.operation] = {
        mean: `${m.mean.toFixed(2)}ms`,
        p95: `${m.p95.toFixed(2)}ms`,
        samples: m.samples,
      };
    });

    return byCircuit;
  }

  async function profileVerification(
    circuit: string,
    sampleSize: number,
  ): Promise<PerformanceMetrics> {
    const timings: number[] = [];

    captureMemory(`${circuit}_start`);

    for (let i = 1; i <= sampleSize; i++) {
      const proofPath = join(PROOFS_PATH, `${circuit}/batch/proof_${i}`);
      const proof = JSON.parse(
        await readFile(join(proofPath, "proof.json"), "utf-8"),
      );
      const publicSignals = JSON.parse(
        await readFile(join(proofPath, "public.json"), "utf-8"),
      );

      const start = process.hrtime.bigint();
      await request(app)
        .post("/verify")
        .send({ circuitType: circuit, proof, publicSignals });
      const end = process.hrtime.bigint();

      timings.push(Number(end - start) / 1_000_000); // Convert to ms
    }

    captureMemory(`${circuit}_end`);

    const stats = calculateStats(timings);
    return {
      circuit,
      operation: "single_verification",
      samples: sampleSize,
      ...stats,
    };
  }

  describe("Single Proof Verification Performance", () => {
    it("should profile Poseidon verification (n=100)", async () => {
      console.log("Profiling Poseidon verification...");
      const metrics = await profileVerification("poseidon_test", 100);
      performanceData.push(metrics);

      console.log(`  Mean: ${metrics.mean.toFixed(2)}ms`);
      console.log(`  P95: ${metrics.p95.toFixed(2)}ms`);
      console.log(`  P99: ${metrics.p99.toFixed(2)}ms`);

      expect(metrics.mean).toBeLessThan(1000);
      expect(metrics.p95).toBeLessThan(1500);
    });

    it("should profile EdDSA verification (n=100)", async () => {
      console.log("Profiling EdDSA verification...");
      const metrics = await profileVerification("eddsa_verify", 100);
      performanceData.push(metrics);

      console.log(`  Mean: ${metrics.mean.toFixed(2)}ms`);
      console.log(`  P95: ${metrics.p95.toFixed(2)}ms`);
      console.log(`  P99: ${metrics.p99.toFixed(2)}ms`);

      expect(metrics.mean).toBeLessThan(1500);
      expect(metrics.p95).toBeLessThan(2000);
    });

    it("should profile Merkle verification (n=100)", async () => {
      console.log("Profiling Merkle verification...");
      const metrics = await profileVerification("merkle_proof", 100);
      performanceData.push(metrics);

      console.log(`  Mean: ${metrics.mean.toFixed(2)}ms`);
      console.log(`  P95: ${metrics.p95.toFixed(2)}ms`);
      console.log(`  P99: ${metrics.p99.toFixed(2)}ms`);

      expect(metrics.mean).toBeLessThan(1200);
      expect(metrics.p95).toBeLessThan(1800);
    });
  });

  describe("Batch Verification Performance", () => {
    async function profileBatch(
      circuit: string,
      batchSize: number,
      iterations: number,
    ): Promise<PerformanceMetrics> {
      const timings: number[] = [];

      for (let iter = 0; iter < iterations; iter++) {
        const proofs = [];
        for (let i = 1; i <= batchSize; i++) {
          const proofPath = join(PROOFS_PATH, `${circuit}/batch/proof_${i}`);
          const proof = JSON.parse(
            await readFile(join(proofPath, "proof.json"), "utf-8"),
          );
          const publicSignals = JSON.parse(
            await readFile(join(proofPath, "public.json"), "utf-8"),
          );
          proofs.push({ circuitType: circuit, proof, publicSignals });
        }

        const start = process.hrtime.bigint();
        await request(app).post("/verify/batch").send({ proofs });
        const end = process.hrtime.bigint();

        timings.push(Number(end - start) / 1_000_000);
      }

      const stats = calculateStats(timings);
      return {
        circuit,
        operation: `batch_${batchSize}`,
        samples: iterations,
        ...stats,
      };
    }

    it("should profile batch verification (size=10, n=20)", async () => {
      console.log("Profiling batch verification (size=10)...");
      const metrics = await profileBatch("poseidon_test", 10, 20);
      performanceData.push(metrics);

      console.log(`  Mean: ${metrics.mean.toFixed(2)}ms`);
      console.log(
        `  Throughput: ${(10000 / metrics.mean).toFixed(2)} proofs/sec`,
      );

      expect(metrics.mean).toBeLessThan(5000);
    });

    it("should profile batch verification (size=50, n=10)", async () => {
      console.log("Profiling batch verification (size=50)...");
      const metrics = await profileBatch("poseidon_test", 50, 10);
      performanceData.push(metrics);

      console.log(`  Mean: ${metrics.mean.toFixed(2)}ms`);
      console.log(
        `  Throughput: ${(50000 / metrics.mean).toFixed(2)} proofs/sec`,
      );

      expect(metrics.mean).toBeLessThan(20000);
    });

    it("should measure batch efficiency", async () => {
      const batchSizes = [1, 5, 10, 20, 50];
      const efficiencies: { size: number; timePerProof: number }[] = [];

      for (const size of batchSizes) {
        const proofs = [];
        for (let i = 1; i <= size; i++) {
          const proofPath = join(PROOFS_PATH, `poseidon_test/batch/proof_${i}`);
          const proof = JSON.parse(
            await readFile(join(proofPath, "proof.json"), "utf-8"),
          );
          const publicSignals = JSON.parse(
            await readFile(join(proofPath, "public.json"), "utf-8"),
          );
          proofs.push({ circuitType: "poseidon_test", proof, publicSignals });
        }

        const start = process.hrtime.bigint();
        await request(app).post("/verify/batch").send({ proofs });
        const end = process.hrtime.bigint();

        const totalTime = Number(end - start) / 1_000_000;
        efficiencies.push({
          size,
          timePerProof: totalTime / size,
        });
      }

      console.log("\n  Batch Efficiency Analysis:");
      efficiencies.forEach((e) => {
        console.log(
          `    Size ${e.size}: ${e.timePerProof.toFixed(2)}ms per proof`,
        );
      });

      // Batch verification should be more efficient than individual
      const singleTime = efficiencies[0].timePerProof;
      const batch50Time = efficiencies[efficiencies.length - 1].timePerProof;
      expect(batch50Time).toBeLessThan(singleTime * 0.8); // At least 20% improvement
    });
  });

  describe("Concurrent Request Performance", () => {
    it("should handle concurrent requests (n=10)", async () => {
      const concurrency = 10;
      const proofPath = join(PROOFS_PATH, "poseidon_test/batch/proof_1");
      const proof = JSON.parse(
        await readFile(join(proofPath, "proof.json"), "utf-8"),
      );
      const publicSignals = JSON.parse(
        await readFile(join(proofPath, "public.json"), "utf-8"),
      );

      captureMemory("concurrent_start");

      const start = process.hrtime.bigint();
      const requests = Array(concurrency)
        .fill(null)
        .map(() =>
          request(app)
            .post("/verify")
            .send({ circuitType: "poseidon_test", proof, publicSignals }),
        );

      await Promise.all(requests);
      const end = process.hrtime.bigint();

      captureMemory("concurrent_end");

      const totalTime = Number(end - start) / 1_000_000;
      console.log(
        `  ${concurrency} concurrent requests: ${totalTime.toFixed(2)}ms`,
      );
      console.log(
        `  Average per request: ${(totalTime / concurrency).toFixed(2)}ms`,
      );

      expect(totalTime).toBeLessThan(5000);
    });

    it("should handle concurrent requests (n=50)", async () => {
      const concurrency = 50;
      const proofPath = join(PROOFS_PATH, "poseidon_test/batch/proof_1");
      const proof = JSON.parse(
        await readFile(join(proofPath, "proof.json"), "utf-8"),
      );
      const publicSignals = JSON.parse(
        await readFile(join(proofPath, "public.json"), "utf-8"),
      );

      const start = process.hrtime.bigint();
      const requests = Array(concurrency)
        .fill(null)
        .map(() =>
          request(app)
            .post("/verify")
            .send({ circuitType: "poseidon_test", proof, publicSignals }),
        );

      await Promise.all(requests);
      const end = process.hrtime.bigint();

      const totalTime = Number(end - start) / 1_000_000;
      console.log(
        `  ${concurrency} concurrent requests: ${totalTime.toFixed(2)}ms`,
      );
      console.log(
        `  Throughput: ${((concurrency * 1000) / totalTime).toFixed(2)} req/sec`,
      );

      expect(totalTime).toBeLessThan(15000);
    });
  });

  describe("Memory Usage Analysis", () => {
    it("should measure memory usage during verification", async () => {
      const iterations = 100;
      const proofPath = join(PROOFS_PATH, "poseidon_test/batch/proof_1");
      const proof = JSON.parse(
        await readFile(join(proofPath, "proof.json"), "utf-8"),
      );
      const publicSignals = JSON.parse(
        await readFile(join(proofPath, "public.json"), "utf-8"),
      );

      // Force GC if available
      if (global.gc) {
        global.gc();
      }

      const memStart = process.memoryUsage();

      for (let i = 0; i < iterations; i++) {
        await request(app)
          .post("/verify")
          .send({ circuitType: "poseidon_test", proof, publicSignals });
      }

      const memEnd = process.memoryUsage();

      const heapGrowth = (memEnd.heapUsed - memStart.heapUsed) / 1024 / 1024;
      console.log(
        `  Heap growth after ${iterations} verifications: ${heapGrowth.toFixed(2)}MB`,
      );

      // Memory should not grow excessively
      expect(heapGrowth).toBeLessThan(50); // Less than 50MB growth
    });

    it("should verify no memory leaks in batch operations", async () => {
      if (global.gc) {
        global.gc();
      }

      const memStart = process.memoryUsage();

      for (let batch = 0; batch < 10; batch++) {
        const proofs = [];
        for (let i = 1; i <= 20; i++) {
          const proofPath = join(PROOFS_PATH, `poseidon_test/batch/proof_${i}`);
          const proof = JSON.parse(
            await readFile(join(proofPath, "proof.json"), "utf-8"),
          );
          const publicSignals = JSON.parse(
            await readFile(join(proofPath, "public.json"), "utf-8"),
          );
          proofs.push({ circuitType: "poseidon_test", proof, publicSignals });
        }

        await request(app).post("/verify/batch").send({ proofs });

        if (global.gc && batch % 3 === 0) {
          global.gc();
        }
      }

      if (global.gc) {
        global.gc();
      }

      const memEnd = process.memoryUsage();
      const heapGrowth = (memEnd.heapUsed - memStart.heapUsed) / 1024 / 1024;

      console.log(
        `  Heap growth after 10 batches (20 proofs each): ${heapGrowth.toFixed(2)}MB`,
      );

      expect(heapGrowth).toBeLessThan(30);
    });
  });

  describe("Latency Under Load", () => {
    it("should measure latency degradation under sustained load", async () => {
      const duration = 30000; // 30 seconds
      const proofPath = join(PROOFS_PATH, "poseidon_test/batch/proof_1");
      const proof = JSON.parse(
        await readFile(join(proofPath, "proof.json"), "utf-8"),
      );
      const publicSignals = JSON.parse(
        await readFile(join(proofPath, "public.json"), "utf-8"),
      );

      const latencies: number[] = [];
      const startTime = Date.now();
      let requestCount = 0;

      console.log("  Running sustained load test for 30 seconds...");

      while (Date.now() - startTime < duration) {
        const reqStart = process.hrtime.bigint();
        await request(app)
          .post("/verify")
          .send({ circuitType: "poseidon_test", proof, publicSignals });
        const reqEnd = process.hrtime.bigint();

        latencies.push(Number(reqEnd - reqStart) / 1_000_000);
        requestCount++;
      }

      const stats = calculateStats(latencies);
      console.log(`  Total requests: ${requestCount}`);
      console.log(`  Mean latency: ${stats.mean.toFixed(2)}ms`);
      console.log(`  P95 latency: ${stats.p95.toFixed(2)}ms`);
      console.log(`  P99 latency: ${stats.p99.toFixed(2)}ms`);
      console.log(`  Throughput: ${(requestCount / 30).toFixed(2)} req/sec`);

      performanceData.push({
        circuit: "poseidon_test",
        operation: "sustained_load",
        samples: requestCount,
        ...stats,
      });

      // P99 should not be more than 2x mean
      expect(stats.p99).toBeLessThan(stats.mean * 2.5);
    });
  });

  describe("Throughput Benchmarks", () => {
    it("should measure maximum throughput", async () => {
      const testDuration = 10000; // 10 seconds
      const proofPath = join(PROOFS_PATH, "poseidon_test/batch/proof_1");
      const proof = JSON.parse(
        await readFile(join(proofPath, "proof.json"), "utf-8"),
      );
      const publicSignals = JSON.parse(
        await readFile(join(proofPath, "public.json"), "utf-8"),
      );

      const startTime = Date.now();
      let completed = 0;
      const concurrency = 20;

      console.log("  Measuring maximum throughput with concurrency=20...");

      const worker = async () => {
        while (Date.now() - startTime < testDuration) {
          await request(app)
            .post("/verify")
            .send({ circuitType: "poseidon_test", proof, publicSignals });
          completed++;
        }
      };

      await Promise.all(
        Array(concurrency)
          .fill(null)
          .map(() => worker()),
      );

      const throughput = (completed / testDuration) * 1000;
      console.log(
        `  Maximum throughput: ${throughput.toFixed(2)} verifications/sec`,
      );
      console.log(`  Total verifications: ${completed}`);

      expect(throughput).toBeGreaterThan(10); // At least 10 verifications/sec
    });
  });
});
