/**
 * PLONK Verification Routes
 * 
 * REST API endpoints for proof verification
 */

import { Router, type Request, type Response } from 'express';
import { z } from 'zod';
import { keccak256, type Hash } from 'viem';
import pino from 'pino';
import { wasmVerifier } from '../utils/wasm-loader.js';
import { attestorClient } from '../utils/attestor.js';

const logger = pino({ name: 'verify-routes' });
const router = Router();

// Validation schemas
const verifySchema = z.object({
  proof: z.string().regex(/^0x[0-9a-fA-F]+$/, 'Invalid hex string'),
  publicInputs: z.string().regex(/^0x[0-9a-fA-F]+$/, 'Invalid hex string'),
  vkHash: z.string().regex(/^0x[0-9a-fA-F]{64}$/, 'VK hash must be 32 bytes hex'),
});

const batchVerifySchema = z.object({
  proofs: z.array(verifySchema).min(1).max(100),
});

/**
 * POST /verify
 * Verify a single PLONK proof
 */
router.post('/verify', async (req: Request, res: Response) => {
  const startTime = Date.now();

  try {
    // Validate request body
    const validation = verifySchema.safeParse(req.body);
    if (!validation.success) {
      return res.status(400).json({
        error: 'Invalid request',
        details: validation.error.errors,
      });
    }

    const { proof, publicInputs, vkHash } = validation.data;

    // Convert hex strings to Uint8Array
    const proofBytes = hexToBytes(proof);
    const publicInputsBytes = hexToBytes(publicInputs);
    const vkHashBytes = hexToBytes(vkHash);

    // Check size limits
    const maxProofSize = parseInt(process.env.MAX_PROOF_SIZE || '10240', 10);
    if (proofBytes.length > maxProofSize) {
      return res.status(400).json({
        error: 'Proof too large',
        maxSize: maxProofSize,
        actualSize: proofBytes.length,
      });
    }

    // Compute proof hash for attestation
    const proofHash = keccak256(proofBytes) as Hash;

    logger.info({ proofHash }, 'Verifying PLONK proof');

    // Verify proof using WASM
    const isValid = await wasmVerifier.verify(
      proofBytes,
      publicInputsBytes,
      vkHashBytes
    );

    const verificationTime = Date.now() - startTime;

    logger.info({
      proofHash,
      isValid,
      verificationTime,
    }, 'Proof verification complete');

    // Submit attestation (async, don't wait)
    if (process.env.ATTESTOR_PRIVATE_KEY) {
      attestorClient.attest(proofHash, isValid).catch((error) => {
        logger.error({ error, proofHash }, 'Attestation failed');
      });
    }

    res.json({
      isValid,
      proofHash,
      verificationTime,
      proofSystem: 'PLONK',
      curve: 'BN254',
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    logger.error({ error }, 'Verification failed');
    res.status(500).json({
      error: 'Verification failed',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * POST /verify/batch
 * Verify multiple PLONK proofs
 */
router.post('/verify/batch', async (req: Request, res: Response) => {
  const startTime = Date.now();

  try {
    // Validate request body
    const validation = batchVerifySchema.safeParse(req.body);
    if (!validation.success) {
      return res.status(400).json({
        error: 'Invalid request',
        details: validation.error.errors,
      });
    }

    const { proofs } = validation.data;

    logger.info({ count: proofs.length }, 'Verifying batch of PLONK proofs');

    // Verify all proofs
    const results = await Promise.all(
      proofs.map(async ({ proof, publicInputs, vkHash }) => {
        try {
          const proofBytes = hexToBytes(proof);
          const publicInputsBytes = hexToBytes(publicInputs);
          const vkHashBytes = hexToBytes(vkHash);

          const proofHash = keccak256(proofBytes) as Hash;
          const isValid = await wasmVerifier.verify(
            proofBytes,
            publicInputsBytes,
            vkHashBytes
          );

          // Submit attestation (async)
          if (process.env.ATTESTOR_PRIVATE_KEY) {
            attestorClient.attest(proofHash, isValid).catch((error) => {
              logger.error({ error, proofHash }, 'Attestation failed');
            });
          }

          return { proofHash, isValid, error: null };
        } catch (error) {
          return {
            proofHash: null,
            isValid: false,
            error: error instanceof Error ? error.message : 'Unknown error',
          };
        }
      })
    );

    const verificationTime = Date.now() - startTime;
    const successCount = results.filter((r) => r.isValid).length;

    logger.info({
      total: results.length,
      successful: successCount,
      verificationTime,
    }, 'Batch verification complete');

    res.json({
      results,
      summary: {
        total: results.length,
        successful: successCount,
        failed: results.length - successCount,
      },
      verificationTime,
      proofSystem: 'PLONK',
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    logger.error({ error }, 'Batch verification failed');
    res.status(500).json({
      error: 'Batch verification failed',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * GET /attestation/:proofHash
 * Get attestation status for a proof
 */
router.get('/attestation/:proofHash', async (req: Request, res: Response) => {
  try {
    const { proofHash } = req.params;

    if (!proofHash.match(/^0x[0-9a-fA-F]{64}$/)) {
      return res.status(400).json({
        error: 'Invalid proof hash',
        message: 'Proof hash must be a 32-byte hex string',
      });
    }

    const attestation = await attestorClient.getAttestation(proofHash as Hash);

    if (!attestation) {
      return res.status(404).json({
        error: 'Attestation not found',
        proofHash,
      });
    }

    res.json({
      proofHash,
      isValid: attestation.isValid,
      timestamp: new Date(Number(attestation.timestamp) * 1000).toISOString(),
      proofType: attestation.proofType === 1 ? 'PLONK' : 'Unknown',
    });
  } catch (error) {
    logger.error({ error }, 'Failed to get attestation');
    res.status(500).json({
      error: 'Failed to get attestation',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * GET /attestation/events
 * Get recent attestation events
 */
router.get('/attestation/events', async (_req: Request, res: Response) => {
  try {
    const events = await attestorClient.getAttestationEvents();

    res.json({
      count: events.length,
      events: events.map((event) => ({
        proofHash: event.args.proofHash,
        isValid: event.args.isValid,
        proofType: event.args.proofType === 1 ? 'PLONK' : 'Unknown',
        timestamp: new Date(Number(event.args.timestamp) * 1000).toISOString(),
        blockNumber: event.blockNumber,
        transactionHash: event.transactionHash,
      })),
    });
  } catch (error) {
    logger.error({ error }, 'Failed to get attestation events');
    res.status(500).json({
      error: 'Failed to get events',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * GET /health
 * Health check endpoint
 */
router.get('/health', (_req: Request, res: Response) => {
  const health = {
    status: 'healthy',
    timestamp: new Date().toISOString(),
    wasmInitialized: wasmVerifier.isInitialized(),
    proofSystem: 'PLONK',
    curve: 'BN254',
    wasmSize: '36.8 KiB',
    uptime: process.uptime(),
  };

  res.json(health);
});

/**
 * GET /metrics
 * Service metrics endpoint
 */
router.get('/metrics', (_req: Request, res: Response) => {
  const metrics = {
    service: 'plonk-verification',
    version: '0.1.0',
    wasmSize: 37708, // bytes
    maxProofSize: parseInt(process.env.MAX_PROOF_SIZE || '10240', 10),
    maxPublicInputs: parseInt(process.env.MAX_PUBLIC_INPUTS || '256', 10),
    deploymentStrategy: 'off-chain',
    reason: 'WASM size 36.8KB exceeds 24KB Stylus limit',
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
  };

  res.json(metrics);
});

// Helper function to convert hex string to Uint8Array
function hexToBytes(hex: string): Uint8Array {
  const cleaned = hex.startsWith('0x') ? hex.slice(2) : hex;
  const bytes = new Uint8Array(cleaned.length / 2);
  for (let i = 0; i < bytes.length; i++) {
    bytes[i] = parseInt(cleaned.substr(i * 2, 2), 16);
  }
  return bytes;
}

export default router;
