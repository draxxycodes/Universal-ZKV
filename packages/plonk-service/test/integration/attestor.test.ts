/**
 * Integration Tests: Attestor Contract Integration
 * 
 * Tests interaction with the on-chain attestor contract
 * Requires Arbitrum Sepolia connection
 */

import { describe, it, expect, beforeAll } from 'vitest';
import request from 'supertest';
import express, { type Express } from 'express';
import { readFile } from 'fs/promises';
import { join } from 'path';
import verifyRouter from '../../src/routes/verify.js';
import { wasmVerifier } from '../../src/utils/wasm-loader.js';

describe('Attestor Integration Tests', () => {
  let app: Express;
  const CIRCUITS_PATH = join(__dirname, '../../../circuits');
  const PROOFS_PATH = join(CIRCUITS_PATH, 'proofs/plonk');

  beforeAll(async () => {
    app = express();
    app.use(express.json({ limit: '10mb' }));
    app.use('/', verifyRouter);
    
    await wasmVerifier.initialize();
  });

  describe('POST /verify with attestation', () => {
    it('should verify proof and submit attestation', async () => {
      const proofPath = join(PROOFS_PATH, 'poseidon_test/batch/proof_1');
      const proof = JSON.parse(await readFile(join(proofPath, 'proof.json'), 'utf-8'));
      const publicSignals = JSON.parse(await readFile(join(proofPath, 'public.json'), 'utf-8'));

      const response = await request(app)
        .post('/verify')
        .send({
          circuitType: 'poseidon_test',
          proof,
          publicSignals,
          submitAttestation: true,
        })
        .expect(200);

      expect(response.body.verified).toBe(true);
      expect(response.body.proofHash).toBeDefined();
      
      // Check attestation submission
      if (process.env.ATTESTOR_ADDRESS && process.env.PRIVATE_KEY) {
        expect(response.body.attestation).toBeDefined();
        expect(response.body.attestation.submitted).toBe(true);
        expect(response.body.attestation.txHash).toBeDefined();
      }
    });

    it('should not submit attestation when flag is false', async () => {
      const proofPath = join(PROOFS_PATH, 'poseidon_test/batch/proof_2');
      const proof = JSON.parse(await readFile(join(proofPath, 'proof.json'), 'utf-8'));
      const publicSignals = JSON.parse(await readFile(join(proofPath, 'public.json'), 'utf-8'));

      const response = await request(app)
        .post('/verify')
        .send({
          circuitType: 'poseidon_test',
          proof,
          publicSignals,
          submitAttestation: false,
        })
        .expect(200);

      expect(response.body.verified).toBe(true);
      expect(response.body.attestation).toBeUndefined();
    });

    it('should handle attestation submission failure gracefully', async () => {
      // This test requires invalid attestor config to trigger failure
      // Save original env vars
      const originalAddress = process.env.ATTESTOR_ADDRESS;
      const originalKey = process.env.PRIVATE_KEY;

      // Set invalid config
      process.env.ATTESTOR_ADDRESS = '0x0000000000000000000000000000000000000000';
      process.env.PRIVATE_KEY = '0x0000000000000000000000000000000000000000000000000000000000000001';

      const proofPath = join(PROOFS_PATH, 'poseidon_test/batch/proof_3');
      const proof = JSON.parse(await readFile(join(proofPath, 'proof.json'), 'utf-8'));
      const publicSignals = JSON.parse(await readFile(join(proofPath, 'public.json'), 'utf-8'));

      const response = await request(app)
        .post('/verify')
        .send({
          circuitType: 'poseidon_test',
          proof,
          publicSignals,
          submitAttestation: true,
        })
        .expect(200);

      // Verification should succeed even if attestation fails
      expect(response.body.verified).toBe(true);
      expect(response.body.attestation?.submitted).toBe(false);
      expect(response.body.attestation?.error).toBeDefined();

      // Restore env vars
      if (originalAddress) process.env.ATTESTOR_ADDRESS = originalAddress;
      if (originalKey) process.env.PRIVATE_KEY = originalKey;
    });
  });

  describe('GET /attestation/:proofHash', () => {
    it('should retrieve attestation status by proof hash', async () => {
      // First verify and attest a proof
      const proofPath = join(PROOFS_PATH, 'poseidon_test/batch/proof_10');
      const proof = JSON.parse(await readFile(join(proofPath, 'proof.json'), 'utf-8'));
      const publicSignals = JSON.parse(await readFile(join(proofPath, 'public.json'), 'utf-8'));

      const verifyResponse = await request(app)
        .post('/verify')
        .send({
          circuitType: 'poseidon_test',
          proof,
          publicSignals,
          submitAttestation: true,
        });

      const proofHash = verifyResponse.body.proofHash;

      // Query attestation status
      const response = await request(app)
        .get(`/attestation/${proofHash}`)
        .expect(200);

      expect(response.body).toHaveProperty('proofHash', proofHash);
      expect(response.body).toHaveProperty('attested');
      
      if (response.body.attested) {
        expect(response.body).toHaveProperty('timestamp');
        expect(response.body).toHaveProperty('blockNumber');
      }
    });

    it('should return 404 for non-existent proof hash', async () => {
      const fakeHash = '0x' + '0'.repeat(64);
      
      const response = await request(app)
        .get(`/attestation/${fakeHash}`)
        .expect(404);

      expect(response.body).toHaveProperty('error');
    });

    it('should validate proof hash format', async () => {
      const response = await request(app)
        .get('/attestation/invalid-hash')
        .expect(400);

      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toContain('hash');
    });
  });

  describe('GET /attestation/events', () => {
    it('should retrieve recent attestation events', async () => {
      const response = await request(app)
        .get('/attestation/events')
        .query({ limit: 10 })
        .expect(200);

      expect(response.body).toHaveProperty('events');
      expect(Array.isArray(response.body.events)).toBe(true);
      
      if (response.body.events.length > 0) {
        const event = response.body.events[0];
        expect(event).toHaveProperty('proofHash');
        expect(event).toHaveProperty('timestamp');
        expect(event).toHaveProperty('blockNumber');
        expect(event).toHaveProperty('txHash');
      }
    });

    it('should filter events by circuit type', async () => {
      const response = await request(app)
        .get('/attestation/events')
        .query({ circuitType: 'poseidon_test', limit: 5 })
        .expect(200);

      expect(response.body.events).toBeDefined();
      response.body.events.forEach((event: any) => {
        expect(event.circuitType).toBe('poseidon_test');
      });
    });

    it('should filter events by time range', async () => {
      const now = Math.floor(Date.now() / 1000);
      const oneDayAgo = now - 86400;

      const response = await request(app)
        .get('/attestation/events')
        .query({ fromTimestamp: oneDayAgo, toTimestamp: now })
        .expect(200);

      expect(response.body.events).toBeDefined();
      response.body.events.forEach((event: any) => {
        expect(event.timestamp).toBeGreaterThanOrEqual(oneDayAgo);
        expect(event.timestamp).toBeLessThanOrEqual(now);
      });
    });

    it('should paginate results', async () => {
      const response1 = await request(app)
        .get('/attestation/events')
        .query({ limit: 5, offset: 0 })
        .expect(200);

      const response2 = await request(app)
        .get('/attestation/events')
        .query({ limit: 5, offset: 5 })
        .expect(200);

      expect(response1.body.events).toHaveLength(Math.min(5, response1.body.total || 5));
      
      if (response1.body.events.length > 0 && response2.body.events.length > 0) {
        expect(response1.body.events[0].proofHash).not.toBe(response2.body.events[0].proofHash);
      }
    });

    it('should handle large limit values', async () => {
      const response = await request(app)
        .get('/attestation/events')
        .query({ limit: 1000 })
        .expect(400);

      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toContain('limit');
    });
  });

  describe('Attestor Contract Health', () => {
    it('should verify attestor contract is accessible', async () => {
      const response = await request(app)
        .get('/health')
        .expect(200);

      expect(response.body).toHaveProperty('attestor');
      
      if (process.env.ATTESTOR_ADDRESS) {
        expect(response.body.attestor).toHaveProperty('address');
        expect(response.body.attestor).toHaveProperty('network');
        expect(response.body.attestor).toHaveProperty('connected');
      }
    });
  });
});
