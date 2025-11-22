/**
 * Integration Tests: PLONK Verification API
 * 
 * Tests the /verify and /verify/batch endpoints with real PLONK proofs
 * from the test corpus generated in Task 2.8
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import express, { type Express } from 'express';
import { readFile, readdir } from 'fs/promises';
import { join } from 'path';
import verifyRouter from '../../src/routes/verify.js';
import { wasmVerifier } from '../../src/utils/wasm-loader.js';

describe('PLONK Verification Integration Tests', () => {
  let app: Express;
  const CIRCUITS_PATH = join(__dirname, '../../../circuits');
  const PROOFS_PATH = join(CIRCUITS_PATH, 'proofs/plonk');
  
  beforeAll(async () => {
    // Initialize Express app with verification routes
    app = express();
    app.use(express.json({ limit: '10mb' }));
    app.use('/', verifyRouter);
    
    // Initialize WASM verifier
    console.log('Initializing PLONK WASM verifier for tests...');
    await wasmVerifier.initialize();
    console.log('WASM verifier initialized');
  });

  afterAll(async () => {
    // Cleanup
  });

  describe('POST /verify - Single Proof Verification', () => {
    describe('Poseidon Circuit', () => {
      it('should verify a valid Poseidon proof', async () => {
        // Load a valid proof from test corpus
        const proofPath = join(PROOFS_PATH, 'poseidon_test/batch/proof_1');
        const proof = JSON.parse(await readFile(join(proofPath, 'proof.json'), 'utf-8'));
        const publicSignals = JSON.parse(await readFile(join(proofPath, 'public.json'), 'utf-8'));

        const response = await request(app)
          .post('/verify')
          .send({
            circuitType: 'poseidon_test',
            proof,
            publicSignals,
          })
          .expect(200);

        expect(response.body).toMatchObject({
          verified: true,
          circuitType: 'poseidon_test',
        });
        expect(response.body.proofHash).toBeDefined();
        expect(response.body.verificationTime).toBeGreaterThan(0);
      });

      it('should reject an invalid Poseidon proof', async () => {
        // Load an invalid proof from test corpus
        const proofPath = join(PROOFS_PATH, 'poseidon_test/batch');
        const dirs = await readdir(proofPath, { withFileTypes: true });
        const invalidProofDir = dirs.find(d => d.isDirectory() && d.name.includes('invalid'));
        
        if (invalidProofDir) {
          const invalidPath = join(proofPath, invalidProofDir.name);
          const proof = JSON.parse(await readFile(join(invalidPath, 'proof.json'), 'utf-8'));
          const publicSignals = JSON.parse(await readFile(join(invalidPath, 'public.json'), 'utf-8'));

          const response = await request(app)
            .post('/verify')
            .send({
              circuitType: 'poseidon_test',
              proof,
              publicSignals,
            })
            .expect(200);

          expect(response.body).toMatchObject({
            verified: false,
            circuitType: 'poseidon_test',
          });
        }
      });

      it('should reject tampered public signals', async () => {
        const proofPath = join(PROOFS_PATH, 'poseidon_test/batch/proof_1');
        const proof = JSON.parse(await readFile(join(proofPath, 'proof.json'), 'utf-8'));
        const publicSignals = JSON.parse(await readFile(join(proofPath, 'public.json'), 'utf-8'));

        // Tamper with public signals
        publicSignals[0] = '123456789';

        const response = await request(app)
          .post('/verify')
          .send({
            circuitType: 'poseidon_test',
            proof,
            publicSignals,
          })
          .expect(200);

        expect(response.body.verified).toBe(false);
      });
    });

    describe('EdDSA Circuit', () => {
      it('should verify a valid EdDSA proof', async () => {
        const proofPath = join(PROOFS_PATH, 'eddsa_verify/batch/proof_1');
        const proof = JSON.parse(await readFile(join(proofPath, 'proof.json'), 'utf-8'));
        const publicSignals = JSON.parse(await readFile(join(proofPath, 'public.json'), 'utf-8'));

        const response = await request(app)
          .post('/verify')
          .send({
            circuitType: 'eddsa_verify',
            proof,
            publicSignals,
          })
          .expect(200);

        expect(response.body.verified).toBe(true);
        expect(response.body.circuitType).toBe('eddsa_verify');
      });

      it('should reject invalid EdDSA signature proof', async () => {
        const proofPath = join(PROOFS_PATH, 'eddsa_verify/batch');
        const dirs = await readdir(proofPath, { withFileTypes: true });
        const invalidProofDir = dirs.find(d => d.isDirectory() && d.name.includes('invalid'));
        
        if (invalidProofDir) {
          const invalidPath = join(proofPath, invalidProofDir.name);
          const proof = JSON.parse(await readFile(join(invalidPath, 'proof.json'), 'utf-8'));
          const publicSignals = JSON.parse(await readFile(join(invalidPath, 'public.json'), 'utf-8'));

          const response = await request(app)
            .post('/verify')
            .send({
              circuitType: 'eddsa_verify',
              proof,
              publicSignals,
            })
            .expect(200);

          expect(response.body.verified).toBe(false);
        }
      });
    });

    describe('Merkle Circuit', () => {
      it('should verify a valid Merkle proof', async () => {
        const proofPath = join(PROOFS_PATH, 'merkle_proof/batch/proof_1');
        const proof = JSON.parse(await readFile(join(proofPath, 'proof.json'), 'utf-8'));
        const publicSignals = JSON.parse(await readFile(join(proofPath, 'public.json'), 'utf-8'));

        const response = await request(app)
          .post('/verify')
          .send({
            circuitType: 'merkle_proof',
            proof,
            publicSignals,
          })
          .expect(200);

        expect(response.body.verified).toBe(true);
        expect(response.body.circuitType).toBe('merkle_proof');
      });

      it('should reject invalid Merkle path proof', async () => {
        const proofPath = join(PROOFS_PATH, 'merkle_proof/batch');
        const dirs = await readdir(proofPath, { withFileTypes: true });
        const invalidProofDir = dirs.find(d => d.isDirectory() && d.name.includes('invalid'));
        
        if (invalidProofDir) {
          const invalidPath = join(proofPath, invalidProofDir.name);
          const proof = JSON.parse(await readFile(join(invalidPath, 'proof.json'), 'utf-8'));
          const publicSignals = JSON.parse(await readFile(join(invalidPath, 'public.json'), 'utf-8'));

          const response = await request(app)
            .post('/verify')
            .send({
              circuitType: 'merkle_proof',
              proof,
              publicSignals,
            })
            .expect(200);

          expect(response.body.verified).toBe(false);
        }
      });
    });

    describe('Error Handling', () => {
      it('should return 400 for missing circuitType', async () => {
        const response = await request(app)
          .post('/verify')
          .send({
            proof: {},
            publicSignals: [],
          })
          .expect(400);

        expect(response.body).toHaveProperty('error');
        expect(response.body.error).toContain('circuitType');
      });

      it('should return 400 for unsupported circuit type', async () => {
        const response = await request(app)
          .post('/verify')
          .send({
            circuitType: 'invalid_circuit',
            proof: {},
            publicSignals: [],
          })
          .expect(400);

        expect(response.body).toHaveProperty('error');
      });

      it('should return 400 for malformed proof', async () => {
        const response = await request(app)
          .post('/verify')
          .send({
            circuitType: 'poseidon_test',
            proof: { invalid: 'structure' },
            publicSignals: [],
          })
          .expect(400);

        expect(response.body).toHaveProperty('error');
      });

      it('should return 400 for missing public signals', async () => {
        const proofPath = join(PROOFS_PATH, 'poseidon_test/batch/proof_1');
        const proof = JSON.parse(await readFile(join(proofPath, 'proof.json'), 'utf-8'));

        const response = await request(app)
          .post('/verify')
          .send({
            circuitType: 'poseidon_test',
            proof,
            // publicSignals missing
          })
          .expect(400);

        expect(response.body).toHaveProperty('error');
      });

      it('should handle very large proof payloads', async () => {
        const largeProof = {
          pi_a: new Array(10000).fill('1'),
          pi_b: new Array(10000).fill(['1', '1']),
          pi_c: new Array(10000).fill('1'),
          protocol: 'plonk',
        };

        const response = await request(app)
          .post('/verify')
          .send({
            circuitType: 'poseidon_test',
            proof: largeProof,
            publicSignals: [],
          })
          .expect(400);

        expect(response.body).toHaveProperty('error');
      });
    });
  });

  describe('POST /verify/batch - Batch Verification', () => {
    it('should verify multiple valid proofs', async () => {
      // Load first 5 valid Poseidon proofs
      const proofs = [];
      for (let i = 1; i <= 5; i++) {
        const proofPath = join(PROOFS_PATH, `poseidon_test/batch/proof_${i}`);
        const proof = JSON.parse(await readFile(join(proofPath, 'proof.json'), 'utf-8'));
        const publicSignals = JSON.parse(await readFile(join(proofPath, 'public.json'), 'utf-8'));
        proofs.push({ circuitType: 'poseidon_test', proof, publicSignals });
      }

      const response = await request(app)
        .post('/verify/batch')
        .send({ proofs })
        .expect(200);

      expect(response.body.results).toHaveLength(5);
      expect(response.body.summary).toMatchObject({
        total: 5,
        verified: 5,
        failed: 0,
      });
      response.body.results.forEach((result: any) => {
        expect(result.verified).toBe(true);
      });
    });

    it('should handle mixed valid/invalid proofs in batch', async () => {
      const proofs = [];
      
      // Add 3 valid proofs
      for (let i = 1; i <= 3; i++) {
        const proofPath = join(PROOFS_PATH, `poseidon_test/batch/proof_${i}`);
        const proof = JSON.parse(await readFile(join(proofPath, 'proof.json'), 'utf-8'));
        const publicSignals = JSON.parse(await readFile(join(proofPath, 'public.json'), 'utf-8'));
        proofs.push({ circuitType: 'poseidon_test', proof, publicSignals });
      }

      // Add 2 proofs with tampered public signals
      for (let i = 4; i <= 5; i++) {
        const proofPath = join(PROOFS_PATH, `poseidon_test/batch/proof_${i}`);
        const proof = JSON.parse(await readFile(join(proofPath, 'proof.json'), 'utf-8'));
        const publicSignals = JSON.parse(await readFile(join(proofPath, 'public.json'), 'utf-8'));
        publicSignals[0] = '999999999'; // Tamper
        proofs.push({ circuitType: 'poseidon_test', proof, publicSignals });
      }

      const response = await request(app)
        .post('/verify/batch')
        .send({ proofs })
        .expect(200);

      expect(response.body.results).toHaveLength(5);
      expect(response.body.summary.total).toBe(5);
      expect(response.body.summary.verified).toBe(3);
      expect(response.body.summary.failed).toBe(2);
    });

    it('should verify proofs from different circuits in batch', async () => {
      const proofs = [];

      // Poseidon proof
      const poseidonPath = join(PROOFS_PATH, 'poseidon_test/batch/proof_1');
      proofs.push({
        circuitType: 'poseidon_test',
        proof: JSON.parse(await readFile(join(poseidonPath, 'proof.json'), 'utf-8')),
        publicSignals: JSON.parse(await readFile(join(poseidonPath, 'public.json'), 'utf-8')),
      });

      // EdDSA proof
      const eddsaPath = join(PROOFS_PATH, 'eddsa_verify/batch/proof_1');
      proofs.push({
        circuitType: 'eddsa_verify',
        proof: JSON.parse(await readFile(join(eddsaPath, 'proof.json'), 'utf-8')),
        publicSignals: JSON.parse(await readFile(join(eddsaPath, 'public.json'), 'utf-8')),
      });

      // Merkle proof
      const merklePath = join(PROOFS_PATH, 'merkle_proof/batch/proof_1');
      proofs.push({
        circuitType: 'merkle_proof',
        proof: JSON.parse(await readFile(join(merklePath, 'proof.json'), 'utf-8')),
        publicSignals: JSON.parse(await readFile(join(merklePath, 'public.json'), 'utf-8')),
      });

      const response = await request(app)
        .post('/verify/batch')
        .send({ proofs })
        .expect(200);

      expect(response.body.results).toHaveLength(3);
      expect(response.body.summary).toMatchObject({
        total: 3,
        verified: 3,
        failed: 0,
      });
    });

    it('should handle empty batch', async () => {
      const response = await request(app)
        .post('/verify/batch')
        .send({ proofs: [] })
        .expect(400);

      expect(response.body).toHaveProperty('error');
    });

    it('should enforce batch size limits', async () => {
      // Create batch exceeding limit (assuming 100 is the limit)
      const proofs = new Array(101).fill({
        circuitType: 'poseidon_test',
        proof: {},
        publicSignals: [],
      });

      const response = await request(app)
        .post('/verify/batch')
        .send({ proofs })
        .expect(400);

      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toContain('batch');
    });
  });

  describe('Performance & Stress Tests', () => {
    it('should verify 50 proofs in reasonable time', async () => {
      const proofs = [];
      for (let i = 1; i <= 50; i++) {
        const proofPath = join(PROOFS_PATH, `poseidon_test/batch/proof_${i}`);
        const proof = JSON.parse(await readFile(join(proofPath, 'proof.json'), 'utf-8'));
        const publicSignals = JSON.parse(await readFile(join(proofPath, 'public.json'), 'utf-8'));
        proofs.push({ circuitType: 'poseidon_test', proof, publicSignals });
      }

      const startTime = Date.now();
      const response = await request(app)
        .post('/verify/batch')
        .send({ proofs })
        .expect(200);
      const duration = Date.now() - startTime;

      expect(response.body.summary.total).toBe(50);
      expect(duration).toBeLessThan(30000); // Should complete in < 30 seconds
      console.log(`✓ Verified 50 proofs in ${duration}ms`);
    });

    it('should handle concurrent verification requests', async () => {
      const proofPath = join(PROOFS_PATH, 'poseidon_test/batch/proof_1');
      const proof = JSON.parse(await readFile(join(proofPath, 'proof.json'), 'utf-8'));
      const publicSignals = JSON.parse(await readFile(join(proofPath, 'public.json'), 'utf-8'));

      // Send 10 concurrent requests
      const requests = Array(10).fill(null).map(() =>
        request(app)
          .post('/verify')
          .send({
            circuitType: 'poseidon_test',
            proof,
            publicSignals,
          })
      );

      const responses = await Promise.all(requests);
      
      responses.forEach(res => {
        expect(res.status).toBe(200);
        expect(res.body.verified).toBe(true);
      });
    });

    it('should measure verification time per circuit type', async () => {
      const circuits = ['poseidon_test', 'eddsa_verify', 'merkle_proof'];
      const timings: Record<string, number[]> = {};

      for (const circuit of circuits) {
        timings[circuit] = [];
        
        // Verify 10 proofs and measure time
        for (let i = 1; i <= 10; i++) {
          const proofPath = join(PROOFS_PATH, `${circuit}/batch/proof_${i}`);
          const proof = JSON.parse(await readFile(join(proofPath, 'proof.json'), 'utf-8'));
          const publicSignals = JSON.parse(await readFile(join(proofPath, 'public.json'), 'utf-8'));

          const startTime = Date.now();
          await request(app)
            .post('/verify')
            .send({
              circuitType: circuit,
              proof,
              publicSignals,
            });
          const duration = Date.now() - startTime;
          timings[circuit].push(duration);
        }
      }

      // Calculate averages
      for (const circuit of circuits) {
        const avg = timings[circuit].reduce((a, b) => a + b, 0) / timings[circuit].length;
        console.log(`\n${circuit} average verification time: ${avg.toFixed(2)}ms`);
        expect(avg).toBeLessThan(1000); // Should be < 1 second per proof
      }
    });
  });
});
