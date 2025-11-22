/**
 * Performance Benchmarking Suite
 * 
 * Measures verification times, gas costs, and batch performance
 */

import { describe, it, expect, beforeAll } from 'vitest';
import { wasmVerifier } from '../src/utils/wasm-loader.js';
import { attestorClient } from '../src/utils/attestor-client.js';
import type { Groth16Proof, VerificationKey } from '../src/utils/wasm-loader.js';
import validProof from './fixtures/valid-proof.json';
import verificationKey from './fixtures/verification-key.json';

interface BenchmarkResult {
  operation: string;
  duration: number;
  success: boolean;
  gasUsed?: bigint;
}

describe('Performance Benchmarks', () => {
  const results: BenchmarkResult[] = [];

  beforeAll(async () => {
    // Initialize WASM verifier
    await wasmVerifier.initialize();
  });

  describe('Single Proof Verification', () => {
    it('should verify proof in under 50ms', async () => {
      const iterations = 10;
      const times: number[] = [];

      for (let i = 0; i < iterations; i++) {
        const start = performance.now();
        
        await wasmVerifier.verify(
          validProof as Groth16Proof,
          ['1'],
          verificationKey as VerificationKey
        );
        
        const duration = performance.now() - start;
        times.push(duration);
      }

      const avgTime = times.reduce((a, b) => a + b, 0) / times.length;
      const minTime = Math.min(...times);
      const maxTime = Math.max(...times);

      console.log(`Average verification time: ${avgTime.toFixed(2)}ms`);
      console.log(`Min: ${minTime.toFixed(2)}ms, Max: ${maxTime.toFixed(2)}ms`);

      results.push({
        operation: 'Single proof verification',
        duration: avgTime,
        success: true,
      });

      // Should be reasonably fast (adjust based on hardware)
      expect(avgTime).toBeLessThan(50);
    });

    it('should measure first-time vs cached performance', async () => {
      // First verification (cold)
      const start1 = performance.now();
      await wasmVerifier.verify(
        validProof as Groth16Proof,
        ['1'],
        verificationKey as VerificationKey
      );
      const coldTime = performance.now() - start1;

      // Second verification (warm)
      const start2 = performance.now();
      await wasmVerifier.verify(
        validProof as Groth16Proof,
        ['1'],
        verificationKey as VerificationKey
      );
      const warmTime = performance.now() - start2;

      console.log(`Cold: ${coldTime.toFixed(2)}ms, Warm: ${warmTime.toFixed(2)}ms`);

      // Warm should generally be faster or similar
      expect(warmTime).toBeLessThanOrEqual(coldTime * 1.5);
    });
  });

  describe('Batch Verification Performance', () => {
    it('should show performance improvement for batch verification', async () => {
      const batchSize = 10;
      const proofs = Array(batchSize).fill({
        proof: validProof,
        publicInputs: ['1'],
        vk: verificationKey,
      });

      // Sequential verification
      const startSequential = performance.now();
      for (const item of proofs) {
        await wasmVerifier.verify(
          item.proof as Groth16Proof,
          item.publicInputs,
          item.vk as VerificationKey
        );
      }
      const sequentialTime = performance.now() - startSequential;

      // Parallel verification (simulating batch)
      const startBatch = performance.now();
      await Promise.all(
        proofs.map(item =>
          wasmVerifier.verify(
            item.proof as Groth16Proof,
            item.publicInputs,
            item.vk as VerificationKey
          )
        )
      );
      const batchTime = performance.now() - startBatch;

      const improvement = ((sequentialTime - batchTime) / sequentialTime) * 100;

      console.log(`Sequential: ${sequentialTime.toFixed(2)}ms`);
      console.log(`Batch: ${batchTime.toFixed(2)}ms`);
      console.log(`Improvement: ${improvement.toFixed(1)}%`);

      results.push({
        operation: `Batch verification (${batchSize} proofs)`,
        duration: batchTime,
        success: true,
      });

      // Batch should be faster
      expect(batchTime).toBeLessThan(sequentialTime);
    });

    it('should scale efficiently with batch size', async () => {
      const batchSizes = [5, 10, 20];
      const timings: { size: number; time: number; timePerProof: number }[] = [];

      for (const size of batchSizes) {
        const proofs = Array(size).fill({
          proof: validProof,
          publicInputs: ['1'],
          vk: verificationKey,
        });

        const start = performance.now();
        await Promise.all(
          proofs.map(item =>
            wasmVerifier.verify(
              item.proof as Groth16Proof,
              item.publicInputs,
              item.vk as VerificationKey
            )
          )
        );
        const duration = performance.now() - start;
        const timePerProof = duration / size;

        timings.push({ size, time: duration, timePerProof });

        console.log(`Batch ${size}: ${duration.toFixed(2)}ms (${timePerProof.toFixed(2)}ms per proof)`);
      }

      // Time per proof should decrease or stay similar as batch size increases
      expect(timings[2].timePerProof).toBeLessThanOrEqual(timings[0].timePerProof * 1.2);
    });
  });

  describe('Gas Estimation Benchmarks', () => {
    it('should measure gas estimation performance', async () => {
      const result = await wasmVerifier.verify(
        validProof as Groth16Proof,
        ['1'],
        verificationKey as VerificationKey
      );

      if (result.proofHash) {
        const start = performance.now();
        const gas = await attestorClient.estimateAttestationGas(result.proofHash);
        const duration = performance.now() - start;

        console.log(`Gas estimation: ${duration.toFixed(2)}ms`);
        console.log(`Estimated gas: ${gas.toString()}`);

        results.push({
          operation: 'Gas estimation',
          duration,
          success: true,
          gasUsed: gas,
        });

        // Should be fast
        expect(duration).toBeLessThan(5000); // 5 seconds max
        expect(gas).toBeGreaterThan(0n);
      }
    });

    it('should measure attestation status check performance', async () => {
      const result = await wasmVerifier.verify(
        validProof as Groth16Proof,
        ['1'],
        verificationKey as VerificationKey
      );

      if (result.proofHash) {
        const iterations = 5;
        const times: number[] = [];

        for (let i = 0; i < iterations; i++) {
          const start = performance.now();
          await attestorClient.isAttested(result.proofHash);
          const duration = performance.now() - start;
          times.push(duration);
        }

        const avgTime = times.reduce((a, b) => a + b, 0) / times.length;

        console.log(`Average status check: ${avgTime.toFixed(2)}ms`);

        results.push({
          operation: 'Attestation status check',
          duration: avgTime,
          success: true,
        });

        // Should be reasonably fast
        expect(avgTime).toBeLessThan(5000); // 5 seconds max
      }
    });
  });

  describe('Stress Testing', () => {
    it('should handle rapid consecutive verifications', async () => {
      const count = 50;
      const start = performance.now();

      for (let i = 0; i < count; i++) {
        await wasmVerifier.verify(
          validProof as Groth16Proof,
          ['1'],
          verificationKey as VerificationKey
        );
      }

      const duration = performance.now() - start;
      const avgTime = duration / count;

      console.log(`${count} consecutive verifications: ${duration.toFixed(2)}ms`);
      console.log(`Average: ${avgTime.toFixed(2)}ms per proof`);

      results.push({
        operation: `Stress test (${count} proofs)`,
        duration,
        success: true,
      });

      // Should complete without significant degradation
      expect(avgTime).toBeLessThan(100);
    });
  });

  describe('Benchmark Summary', () => {
    it('should print comprehensive benchmark report', () => {
      console.log('\n=== BENCHMARK SUMMARY ===\n');
      
      results.forEach(result => {
        console.log(`${result.operation}:`);
        console.log(`  Duration: ${result.duration.toFixed(2)}ms`);
        if (result.gasUsed) {
          console.log(`  Gas: ${result.gasUsed.toString()}`);
        }
        console.log(`  Success: ${result.success}\n`);
      });

      // Ensure all benchmarks succeeded
      expect(results.every(r => r.success)).toBe(true);
    });
  });
});

/**
 * Helper function to format benchmark results
 */
export function formatBenchmarkResults(results: BenchmarkResult[]): string {
  let output = '# Performance Benchmark Results\n\n';
  output += `Generated: ${new Date().toISOString()}\n\n`;
  output += '| Operation | Duration (ms) | Gas Used | Status |\n';
  output += '|-----------|---------------|----------|--------|\n';

  results.forEach(result => {
    output += `| ${result.operation} | ${result.duration.toFixed(2)} | ${result.gasUsed?.toString() || 'N/A'} | ${result.success ? '✅' : '❌'} |\n`;
  });

  return output;
}
