/**
 * API Endpoint Integration Tests
 * 
 * Tests all REST API endpoints for the Groth16 verification service
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import express, { type Express } from 'express';
import request from 'supertest';
import verifyRouter from '../src/routes/verify.js';
import validProof from './fixtures/valid-proof.json';
import validPublic from './fixtures/valid-public.json';
import verificationKey from './fixtures/verification-key.json';

describe('API Endpoints', () => {
  let app: Express;

  beforeAll(() => {
    // Create test app
    app = express();
    app.use(express.json());
    app.use('/', verifyRouter);
  });

  describe('GET /health', () => {
    it('should return healthy status', async () => {
      const response = await request(app)
        .get('/health')
        .expect(200);

      expect(response.body).toHaveProperty('status', 'ok');
      expect(response.body).toHaveProperty('service', 'groth16-verification');
      expect(response.body).toHaveProperty('timestamp');
    });
  });

  describe('POST /verify', () => {
    it('should verify a valid proof', async () => {
      const response = await request(app)
        .post('/verify')
        .send({
          proof: validProof,
          publicInputs: validPublic as string[],
          vk: verificationKey,
          attestOnChain: false,
        });

      if (response.status !== 200) {
        console.error('Error response:', JSON.stringify(response.body, null, 2));
      }
      
      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('valid');
      expect(response.body).toHaveProperty('proofHash');
    });

    it('should reject invalid proof structure', async () => {
      const response = await request(app)
        .post('/verify')
        .send({
          proof: { invalid: 'proof' },
          publicInputs: validPublic as string[],
          vk: verificationKey,
        })
        .expect(400);

      expect(response.body).toHaveProperty('error');
    });

    it('should reject missing required fields', async () => {
      const response = await request(app)
        .post('/verify')
        .send({
          proof: validProof,
          // Missing publicInputs and vk
        })
        .expect(400);

      expect(response.body).toHaveProperty('error');
    });

    it('should handle malformed JSON', async () => {
      const response = await request(app)
        .post('/verify')
        .set('Content-Type', 'application/json')
        .send('{ invalid json')
        .expect(400);
    });

    it('should handle empty body', async () => {
      const response = await request(app)
        .post('/verify')
        .send({})
        .expect(400);

      expect(response.body).toHaveProperty('error');
    });
  });

  describe('POST /verify/batch', () => {
    it('should verify multiple proofs', async () => {
      const response = await request(app)
        .post('/verify/batch')
        .send({
          proofs: [
            {
              proof: validProof,
              publicInputs: validPublic as string[],
              vk: verificationKey,
            },
            {
              proof: validProof,
              publicInputs: ['2'],
              vk: verificationKey,
            },
          ],
        })
        .expect(200);

      expect(response.body).toHaveProperty('totalProofs', 2);
      expect(response.body).toHaveProperty('validProofs');
      expect(response.body).toHaveProperty('invalidProofs');
      expect(response.body).toHaveProperty('results');
      expect(response.body.results).toHaveLength(2);
    });

    it('should reject empty batch', async () => {
      const response = await request(app)
        .post('/verify/batch')
        .send({
          proofs: [],
        })
        .expect(400);

      expect(response.body).toHaveProperty('error');
    });

    it('should reject batch over limit', async () => {
      const proofs = Array(101).fill({
        proof: validProof,
        publicInputs: validPublic as string[],
        vk: verificationKey,
      });

      const response = await request(app)
        .post('/verify/batch')
        .send({ proofs })
        .expect(413); // Payload Too Large

      // 413 is returned by Express body size limit, not our validation
    });

    it('should handle mixed valid/invalid proofs', async () => {
      const response = await request(app)
        .post('/verify/batch')
        .send({
          proofs: [
            {
              proof: validProof,
              publicInputs: validPublic as string[],
              vk: verificationKey,
            },
            {
              proof: { invalid: 'proof' },
              publicInputs: validPublic as string[],
              vk: verificationKey,
            },
          ],
        })
        .expect(200);

      expect(response.body.results).toHaveLength(2);
      expect(response.body.results[1]).toHaveProperty('valid', false);
      expect(response.body.results[1]).toHaveProperty('error');
    });
  });

  describe('GET /attestation/:proofHash', () => {
    it('should check attestation status', async () => {
      const validHash = '0x' + '1'.repeat(64);
      
      const response = await request(app)
        .get(`/attestation/${validHash}`)
        .expect(200);

      expect(response.body).toHaveProperty('proofHash', validHash);
      expect(response.body).toHaveProperty('isAttested');
    });

    it('should reject invalid proof hash format', async () => {
      const response = await request(app)
        .get('/attestation/invalid-hash')
        .expect(400);

      expect(response.body).toHaveProperty('error');
    });

    it('should reject short hash', async () => {
      const response = await request(app)
        .get('/attestation/0x1234')
        .expect(400);

      expect(response.body.error).toContain('Invalid proof hash format');
    });
  });

  describe('GET /attestation/events', () => {
    it('should fetch attestation events', async () => {
      // Note: This endpoint may require proofHash parameter depending on implementation
      const response = await request(app)
        .get('/attestation/events?proofHash=0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef')
        .expect(200);

      expect(response.body).toHaveProperty('events');
      expect(Array.isArray(response.body.events)).toBe(true);
    });

    it('should filter events by proof hash', async () => {
      const validHash = '0x' + '1'.repeat(64);
      
      const response = await request(app)
        .get(`/attestation/events?proofHash=${validHash}`)
        .expect(200);

      expect(response.body).toHaveProperty('events');
    });
  });
});
