/**
 * Attestor Integration Tests
 * 
 * Tests on-chain attestation functionality with the deployed attestor contract
 */

import { describe, it, expect, beforeAll } from 'vitest';
import { AttestorClient } from '../src/utils/attestor-client.js';
import type { Groth16Proof, VerificationKey } from '../src/utils/wasm-loader.js';
import { wasmVerifier } from '../src/utils/wasm-loader.js';
import validProof from './fixtures/valid-proof.json';
import verificationKey from './fixtures/verification-key.json';

describe('Attestor Integration', () => {
  let attestorClient: AttestorClient;
  let testProofHash: string;

  beforeAll(async () => {
    // Initialize attestor client (read-only, no private key)
    attestorClient = new AttestorClient(
      process.env.RPC_URL || 'https://sepolia-rollup.arbitrum.io/rpc',
      process.env.ATTESTOR_ADDRESS || '0x36e937ebcf56c5dec6ecb0695001becc87738177'
    );

    // Generate a test proof hash
    const result = await wasmVerifier.verify(
      validProof as Groth16Proof,
      ['1'],
      verificationKey as VerificationKey
    );
    testProofHash = result.proofHash || '0x' + '1'.repeat(64);
  });

  describe('Attestation Status Checks', () => {
    it('should check if proof is attested', async () => {
      const status = await attestorClient.isAttested(testProofHash);

      expect(status).toBeDefined();
      expect(status).toHaveProperty('isAttested');
      expect(typeof status.isAttested).toBe('boolean');
    });

    it('should return false for unattested proof', async () => {
      const randomHash = '0x' + '9'.repeat(64);
      const status = await attestorClient.isAttested(randomHash);

      expect(status.isAttested).toBe(false);
      expect(status.timestamp).toBeUndefined();
    });

    it('should include timestamp for attested proofs', async () => {
      // Note: This test will pass if the proof hasn't been attested yet
      const status = await attestorClient.isAttested(testProofHash);

      if (status.isAttested) {
        expect(status.timestamp).toBeDefined();
        expect(status.timestamp).toBeGreaterThan(0);
      }
    });
  });

  describe('Attestation Events', () => {
    it('should fetch attestation events', async () => {
      const events = await attestorClient.getAttestationEvents();

      expect(Array.isArray(events)).toBe(true);
      
      // If there are events, validate structure
      if (events.length > 0) {
        expect(events[0]).toHaveProperty('proofHash');
        expect(events[0]).toHaveProperty('timestamp');
        expect(events[0]).toHaveProperty('blockNumber');
        expect(events[0]).toHaveProperty('transactionHash');
      }
    });

    it('should filter events by proof hash', async () => {
      const events = await attestorClient.getAttestationEvents(testProofHash);

      expect(Array.isArray(events)).toBe(true);
      
      // All events should match the proof hash
      events.forEach(event => {
        expect(event.proofHash.toLowerCase()).toBe(testProofHash.toLowerCase());
      });
    });

    it('should return empty array for non-existent proof', async () => {
      const randomHash = '0x' + 'f'.repeat(64);
      const events = await attestorClient.getAttestationEvents(randomHash);

      expect(Array.isArray(events)).toBe(true);
      expect(events.length).toBe(0);
    });
  });

  describe('Gas Estimation', () => {
    it('should estimate gas for attestation', async () => {
      const gas = await attestorClient.estimateAttestationGas(testProofHash);

      expect(gas).toBeDefined();
      expect(typeof gas).toBe('bigint');
      expect(gas).toBeGreaterThan(0n);
      
      // Should be reasonable gas amount (30k-100k)
      expect(gas).toBeLessThan(200000n);
    });

    it('should provide consistent estimates', async () => {
      const gas1 = await attestorClient.estimateAttestationGas(testProofHash);
      const gas2 = await attestorClient.estimateAttestationGas(testProofHash);

      // Estimates should be similar (within 10%)
      const diff = gas1 > gas2 ? gas1 - gas2 : gas2 - gas1;
      const avgGas = (gas1 + gas2) / 2n;
      const percentDiff = Number(diff * 100n / avgGas);

      expect(percentDiff).toBeLessThan(10);
    });
  });

  describe('Error Handling', () => {
    it('should handle invalid proof hash format', async () => {
      const status = await attestorClient.isAttested('invalid-hash');

      // Should gracefully handle error
      expect(status).toBeDefined();
      expect(status.isAttested).toBe(false);
    });

    it('should handle RPC errors gracefully', async () => {
      // Create client with invalid RPC
      const badClient = new AttestorClient('https://invalid-rpc.example.com');

      const status = await badClient.isAttested(testProofHash);
      
      expect(status).toBeDefined();
      expect(status.isAttested).toBe(false);
    });

    it('should handle invalid contract address', async () => {
      const badClient = new AttestorClient(
        process.env.RPC_URL || 'https://sepolia-rollup.arbitrum.io/rpc',
        '0x0000000000000000000000000000000000000001'
      );

      const status = await badClient.isAttested(testProofHash);
      
      // Should not throw, but return sensible default
      expect(status).toBeDefined();
    });
  });

  describe('Attestation Flow (Read-Only)', () => {
    it('should return error when no private key configured', async () => {
      const result = await attestorClient.attestProof(testProofHash);

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
      expect(result.error).toContain('No wallet client');
    });
  });
});
