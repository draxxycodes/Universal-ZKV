/**
 * Verification API Routes
 * 
 * Endpoints for Groth16 proof verification and attestation
 */

import { Router, type Request, type Response } from 'express';
import { z } from 'zod';
import pino from 'pino';
import { wasmVerifier, type Groth16Proof, type VerificationKey } from '../utils/wasm-loader.js';
import { attestorClient } from '../utils/attestor-client.js';

const logger = pino({ name: 'verify-routes' });
const router = Router();

// Validation schemas
// Accept both affine (2 elements) and projective (3 elements) coordinates
const CoordinateSchema = z.union([
  z.tuple([z.string(), z.string()]),
  z.tuple([z.string(), z.string(), z.string()]),
]);

const ProofSchema = z.object({
  pi_a: CoordinateSchema,
  pi_b: z.union([
    // Affine: 2 pairs of 2 elements
    z.tuple([
      z.tuple([z.string(), z.string()]),
      z.tuple([z.string(), z.string()]),
    ]),
    // Projective: 3 pairs of 2 elements
    z.tuple([
      z.tuple([z.string(), z.string()]),
      z.tuple([z.string(), z.string()]),
      z.tuple([z.string(), z.string()]),
    ]),
  ]),
  pi_c: CoordinateSchema,
  protocol: z.literal('groth16'),
  curve: z.literal('bn128'),
});

// G2 point schema - accepts both affine (2 pairs) and projective (3 pairs)
const G2PointSchema = z.union([
  z.tuple([
    z.tuple([z.string(), z.string()]),
    z.tuple([z.string(), z.string()]),
  ]),
  z.tuple([
    z.tuple([z.string(), z.string()]),
    z.tuple([z.string(), z.string()]),
    z.tuple([z.string(), z.string()]),
  ]),
]);

const VKSchema = z.object({
  protocol: z.literal('groth16'),
  curve: z.literal('bn128'),
  nPublic: z.number().int().positive(),
  vk_alpha_1: CoordinateSchema,
  vk_beta_2: G2PointSchema,
  vk_gamma_2: G2PointSchema,
  vk_delta_2: G2PointSchema,
  vk_alphabeta_12: z.union([
    z.tuple([
      z.tuple([z.tuple([z.string(), z.string()]), z.tuple([z.string(), z.string()])]),
      z.tuple([z.tuple([z.string(), z.string()]), z.tuple([z.string(), z.string()])]),
    ]),
    z.tuple([
      z.tuple([
        z.tuple([z.string(), z.string()]),
        z.tuple([z.string(), z.string()]),
        z.tuple([z.string(), z.string()]),
      ]),
      z.tuple([
        z.tuple([z.string(), z.string()]),
        z.tuple([z.string(), z.string()]),
        z.tuple([z.string(), z.string()]),
      ]),
    ]),
  ]),
  IC: z.array(CoordinateSchema),
});

const VerifyRequestSchema = z.object({
  proof: ProofSchema,
  publicInputs: z.array(z.string()),
  vk: VKSchema,
  attestOnChain: z.boolean().optional().default(false),
});

/**
 * POST /verify
 * Verify a Groth16 proof
 */
router.post('/verify', async (req: Request, res: Response) => {
  try {
    // Validate request body
    const validation = VerifyRequestSchema.safeParse(req.body);
    
    if (!validation.success) {
      return res.status(400).json({
        error: 'Invalid request',
        details: validation.error.errors,
      });
    }

    const { proof, publicInputs, vk, attestOnChain } = validation.data;

    logger.info({ attestOnChain }, 'Processing verification request');

    // Verify proof using WASM
    const result = await wasmVerifier.verify(
      proof as Groth16Proof,
      publicInputs,
      vk as VerificationKey
    );

    // If valid and attestation requested, attest on-chain
    let attestationResult;
    if (result.isValid && attestOnChain && result.proofHash) {
      attestationResult = await attestorClient.attestProof(result.proofHash);
    }

    return res.json({
      valid: result.isValid,
      proofHash: result.proofHash,
      gasEstimate: result.gasEstimate,
      attestation: attestationResult ? {
        success: attestationResult.success,
        transactionHash: attestationResult.transactionHash,
        gasUsed: attestationResult.gasUsed?.toString(),
      } : undefined,
      error: result.error,
    });
  } catch (error) {
    logger.error({ error }, 'Verification endpoint error');
    return res.status(500).json({
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * POST /verify/batch
 * Verify multiple Groth16 proofs
 */
router.post('/verify/batch', async (req: Request, res: Response) => {
  try {
    const { proofs } = req.body;

    if (!Array.isArray(proofs) || proofs.length === 0) {
      return res.status(400).json({
        error: 'Invalid request',
        message: 'Expected array of proofs',
      });
    }

    if (proofs.length > 100) {
      return res.status(400).json({
        error: 'Too many proofs',
        message: 'Maximum 100 proofs per batch',
      });
    }

    logger.info({ count: proofs.length }, 'Processing batch verification');

    // Verify all proofs
    const results = await Promise.all(
      proofs.map(async (item, index) => {
        try {
          const validation = VerifyRequestSchema.safeParse(item);
          
          if (!validation.success) {
            return {
              index,
              valid: false,
              error: 'Invalid proof format',
            };
          }

          const { proof, publicInputs, vk } = validation.data;
          const result = await wasmVerifier.verify(
            proof as Groth16Proof,
            publicInputs,
            vk as VerificationKey
          );

          return {
            index,
            valid: result.isValid,
            proofHash: result.proofHash,
            error: result.error,
          };
        } catch (error) {
          return {
            index,
            valid: false,
            error: error instanceof Error ? error.message : 'Unknown error',
          };
        }
      })
    );

    const validCount = results.filter((r) => r.valid).length;

    return res.json({
      totalProofs: proofs.length,
      validProofs: validCount,
      invalidProofs: proofs.length - validCount,
      results,
    });
  } catch (error) {
    logger.error({ error }, 'Batch verification endpoint error');
    return res.status(500).json({
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * GET /attestation/:proofHash
 * Check attestation status for a proof
 */
router.get('/attestation/:proofHash', async (req: Request, res: Response) => {
  try {
    const { proofHash } = req.params;

    if (!proofHash.match(/^0x[0-9a-fA-F]{64}$/)) {
      return res.status(400).json({
        error: 'Invalid proof hash format',
      });
    }

    logger.info({ proofHash }, 'Checking attestation status');

    const status = await attestorClient.isAttested(proofHash);

    return res.json({
      proofHash,
      isAttested: status.isAttested,
      timestamp: status.timestamp,
      timestampISO: status.timestamp
        ? new Date(status.timestamp * 1000).toISOString()
        : undefined,
    });
  } catch (error) {
    logger.error({ error }, 'Attestation status endpoint error');
    return res.status(500).json({
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * GET /attestation/events
 * Get recent attestation events
 */
router.get('/attestation/events', async (req: Request, res: Response) => {
  try {
    const { proofHash } = req.query;

    logger.info({ proofHash }, 'Fetching attestation events');

    const events = await attestorClient.getAttestationEvents(
      proofHash as string | undefined
    );

    return res.json({
      count: events.length,
      events,
    });
  } catch (error) {
    logger.error({ error }, 'Attestation events endpoint error');
    return res.status(500).json({
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * GET /health
 * Health check endpoint
 */
router.get('/health', (_req: Request, res: Response) => {
  return res.json({
    status: 'ok',
    service: 'groth16-verification',
    timestamp: new Date().toISOString(),
  });
});

export default router;
