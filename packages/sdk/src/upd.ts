/**
 * Universal Proof Descriptor (UPD) v2
 *
 * TypeScript implementation of the self-describing 75-byte proof header.
 * Enables safe dispatch, cost prediction, and future-proof extensibility.
 *
 * Protocol Version: 2
 * Encoding: Big-endian for network order (matches Rust implementation)
 *
 * @see packages/stylus/src/types.rs for Rust implementation
 */

import { ProofType } from "./types";

/**
 * Elliptic curve identifier for proof systems
 */
export enum CurveId {
  /** BN254 (alt_bn128) - 128-bit security, EVM-native */
  BN254 = 0,
  /** BLS12-381 - 128-bit security, larger field */
  BLS12_381 = 1,
  /** Pasta curves (Pallas/Vesta) - for Halo2/Nova */
  Pasta = 2,
  /** Ed25519 - for EdDSA signatures */
  Ed25519 = 3,
  /** Goldilocks - 64-bit prime for STARK */
  Goldilocks = 4,
  /** None - for hash-based systems (STARK) */
  None = 255,
}

/**
 * Hash function identifier for Fiat-Shamir transcript
 */
export enum HashFunctionId {
  /** Poseidon hash - SNARK-friendly */
  Poseidon = 0,
  /** SHA256 - ubiquitous but expensive in circuits */
  SHA256 = 1,
  /** Blake3 - fast, parallelizable */
  Blake3 = 2,
  /** Keccak256 - EVM native */
  Keccak256 = 3,
  /** Rescue Prime - arithmetic-friendly */
  RescuePrime = 4,
}

/**
 * Descriptor validation errors
 */
export enum DescriptorError {
  /** Invalid UPD version */
  InvalidVersion = "InvalidVersion",
  /** Unknown proof system ID */
  UnknownProofSystem = "UnknownProofSystem",
  /** Unknown curve ID */
  UnknownCurve = "UnknownCurve",
  /** Unknown hash function */
  UnknownHashFunction = "UnknownHashFunction",
  /** Proof length mismatch */
  ProofLengthMismatch = "ProofLengthMismatch",
  /** Too many public inputs */
  TooManyPublicInputs = "TooManyPublicInputs",
  /** Recursion depth too deep */
  ExcessiveRecursionDepth = "ExcessiveRecursionDepth",
  /** Buffer too short to decode */
  BufferTooShort = "BufferTooShort",
}

/**
 * Universal Proof Descriptor (UPD) v2
 *
 * Self-describing proof header that enables:
 * - **Safe dispatch** before parsing proof bytes
 * - **Cost prediction** for gas estimation
 * - **Future-proof extensibility** via version field
 * - **Recursion tracking** via depth field
 *
 * Binary Layout (75 bytes):
 * ```
 * [upd_version: 1 byte]
 * [proof_system_id: 1 byte]
 * [curve_id: 1 byte]
 * [hash_function_id: 1 byte]
 * [recursion_depth: 1 byte]
 * [public_input_count: 2 bytes (u16 big-endian)]
 * [proof_length: 4 bytes (u32 big-endian)]
 * [vk_commitment: 32 bytes]
 * [circuit_id: 32 bytes]
 * ```
 */
export class UniversalProofDescriptor {
  /** Encoded size in bytes */
  static readonly ENCODED_SIZE = 75;

  /** Current UPD version */
  static readonly CURRENT_VERSION = 2;

  /** Maximum allowed public inputs */
  static readonly MAX_PUBLIC_INPUTS = 1024;

  /** Maximum recursion depth */
  static readonly MAX_RECURSION_DEPTH = 16;

  /** UPD format version (2 for this format) */
  public readonly updVersion: number;

  /** Proof system identifier (matches ProofType enum) */
  public readonly proofSystemId: number;

  /** Elliptic curve identifier */
  public readonly curveId: CurveId;

  /** Hash function used for Fiat-Shamir transcript */
  public readonly hashFunctionId: HashFunctionId;

  /** Recursion depth (0 = base proof, 1+ = recursive) */
  public readonly recursionDepth: number;

  /** Number of public inputs */
  public readonly publicInputCount: number;

  /** Proof byte length (for validation before parsing) */
  public readonly proofLength: number;

  /** VK commitment (keccak256 of verification key) */
  public readonly vkCommitment: Uint8Array;

  /** Application-specific circuit identifier */
  public readonly circuitId: Uint8Array;

  constructor(params: {
    updVersion?: number;
    proofSystemId: number;
    curveId: CurveId;
    hashFunctionId: HashFunctionId;
    recursionDepth: number;
    publicInputCount: number;
    proofLength: number;
    vkCommitment: Uint8Array;
    circuitId: Uint8Array;
  }) {
    this.updVersion =
      params.updVersion ?? UniversalProofDescriptor.CURRENT_VERSION;
    this.proofSystemId = params.proofSystemId;
    this.curveId = params.curveId;
    this.hashFunctionId = params.hashFunctionId;
    this.recursionDepth = params.recursionDepth;
    this.publicInputCount = params.publicInputCount;
    this.proofLength = params.proofLength;

    if (params.vkCommitment.length !== 32) {
      throw new Error("vkCommitment must be 32 bytes");
    }
    if (params.circuitId.length !== 32) {
      throw new Error("circuitId must be 32 bytes");
    }

    this.vkCommitment = params.vkCommitment;
    this.circuitId = params.circuitId;
  }

  /**
   * Convenience constructor for Groth16 proofs
   */
  static groth16(
    publicInputCount: number,
    vkCommitment: Uint8Array,
    circuitId: Uint8Array,
  ): UniversalProofDescriptor {
    return new UniversalProofDescriptor({
      proofSystemId: ProofType.Groth16,
      curveId: CurveId.BN254,
      hashFunctionId: HashFunctionId.Poseidon,
      recursionDepth: 0,
      publicInputCount,
      proofLength: 256, // Standard Groth16 proof size
      vkCommitment,
      circuitId,
    });
  }

  /**
   * Convenience constructor for PLONK proofs
   */
  static plonk(
    publicInputCount: number,
    vkCommitment: Uint8Array,
    circuitId: Uint8Array,
  ): UniversalProofDescriptor {
    return new UniversalProofDescriptor({
      proofSystemId: ProofType.PLONK,
      curveId: CurveId.BN254,
      hashFunctionId: HashFunctionId.Keccak256,
      recursionDepth: 0,
      publicInputCount,
      proofLength: 800, // Typical PLONK proof size
      vkCommitment,
      circuitId,
    });
  }

  /**
   * Convenience constructor for STARK proofs
   */
  static stark(
    publicInputCount: number,
    proofLength: number,
    circuitId: Uint8Array,
  ): UniversalProofDescriptor {
    return new UniversalProofDescriptor({
      proofSystemId: ProofType.STARK,
      curveId: CurveId.None,
      hashFunctionId: HashFunctionId.Blake3,
      recursionDepth: 0,
      publicInputCount,
      proofLength,
      vkCommitment: new Uint8Array(32), // STARKs don't use VKs
      circuitId,
    });
  }

  /**
   * Validate descriptor before dispatching to verifier
   * @throws Error if validation fails
   */
  validate(): void {
    if (this.updVersion !== UniversalProofDescriptor.CURRENT_VERSION) {
      throw new Error(DescriptorError.InvalidVersion);
    }

    if (
      this.proofSystemId !== ProofType.Groth16 &&
      this.proofSystemId !== ProofType.PLONK &&
      this.proofSystemId !== ProofType.STARK
    ) {
      throw new Error(DescriptorError.UnknownProofSystem);
    }

    if (this.publicInputCount > UniversalProofDescriptor.MAX_PUBLIC_INPUTS) {
      throw new Error(DescriptorError.TooManyPublicInputs);
    }

    if (this.recursionDepth > UniversalProofDescriptor.MAX_RECURSION_DEPTH) {
      throw new Error(DescriptorError.ExcessiveRecursionDepth);
    }
  }

  /**
   * Estimate verification gas from descriptor alone
   *
   * This enables gas estimation BEFORE parsing the full proof.
   */
  estimateGas(): bigint {
    // Gas cost models from verifier_traits.rs
    const GROTH16 = { base: 250_000n, perInput: 40_000n, perByte: 0n };
    const PLONK = { base: 350_000n, perInput: 10_000n, perByte: 0n };
    const STARK = { base: 200_000n, perInput: 5_000n, perByte: 10n };

    const inputs = BigInt(this.publicInputCount);
    const bytes = BigInt(this.proofLength);

    switch (this.proofSystemId) {
      case ProofType.Groth16:
        return (
          GROTH16.base + GROTH16.perInput * inputs + GROTH16.perByte * bytes
        );
      case ProofType.PLONK:
        return PLONK.base + PLONK.perInput * inputs + PLONK.perByte * bytes;
      case ProofType.STARK:
        return STARK.base + STARK.perInput * inputs + STARK.perByte * bytes;
      default:
        return BigInt(Number.MAX_SAFE_INTEGER); // Unknown system
    }
  }

  /**
   * Get proof type enum from descriptor
   */
  proofType(): ProofType | null {
    if (
      this.proofSystemId === ProofType.Groth16 ||
      this.proofSystemId === ProofType.PLONK ||
      this.proofSystemId === ProofType.STARK
    ) {
      return this.proofSystemId;
    }
    return null;
  }

  /**
   * Encode descriptor to bytes (big-endian for network compatibility)
   */
  encode(): Uint8Array {
    const buffer = new Uint8Array(UniversalProofDescriptor.ENCODED_SIZE);
    let offset = 0;

    // Single-byte fields
    buffer[offset++] = this.updVersion;
    buffer[offset++] = this.proofSystemId;
    buffer[offset++] = this.curveId;
    buffer[offset++] = this.hashFunctionId;
    buffer[offset++] = this.recursionDepth;

    // Multi-byte fields (big-endian for network order)
    // public_input_count (u16)
    buffer[offset++] = (this.publicInputCount >> 8) & 0xff;
    buffer[offset++] = this.publicInputCount & 0xff;

    // proof_length (u32)
    buffer[offset++] = (this.proofLength >> 24) & 0xff;
    buffer[offset++] = (this.proofLength >> 16) & 0xff;
    buffer[offset++] = (this.proofLength >> 8) & 0xff;
    buffer[offset++] = this.proofLength & 0xff;

    // 32-byte fields
    buffer.set(this.vkCommitment, offset);
    offset += 32;
    buffer.set(this.circuitId, offset);

    return buffer;
  }

  /**
   * Decode descriptor from bytes
   */
  static decode(bytes: Uint8Array): UniversalProofDescriptor {
    if (bytes.length < UniversalProofDescriptor.ENCODED_SIZE) {
      throw new Error(DescriptorError.BufferTooShort);
    }

    let offset = 0;

    // Single-byte fields
    const updVersion = bytes[offset++];
    const proofSystemId = bytes[offset++];
    const curveIdValue = bytes[offset++];
    const hashFunctionIdValue = bytes[offset++];
    const recursionDepth = bytes[offset++];

    // Validate curve ID
    if (!isValidCurveId(curveIdValue)) {
      throw new Error(DescriptorError.UnknownCurve);
    }
    const curveId = curveIdValue as CurveId;

    // Validate hash function ID
    if (!isValidHashFunctionId(hashFunctionIdValue)) {
      throw new Error(DescriptorError.UnknownHashFunction);
    }
    const hashFunctionId = hashFunctionIdValue as HashFunctionId;

    // Multi-byte fields (big-endian)
    const publicInputCount = (bytes[offset] << 8) | bytes[offset + 1];
    offset += 2;

    const proofLength =
      (bytes[offset] << 24) |
      (bytes[offset + 1] << 16) |
      (bytes[offset + 2] << 8) |
      bytes[offset + 3];
    offset += 4;

    // 32-byte fields
    const vkCommitment = bytes.slice(offset, offset + 32);
    offset += 32;
    const circuitId = bytes.slice(offset, offset + 32);

    return new UniversalProofDescriptor({
      updVersion,
      proofSystemId,
      curveId,
      hashFunctionId,
      recursionDepth,
      publicInputCount,
      proofLength,
      vkCommitment,
      circuitId,
    });
  }
}

// ============================================================================
// Helper Functions
// ============================================================================

function isValidCurveId(value: number): boolean {
  return (
    value === CurveId.BN254 ||
    value === CurveId.BLS12_381 ||
    value === CurveId.Pasta ||
    value === CurveId.Ed25519 ||
    value === CurveId.Goldilocks ||
    value === CurveId.None
  );
}

function isValidHashFunctionId(value: number): boolean {
  return (
    value === HashFunctionId.Poseidon ||
    value === HashFunctionId.SHA256 ||
    value === HashFunctionId.Blake3 ||
    value === HashFunctionId.Keccak256 ||
    value === HashFunctionId.RescuePrime
  );
}
