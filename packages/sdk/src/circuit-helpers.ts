/**
 * PublicStatement Circuit Helpers
 *
 * Utilities for working with PublicStatement-standardized circuits
 */

import { PublicStatement, UniversalProof, ProofType } from "./types";

/**
 * Circuit public input format
 */
export interface CircuitPublicInputs {
  merkle_root: string;
  public_key: string;
  nullifier: string;
  value: string;
  extra: string;
}

/**
 * Program ID mapping for circuits
 */
export enum CircuitProgramId {
  PoseidonWithStatement = 1,
  EdDSAWithStatement = 2,
  MerkleWithStatement = 3,
}

/**
 * Get program ID from circuit name
 */
export function getProgramIdFromName(name: string): number {
  const nameMap: Record<string, number> = {
    poseidon_with_statement: CircuitProgramId.PoseidonWithStatement,
    eddsa_with_statement: CircuitProgramId.EdDSAWithStatement,
    merkle_with_statement: CircuitProgramId.MerkleWithStatement,
  };

  const programId = nameMap[name.toLowerCase()];
  if (programId === undefined) {
    throw new Error(`Unknown circuit name: ${name}`);
  }

  return programId;
}

/**
 * Convert circuit public inputs (field elements) to PublicStatement
 */
export function circuitInputsToPublicStatement(
  inputs: CircuitPublicInputs,
): PublicStatement {
  return new PublicStatement({
    merkleRoot: hexToBytes32(inputs.merkle_root),
    publicKey: hexToBytes32(inputs.public_key),
    nullifier: hexToBytes32(inputs.nullifier),
    value: BigInt(inputs.value),
    extra: inputs.extra === "0" ? new Uint8Array(0) : hexToBytes(inputs.extra),
  });
}

/**
 * Convert hex string to 32-byte array
 */
function hexToBytes32(hex: string): Uint8Array {
  const cleaned = hex.startsWith("0x") ? hex.slice(2) : hex;
  const padded = cleaned.padStart(64, "0");
  const bytes = new Uint8Array(32);

  for (let i = 0; i < 32; i++) {
    bytes[i] = parseInt(padded.slice(i * 2, i * 2 + 2), 16);
  }

  return bytes;
}

/**
 * Convert hex string to byte array
 */
function hexToBytes(hex: string): Uint8Array {
  const cleaned = hex.startsWith("0x") ? hex.slice(2) : hex;
  const bytes = new Uint8Array(cleaned.length / 2);

  for (let i = 0; i < bytes.length; i++) {
    bytes[i] = parseInt(cleaned.slice(i * 2, i * 2 + 2), 16);
  }

  return bytes;
}

/**
 * Convert field element string to 32-byte big-endian representation
 */
export function fieldElementToBytes32(
  fieldElement: string | bigint,
): Uint8Array {
  const value =
    typeof fieldElement === "string" ? BigInt(fieldElement) : fieldElement;
  const hex = value.toString(16).padStart(64, "0");
  return hexToBytes32("0x" + hex);
}

/**
 * Create a Groth16 UniversalProof from circuit outputs
 */
export function createGroth16Proof(
  programId: string | number,
  publicInputs: CircuitPublicInputs,
  proofBytes: Uint8Array,
  vkHash: Uint8Array,
): UniversalProof {
  const publicStatement = circuitInputsToPublicStatement(publicInputs);
  const numericProgramId =
    typeof programId === "string" ? getProgramIdFromName(programId) : programId;

  return new UniversalProof({
    proofType: ProofType.Groth16,
    programId: numericProgramId,
    vkHash,
    publicInputsBytes: publicStatement.encode(),
    proofBytes: proofBytes,
  });
}

/**
 * Create a PLONK UniversalProof from circuit outputs
 */
export function createPlonkProof(
  programId: string | number,
  publicInputs: CircuitPublicInputs,
  proofBytes: Uint8Array,
  vkHash: Uint8Array,
): UniversalProof {
  const publicStatement = circuitInputsToPublicStatement(publicInputs);
  const numericProgramId =
    typeof programId === "string" ? getProgramIdFromName(programId) : programId;

  return new UniversalProof({
    proofType: ProofType.PLONK,
    programId: numericProgramId,
    vkHash,
    publicInputsBytes: publicStatement.encode(),
    proofBytes: proofBytes,
  });
}

/**
 * Parse snarkjs public.json output to CircuitPublicInputs
 */
export function parseSnarkjsPublicInputs(
  publicJson: string[],
): CircuitPublicInputs {
  if (publicJson.length !== 5) {
    throw new Error(
      `Expected 5 public inputs (PublicStatement fields), got ${publicJson.length}`,
    );
  }

  return {
    merkle_root: publicJson[0],
    public_key: publicJson[1],
    nullifier: publicJson[2],
    value: publicJson[3],
    extra: publicJson[4],
  };
}

/**
 * Encode Groth16 proof from snarkjs output
 *
 * snarkjs proof.json format:
 * {
 *   "pi_a": [a1, a2, a3],
 *   "pi_b": [[b11, b12], [b21, b22], [b31, b32]],
 *   "pi_c": [c1, c2, c3],
 *   "protocol": "groth16",
 *   "curve": "bn128"
 * }
 *
 * Encoded format (256 bytes):
 * [32 bytes pi_a.x] [32 bytes pi_a.y] [64 bytes pi_b] [32 bytes pi_c.x] [32 bytes pi_c.y]
 * + remaining bytes for G2 point
 */
export function encodeGroth16Proof(proofJson: any): Uint8Array {
  // This is a simplified encoding - actual Groth16 proof encoding
  // depends on the exact format expected by the verifier

  // For now, return a placeholder that matches the expected size
  // TODO: Implement proper Groth16 proof encoding
  const proofBytes = new Uint8Array(256);

  // In production, this should:
  // 1. Parse pi_a, pi_b, pi_c from proof.json
  // 2. Convert field elements to bytes
  // 3. Encode in the format expected by the Stylus verifier

  return proofBytes;
}

/**
 * Create test PublicStatement for development
 */
export function createTestPublicStatement(): PublicStatement {
  return new PublicStatement({
    merkleRoot: new Uint8Array(32), // All zeros
    publicKey: hexToBytes32(
      "0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef",
    ),
    nullifier: hexToBytes32(
      "0x2143e7a26292fea804358167737a97f1403cb190900be0be5a370f21041ffbe4",
    ),
    value: BigInt(1000000),
    extra: new Uint8Array(0),
  });
}

/**
 * Validate PublicStatement constraints
 */
export function validatePublicStatement(statement: PublicStatement): void {
  if (statement.merkleRoot.length !== 32) {
    throw new Error(
      `merkleRoot must be 32 bytes, got ${statement.merkleRoot.length}`,
    );
  }

  if (statement.publicKey.length !== 32) {
    throw new Error(
      `publicKey must be 32 bytes, got ${statement.publicKey.length}`,
    );
  }

  if (statement.nullifier.length !== 32) {
    throw new Error(
      `nullifier must be 32 bytes, got ${statement.nullifier.length}`,
    );
  }

  if (statement.value < 0n) {
    throw new Error(`value must be non-negative, got ${statement.value}`);
  }

  // value must fit in u128 (16 bytes)
  const maxU128 = (1n << 128n) - 1n;
  if (statement.value > maxU128) {
    throw new Error(`value must fit in u128, got ${statement.value}`);
  }
}

/**
 * Check if a nullifier has been used (mock implementation)
 * In production, this would query the Stylus contract
 */
export async function isNullifierUsed(
  contractAddress: string,
  nullifier: Uint8Array,
): Promise<boolean> {
  // TODO: Implement contract call
  // const contract = new ethers.Contract(contractAddress, ABI, provider);
  // return await contract.isNullifierUsed(nullifier);
  return false;
}

/**
 * Example: Create a complete proof submission payload
 */
export function createProofPayload(
  programId: string | number,
  publicInputs: CircuitPublicInputs,
  proofJson: any,
  vkHash: Uint8Array,
): { universalProof: UniversalProof; publicStatement: PublicStatement } {
  const publicStatement = circuitInputsToPublicStatement(publicInputs);
  validatePublicStatement(publicStatement);

  const proofBytes = encodeGroth16Proof(proofJson);
  const numericProgramId =
    typeof programId === "string" ? getProgramIdFromName(programId) : programId;

  const universalProof = new UniversalProof({
    proofType: ProofType.Groth16,
    programId: numericProgramId,
    vkHash,
    publicInputsBytes: publicStatement.encode(),
    proofBytes: proofBytes,
  });

  return { universalProof, publicStatement };
}
