/**
 * Universal Proof Protocol Types
 *
 * TypeScript implementation of the frozen Universal Proof Protocol.
 * This module provides byte-for-byte compatible encoding/decoding with the Rust implementation.
 *
 * Protocol Version: 1.0
 * Encoding: Borsh-compatible (deterministic, little-endian)
 *
 * @see docs/UNIVERSAL-PROOF-PROTOCOL.md for complete specification
 */

/**
 * Proof system type identifier
 *
 * Each variant corresponds to a different zero-knowledge proof construction
 * with distinct performance and security characteristics.
 */
export enum ProofType {
  /**
   * Groth16 zkSNARK
   * - Trusted setup required (circuit-specific)
   * - Smallest proof size (~128 bytes)
   * - Fastest verification (~280k gas)
   * - Battle-tested (10+ years in production)
   */
  Groth16 = 0,

  /**
   * PLONK universal SNARK
   * - Universal trusted setup (one-time ceremony)
   * - Moderate proof size (~800 bytes)
   * - Fast verification (~400k gas)
   * - More flexible circuit updates
   */
  PLONK = 1,

  /**
   * STARK (Scalable Transparent ARgument of Knowledge)
   * - Transparent setup (no trusted ceremony)
   * - Larger proof size (~40-100 KB)
   * - Slower verification (~540k gas)
   * - Post-quantum secure (hash-based)
   */
  STARK = 2,
}

/**
 * Public statement shared across all proof systems
 *
 * This structure defines the semantic meaning of public inputs for UZKV.
 * All circuits (Poseidon, EdDSA, Merkle) MUST encode their public inputs
 * according to this layout for semantic consistency.
 *
 * Security Notes:
 * - The nullifier MUST be derived from secret inputs to ensure uniqueness
 * - The publicKey should be verified against an EdDSA signature in the circuit
 * - The merkleRoot must match the current on-chain state root
 */
export class PublicStatement {
  /**
   * Root of the Merkle tree representing application state
   * Size: 32 bytes (Poseidon hash output or SHA256)
   */
  public readonly merkleRoot: Uint8Array;

  /**
   * EdDSA public key of the prover
   * Size: 32 bytes (compressed Edwards curve point)
   */
  public readonly publicKey: Uint8Array;

  /**
   * Anti-replay nullifier (derived from private inputs)
   * Size: 32 bytes (Poseidon hash output)
   */
  public readonly nullifier: Uint8Array;

  /**
   * Scalar value (application-specific: amount, ID, etc.)
   * Size: 16 bytes (u128 as bigint)
   */
  public readonly value: bigint;

  /**
   * Application-specific extension data
   * Examples: extra constraints, metadata, auxiliary commitments
   */
  public readonly extra: Uint8Array;

  constructor(params: {
    merkleRoot: Uint8Array;
    publicKey: Uint8Array;
    nullifier: Uint8Array;
    value: bigint;
    extra?: Uint8Array;
  }) {
    if (params.merkleRoot.length !== 32) {
      throw new Error('merkleRoot must be 32 bytes');
    }
    if (params.publicKey.length !== 32) {
      throw new Error('publicKey must be 32 bytes');
    }
    if (params.nullifier.length !== 32) {
      throw new Error('nullifier must be 32 bytes');
    }
    if (params.value < 0n) {
      throw new Error('value must be non-negative');
    }
    if (params.value >= 2n ** 128n) {
      throw new Error('value must fit in u128 (< 2^128)');
    }

    this.merkleRoot = params.merkleRoot;
    this.publicKey = params.publicKey;
    this.nullifier = params.nullifier;
    this.value = params.value;
    this.extra = params.extra || new Uint8Array(0);
  }

  /**
   * Encode the public statement to bytes using borsh-compatible encoding
   *
   * Binary Layout:
   * ```
   * [merkle_root: 32 bytes]
   * [public_key: 32 bytes]
   * [nullifier: 32 bytes]
   * [value: 16 bytes (u128 little-endian)]
   * [extra_len: 4 bytes (u32 little-endian)]
   * [extra: extra_len bytes]
   * ```
   *
   * @returns Encoded bytes (minimum 116 bytes)
   */
  encode(): Uint8Array {
    const buffer = new Uint8Array(116 + this.extra.length);
    let offset = 0;

    // merkleRoot (32 bytes)
    buffer.set(this.merkleRoot, offset);
    offset += 32;

    // publicKey (32 bytes)
    buffer.set(this.publicKey, offset);
    offset += 32;

    // nullifier (32 bytes)
    buffer.set(this.nullifier, offset);
    offset += 32;

    // value (16 bytes, u128 little-endian)
    const valueBytes = u128ToBytes(this.value);
    buffer.set(valueBytes, offset);
    offset += 16;

    // extra length (4 bytes, u32 little-endian)
    const extraLen = this.extra.length;
    buffer.set(u32ToBytes(extraLen), offset);
    offset += 4;

    // extra data
    buffer.set(this.extra, offset);

    return buffer;
  }

  /**
   * Decode a PublicStatement from borsh-encoded bytes
   *
   * @param bytes - Encoded public statement (minimum 116 bytes)
   * @returns Decoded PublicStatement
   * @throws Error if buffer is malformed
   */
  static decode(bytes: Uint8Array): PublicStatement {
    if (bytes.length < 116) {
      throw new Error(`Buffer too short: expected at least 116 bytes, got ${bytes.length}`);
    }

    let offset = 0;

    // Parse merkleRoot (32 bytes)
    const merkleRoot = bytes.slice(offset, offset + 32);
    offset += 32;

    // Parse publicKey (32 bytes)
    const publicKey = bytes.slice(offset, offset + 32);
    offset += 32;

    // Parse nullifier (32 bytes)
    const nullifier = bytes.slice(offset, offset + 32);
    offset += 32;

    // Parse value (16 bytes as u128 little-endian)
    const valueBytes = bytes.slice(offset, offset + 16);
    const value = bytesToU128(valueBytes);
    offset += 16;

    // Parse extra length (4 bytes as u32 little-endian)
    const extraLenBytes = bytes.slice(offset, offset + 4);
    const extraLen = bytesToU32(extraLenBytes);
    offset += 4;

    // Parse extra data
    if (bytes.length < offset + extraLen) {
      throw new Error(
        `Buffer too short for extra data: expected ${offset + extraLen} bytes, got ${bytes.length}`
      );
    }
    const extra = bytes.slice(offset, offset + extraLen);

    return new PublicStatement({
      merkleRoot,
      publicKey,
      nullifier,
      value,
      extra,
    });
  }

  /**
   * Get the total encoded size in bytes
   */
  encodedSize(): number {
    return 116 + this.extra.length; // 32+32+32+16+4 + extra
  }
}

/**
 * Universal proof envelope
 *
 * This is the top-level structure that wraps all proofs submitted to UZKV.
 * Every proof, regardless of type (Groth16/PLONK/STARK), MUST be encoded
 * in this format before being submitted on-chain.
 *
 * Security Invariants:
 * - vkHash MUST match the stored verification key for (proofType, programId)
 * - programId binds the proof to a specific circuit/program
 * - version allows protocol upgrades while maintaining backward compatibility
 */
export class UniversalProof {
  /**
   * Protocol version (currently 1)
   * Future versions may support recursion, aggregation, etc.
   */
  public readonly version: number;

  /**
   * Which proof system was used to generate this proof
   */
  public readonly proofType: ProofType;

  /**
   * Program/circuit identifier
   * Allows multiple circuits per proof type (e.g., Poseidon, EdDSA, Merkle)
   * Range: 0-4294967295 (u32)
   */
  public readonly programId: number;

  /**
   * Hash of the verification key
   * MUST match the on-chain registered VK for (proofType, programId)
   * Size: 32 bytes (keccak256 or sha256 of VK bytes)
   */
  public readonly vkHash: Uint8Array;

  /**
   * The actual proof bytes (system-specific encoding)
   * - Groth16: ~128 bytes (2 G1 points + 1 G2 point)
   * - PLONK: ~800 bytes (commitments + evaluations + opening proof)
   * - STARK: ~40-100 KB (FRI proof + trace commitments)
   */
  public readonly proofBytes: Uint8Array;

  /**
   * Encoded public statement (borsh-encoded PublicStatement)
   * This is what the proof is attesting to
   */
  public readonly publicInputsBytes: Uint8Array;

  constructor(params: {
    version?: number;
    proofType: ProofType;
    programId: number;
    vkHash: Uint8Array;
    proofBytes: Uint8Array;
    publicInputsBytes: Uint8Array;
  }) {
    this.version = params.version ?? 1;
    this.proofType = params.proofType;
    this.programId = params.programId;

    if (params.vkHash.length !== 32) {
      throw new Error('vkHash must be 32 bytes');
    }
    if (params.programId < 0 || params.programId > 0xffffffff) {
      throw new Error('programId must be a valid u32 (0 to 4294967295)');
    }
    if (this.version !== 1) {
      throw new Error(`Unsupported protocol version: ${this.version} (only version 1 supported)`);
    }

    this.vkHash = params.vkHash;
    this.proofBytes = params.proofBytes;
    this.publicInputsBytes = params.publicInputsBytes;
  }

  /**
   * Create a UniversalProof with a PublicStatement
   *
   * Convenience constructor that encodes the PublicStatement automatically.
   */
  static withStatement(params: {
    proofType: ProofType;
    programId: number;
    vkHash: Uint8Array;
    proofBytes: Uint8Array;
    publicStatement: PublicStatement;
  }): UniversalProof {
    return new UniversalProof({
      version: 1,
      proofType: params.proofType,
      programId: params.programId,
      vkHash: params.vkHash,
      proofBytes: params.proofBytes,
      publicInputsBytes: params.publicStatement.encode(),
    });
  }

  /**
   * Encode the universal proof to bytes using borsh-compatible encoding
   *
   * Binary Layout:
   * ```
   * [version: 1 byte]
   * [proof_type: 1 byte]
   * [program_id: 4 bytes (u32 little-endian)]
   * [vk_hash: 32 bytes]
   * [proof_len: 4 bytes (u32 little-endian)]
   * [proof_bytes: proof_len bytes]
   * [public_inputs_len: 4 bytes (u32 little-endian)]
   * [public_inputs_bytes: public_inputs_len bytes]
   * ```
   *
   * Total: 46 + proof_len + public_inputs_len bytes
   *
   * @returns Encoded bytes (minimum 46 bytes)
   */
  encode(): Uint8Array {
    const totalSize = 46 + this.proofBytes.length + this.publicInputsBytes.length;
    const buffer = new Uint8Array(totalSize);
    let offset = 0;

    // version (1 byte)
    buffer[offset] = this.version;
    offset += 1;

    // proof_type (1 byte)
    buffer[offset] = this.proofType;
    offset += 1;

    // program_id (4 bytes, u32 little-endian)
    buffer.set(u32ToBytes(this.programId), offset);
    offset += 4;

    // vk_hash (32 bytes)
    buffer.set(this.vkHash, offset);
    offset += 32;

    // proof_bytes length (4 bytes, u32 little-endian)
    buffer.set(u32ToBytes(this.proofBytes.length), offset);
    offset += 4;

    // proof_bytes
    buffer.set(this.proofBytes, offset);
    offset += this.proofBytes.length;

    // public_inputs_bytes length (4 bytes, u32 little-endian)
    buffer.set(u32ToBytes(this.publicInputsBytes.length), offset);
    offset += 4;

    // public_inputs_bytes
    buffer.set(this.publicInputsBytes, offset);

    return buffer;
  }

  /**
   * Decode a UniversalProof from bytes
   *
   * @param bytes - Encoded universal proof (minimum 46 bytes)
   * @returns Decoded UniversalProof
   * @throws Error if buffer is malformed or version is unsupported
   */
  static decode(bytes: Uint8Array): UniversalProof {
    if (bytes.length < 46) {
      throw new Error(`Buffer too short: expected at least 46 bytes, got ${bytes.length}`);
    }

    let offset = 0;

    // Parse version
    const version = bytes[offset];
    offset += 1;
    if (version !== 1) {
      throw new Error(`Unsupported protocol version: ${version} (only version 1 supported)`);
    }

    // Parse proof_type
    const proofType = bytes[offset];
    offset += 1;
    if (proofType !== ProofType.Groth16 && proofType !== ProofType.PLONK && proofType !== ProofType.STARK) {
      throw new Error(`Invalid proof type: ${proofType}`);
    }

    // Parse program_id (4 bytes as u32 little-endian)
    const programIdBytes = bytes.slice(offset, offset + 4);
    const programId = bytesToU32(programIdBytes);
    offset += 4;

    // Parse vk_hash (32 bytes)
    const vkHash = bytes.slice(offset, offset + 32);
    offset += 32;

    // Parse proof_bytes length and data
    const proofLenBytes = bytes.slice(offset, offset + 4);
    const proofLen = bytesToU32(proofLenBytes);
    offset += 4;

    if (bytes.length < offset + proofLen) {
      throw new Error(
        `Buffer too short for proof: expected ${offset + proofLen} bytes, got ${bytes.length}`
      );
    }
    const proofBytes = bytes.slice(offset, offset + proofLen);
    offset += proofLen;

    // Parse public_inputs_bytes length and data
    if (bytes.length < offset + 4) {
      throw new Error('Buffer too short for public inputs length field');
    }
    const publicInputsLenBytes = bytes.slice(offset, offset + 4);
    const publicInputsLen = bytesToU32(publicInputsLenBytes);
    offset += 4;

    if (bytes.length < offset + publicInputsLen) {
      throw new Error(
        `Buffer too short for public inputs: expected ${offset + publicInputsLen} bytes, got ${bytes.length}`
      );
    }
    const publicInputsBytes = bytes.slice(offset, offset + publicInputsLen);

    return new UniversalProof({
      version,
      proofType,
      programId,
      vkHash,
      proofBytes,
      publicInputsBytes,
    });
  }

  /**
   * Get the total encoded size in bytes
   */
  encodedSize(): number {
    return 46 + this.proofBytes.length + this.publicInputsBytes.length;
  }

  /**
   * Decode the public statement from the publicInputsBytes field
   *
   * This is a convenience method that calls PublicStatement.decode()
   * on the embedded public inputs.
   *
   * @returns Decoded PublicStatement
   * @throws Error if public inputs are malformed
   */
  decodePublicStatement(): PublicStatement {
    return PublicStatement.decode(this.publicInputsBytes);
  }
}

// ============================================================================
// Helper Functions for Borsh-Compatible Encoding
// ============================================================================

/**
 * Convert a u32 to 4 bytes (little-endian)
 */
function u32ToBytes(value: number): Uint8Array {
  const buffer = new Uint8Array(4);
  const view = new DataView(buffer.buffer);
  view.setUint32(0, value, true); // true = little-endian
  return buffer;
}

/**
 * Convert 4 bytes (little-endian) to u32
 */
function bytesToU32(bytes: Uint8Array): number {
  if (bytes.length !== 4) {
    throw new Error(`Expected 4 bytes for u32, got ${bytes.length}`);
  }
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  return view.getUint32(0, true); // true = little-endian
}

/**
 * Convert a u128 (bigint) to 16 bytes (little-endian)
 */
function u128ToBytes(value: bigint): Uint8Array {
  if (value < 0n) {
    throw new Error('u128 value must be non-negative');
  }
  if (value >= 2n ** 128n) {
    throw new Error('u128 value must be less than 2^128');
  }

  const buffer = new Uint8Array(16);
  let remaining = value;

  for (let i = 0; i < 16; i++) {
    buffer[i] = Number(remaining & 0xffn);
    remaining >>= 8n;
  }

  return buffer;
}

/**
 * Convert 16 bytes (little-endian) to u128 (bigint)
 */
function bytesToU128(bytes: Uint8Array): bigint {
  if (bytes.length !== 16) {
    throw new Error(`Expected 16 bytes for u128, got ${bytes.length}`);
  }

  let result = 0n;
  for (let i = 15; i >= 0; i--) {
    result = (result << 8n) | BigInt(bytes[i]);
  }

  return result;
}
