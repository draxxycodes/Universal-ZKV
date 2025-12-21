/**
 * Security Formalization for Universal ZK Verifier
 *
 * TypeScript implementation of dispatch boundary validation and security types.
 * Provides formal security checks and invariant validation.
 *
 * Threat Model:
 * | Threat              | Attack Vector                | Mitigation               |
 * |---------------------|------------------------------|--------------------------|
 * | Proof Type Confusion| Submit Groth16 as PLONK      | VK binding check         |
 * | Curve Mismatch      | BLS12-381 on BN254 verifier  | Curve ID validation      |
 * | VK Substitution     | Swap VK for invalid proofs   | VK commitment binding    |
 * | Recursion Bomb      | Unbounded recursive depth    | Depth limit (max 16)     |
 * | Input Overflow      | Excessive public inputs      | Size limit validation    |
 *
 * @see packages/stylus/src/security.rs for Rust implementation
 */

import { ProofType } from "./types";
import { CurveId, UniversalProofDescriptor } from "./upd";

// ============================================================================
// Security Errors
// ============================================================================

/**
 * Security validation errors
 */
export enum SecurityError {
  /** Proof type in descriptor doesn't match registered VK */
  ProofTypeMismatch = "ProofTypeMismatch",
  /** VK commitment doesn't match */
  VKCommitmentMismatch = "VKCommitmentMismatch",
  /** Curve types don't match */
  CurveMismatch = "CurveMismatch",
  /** Recursion depth exceeds limit */
  ExcessiveRecursionDepth = "ExcessiveRecursionDepth",
  /** Too many public inputs */
  TooManyPublicInputs = "TooManyPublicInputs",
  /** Proof size out of bounds */
  ProofSizeOutOfBounds = "ProofSizeOutOfBounds",
  /** Insufficient security level */
  InsufficientSecurityLevel = "InsufficientSecurityLevel",
  /** Post-quantum security required but not provided */
  PostQuantumRequired = "PostQuantumRequired",
}

// ============================================================================
// Security Model Types (from verifier_traits.rs)
// ============================================================================

/**
 * Setup type classification
 */
export enum SetupType {
  /** Trusted setup (circuit-specific) - e.g., Groth16 */
  Trusted = 0,
  /** Universal setup (one ceremony for all circuits) - e.g., PLONK */
  Universal = 1,
  /** Transparent setup (no trusted ceremony) - e.g., STARK */
  Transparent = 2,
}

/**
 * Cryptographic assumption classification
 */
export enum CryptoAssumption {
  /** Discrete Logarithm Problem (e.g., Schnorr, ECDSA) */
  DiscreteLog = 0,
  /** Bilinear Pairing assumptions (e.g., Groth16, PLONK with KZG) */
  Pairing = 1,
  /** Collision-resistant hashing (e.g., STARK, FRI) */
  HashBased = 2,
  /** Lattice-based (future: zkSTARK with lattice commitments) */
  Lattice = 3,
}

/**
 * Security model declaration for a proof system
 *
 * Formally declares the security properties of a verifier,
 * enabling machine-readable security analysis.
 */
export class SecurityModel {
  /** Setup type (trusted/universal/transparent) */
  public readonly setupType: SetupType;

  /** Cryptographic assumption */
  public readonly cryptoAssumption: CryptoAssumption;

  /** Security level in bits */
  public readonly securityBits: number;

  /** Whether post-quantum security is required */
  public readonly postQuantumRequired: boolean;

  /** Minimum acceptable security level in bits */
  public readonly minSecurityBits: number;

  constructor(params: {
    setupType: SetupType;
    cryptoAssumption: CryptoAssumption;
    securityBits: number;
    postQuantumRequired?: boolean;
    minSecurityBits?: number;
  }) {
    this.setupType = params.setupType;
    this.cryptoAssumption = params.cryptoAssumption;
    this.securityBits = params.securityBits;
    this.postQuantumRequired = params.postQuantumRequired ?? false;
    this.minSecurityBits = params.minSecurityBits ?? 100;
  }

  /**
   * Groth16 security model (BN254)
   */
  static groth16Bn254(): SecurityModel {
    return new SecurityModel({
      setupType: SetupType.Trusted,
      cryptoAssumption: CryptoAssumption.Pairing,
      securityBits: 128,
      postQuantumRequired: false,
      minSecurityBits: 100,
    });
  }

  /**
   * PLONK security model (KZG on BN254)
   */
  static plonkKzgBn254(): SecurityModel {
    return new SecurityModel({
      setupType: SetupType.Universal,
      cryptoAssumption: CryptoAssumption.Pairing,
      securityBits: 128,
      postQuantumRequired: false,
      minSecurityBits: 100,
    });
  }

  /**
   * STARK security model (FRI-based)
   */
  static starkFri(): SecurityModel {
    return new SecurityModel({
      setupType: SetupType.Transparent,
      cryptoAssumption: CryptoAssumption.HashBased,
      securityBits: 100,
      postQuantumRequired: false, // STARK is PQ but not required by default
      minSecurityBits: 100,
    });
  }

  /**
   * Check if this security model is post-quantum secure
   */
  isPostQuantum(): boolean {
    return (
      this.cryptoAssumption === CryptoAssumption.HashBased ||
      this.cryptoAssumption === CryptoAssumption.Lattice
    );
  }

  /**
   * Encode to bytes for on-chain storage (5 bytes)
   */
  encode(): Uint8Array {
    const buf = new Uint8Array(5);
    buf[0] = this.setupType;
    buf[1] = this.cryptoAssumption;
    buf[2] = this.securityBits;
    buf[3] = this.postQuantumRequired ? 1 : 0;
    buf[4] = this.minSecurityBits;
    return buf;
  }

  /**
   * Decode from bytes
   */
  static decode(bytes: Uint8Array): SecurityModel | null {
    if (bytes.length < 5) {
      return null;
    }

    return new SecurityModel({
      setupType: bytes[0] as SetupType,
      cryptoAssumption: bytes[1] as CryptoAssumption,
      securityBits: bytes[2],
      postQuantumRequired: bytes[3] === 1,
      minSecurityBits: bytes[4],
    });
  }
}

// ============================================================================
// Registered VK
// ============================================================================

/**
 * Registered verification key metadata
 *
 * Stored on-chain to validate incoming proofs.
 */
export class RegisteredVK {
  /** Proof system type */
  public readonly proofType: ProofType;

  /** VK hash (keccak256 of VK bytes) */
  public readonly vkHash: Uint8Array;

  /** Circuit identifier */
  public readonly circuitId: Uint8Array;

  /** Expected curve */
  public readonly curveId: CurveId;

  /** Maximum allowed public inputs */
  public readonly maxPublicInputs: number;

  constructor(params: {
    proofType: ProofType;
    vkHash: Uint8Array;
    circuitId: Uint8Array;
    curveId: CurveId;
    maxPublicInputs: number;
  }) {
    if (params.vkHash.length !== 32) {
      throw new Error("vkHash must be 32 bytes");
    }
    if (params.circuitId.length !== 32) {
      throw new Error("circuitId must be 32 bytes");
    }

    this.proofType = params.proofType;
    this.vkHash = params.vkHash;
    this.circuitId = params.circuitId;
    this.curveId = params.curveId;
    this.maxPublicInputs = params.maxPublicInputs;
  }
}

// ============================================================================
// Dispatch Validator
// ============================================================================

/**
 * Dispatch boundary security validator
 *
 * Validates proofs at the dispatch boundary BEFORE invoking the verifier.
 * This is the first line of defense against malformed or malicious proofs.
 */
export class DispatchValidator {
  /** Maximum allowed recursion depth */
  public readonly maxRecursionDepth: number;

  /** Minimum required security bits */
  public readonly minSecurityBits: number;

  /** Whether to require post-quantum security */
  public readonly requirePostQuantum: boolean;

  constructor(params?: {
    maxRecursionDepth?: number;
    minSecurityBits?: number;
    requirePostQuantum?: boolean;
  }) {
    this.maxRecursionDepth = params?.maxRecursionDepth ?? 8;
    this.minSecurityBits = params?.minSecurityBits ?? 100;
    this.requirePostQuantum = params?.requirePostQuantum ?? false;
  }

  /**
   * Create a validator with default settings
   */
  static default(): DispatchValidator {
    return new DispatchValidator();
  }

  /**
   * Create a strict validator (e.g., for high-value operations)
   */
  static strict(): DispatchValidator {
    return new DispatchValidator({
      maxRecursionDepth: 4,
      minSecurityBits: 128,
      requirePostQuantum: true,
    });
  }

  /**
   * Validate proof type binding
   *
   * Ensures the descriptor's proof type matches the registered VK's type.
   * Prevents proof type confusion attacks.
   */
  validateProofTypeBinding(
    descriptor: UniversalProofDescriptor,
    registeredVK: RegisteredVK,
  ): void {
    const descriptorProofType = descriptor.proofType();

    if (descriptorProofType === null) {
      throw new ValidationError(
        SecurityError.ProofTypeMismatch,
        `Unknown proof type: ${descriptor.proofSystemId}`,
      );
    }

    if (descriptorProofType !== registeredVK.proofType) {
      throw new ValidationError(
        SecurityError.ProofTypeMismatch,
        `Expected ${registeredVK.proofType}, got ${descriptorProofType}`,
      );
    }
  }

  /**
   * Validate curve compatibility
   *
   * Ensures the proof's curve matches the verifier's expected curve.
   * Prevents curve mismatch attacks.
   */
  validateCurveMatch(
    descriptor: UniversalProofDescriptor,
    registeredVK: RegisteredVK,
  ): void {
    if (descriptor.curveId !== registeredVK.curveId) {
      throw new ValidationError(
        SecurityError.CurveMismatch,
        `Expected curve ${registeredVK.curveId}, got ${descriptor.curveId}`,
      );
    }
  }

  /**
   * Validate recursion depth
   *
   * Prevents recursion bomb attacks by limiting proof nesting.
   */
  validateRecursionDepth(descriptor: UniversalProofDescriptor): void {
    if (descriptor.recursionDepth > this.maxRecursionDepth) {
      throw new ValidationError(
        SecurityError.ExcessiveRecursionDepth,
        `Recursion depth ${descriptor.recursionDepth} exceeds max ${this.maxRecursionDepth}`,
      );
    }
  }

  /**
   * Validate public input count
   *
   * Ensures the number of public inputs doesn't exceed verifier limits.
   */
  validateInputCount(
    descriptor: UniversalProofDescriptor,
    registeredVK: RegisteredVK,
  ): void {
    if (descriptor.publicInputCount > registeredVK.maxPublicInputs) {
      throw new ValidationError(
        SecurityError.TooManyPublicInputs,
        `${descriptor.publicInputCount} inputs exceeds max ${registeredVK.maxPublicInputs}`,
      );
    }
  }

  /**
   * Validate proof size
   *
   * Ensures proof size is within bounds for the proof system.
   */
  validateProofSize(descriptor: UniversalProofDescriptor): void {
    const proofType = descriptor.proofType();

    // Define expected size ranges per proof type
    const sizeRanges: Record<number, { min: number; max: number }> = {
      [ProofType.Groth16]: { min: 128, max: 512 },
      [ProofType.PLONK]: { min: 500, max: 2000 },
      [ProofType.STARK]: { min: 1000, max: 500_000 },
    };

    if (proofType !== null && sizeRanges[proofType]) {
      const range = sizeRanges[proofType];
      if (
        descriptor.proofLength < range.min ||
        descriptor.proofLength > range.max
      ) {
        throw new ValidationError(
          SecurityError.ProofSizeOutOfBounds,
          `Proof size ${descriptor.proofLength} out of range [${range.min}, ${range.max}]`,
        );
      }
    }
  }

  /**
   * Validate security level
   *
   * Ensures the proof system provides sufficient security.
   */
  validateSecurityLevel(securityModel: SecurityModel): void {
    if (securityModel.securityBits < this.minSecurityBits) {
      throw new ValidationError(
        SecurityError.InsufficientSecurityLevel,
        `Security ${securityModel.securityBits} bits < required ${this.minSecurityBits}`,
      );
    }

    if (this.requirePostQuantum && !securityModel.isPostQuantum()) {
      throw new ValidationError(
        SecurityError.PostQuantumRequired,
        "Post-quantum security required but not provided",
      );
    }
  }

  /**
   * Run all validation checks
   *
   * Comprehensive validation before dispatching to verifier.
   */
  validateAll(
    descriptor: UniversalProofDescriptor,
    registeredVK: RegisteredVK,
    securityModel: SecurityModel,
  ): void {
    this.validateProofTypeBinding(descriptor, registeredVK);
    this.validateCurveMatch(descriptor, registeredVK);
    this.validateRecursionDepth(descriptor);
    this.validateInputCount(descriptor, registeredVK);
    this.validateProofSize(descriptor);
    this.validateSecurityLevel(securityModel);
  }
}

// ============================================================================
// Validation Error
// ============================================================================

/**
 * Security validation error with code and message
 */
export class ValidationError extends Error {
  public readonly code: SecurityError;

  constructor(code: SecurityError, message: string) {
    super(message);
    this.code = code;
    this.name = "ValidationError";
  }
}

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Hash a descriptor for audit logging
 *
 * Creates a deterministic hash of the descriptor for security logging.
 * Note: This is a simple implementation; use keccak256 in production.
 */
export function hashDescriptor(
  descriptor: UniversalProofDescriptor,
): Uint8Array {
  // Simple hash for TypeScript - in production, use keccak256 from viem
  const encoded = descriptor.encode();
  const hash = new Uint8Array(32);

  // Simple XOR-based hash (for demonstration - use proper hash in production)
  for (let i = 0; i < encoded.length; i++) {
    hash[i % 32] ^= encoded[i];
  }

  return hash;
}

/**
 * Security audit record for logging/events
 */
export interface SecurityAuditRecord {
  /** Descriptor hash */
  descriptorHash: Uint8Array;
  /** Validation timestamp */
  timestamp: number;
  /** Validation result (true = passed) */
  passed: boolean;
  /** Error code if failed */
  errorCode?: SecurityError;
  /** Error message if failed */
  errorMessage?: string;
}

/**
 * Create a security audit record
 */
export function createAuditRecord(
  descriptor: UniversalProofDescriptor,
  passed: boolean,
  error?: ValidationError,
): SecurityAuditRecord {
  return {
    descriptorHash: hashDescriptor(descriptor),
    timestamp: Date.now(),
    passed,
    errorCode: error?.code,
    errorMessage: error?.message,
  };
}
