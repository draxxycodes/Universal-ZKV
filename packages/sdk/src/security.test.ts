/**
 * Security - Unit Tests
 *
 * Tests for dispatch validation, security model, and error handling.
 */

import { describe, it, expect } from "vitest";
import {
  SecurityError,
  SetupType,
  CryptoAssumption,
  SecurityModel,
  RegisteredVK,
  DispatchValidator,
  ValidationError,
  hashDescriptor,
  createAuditRecord,
} from "./security";
import { CurveId, UniversalProofDescriptor } from "./upd";
import { ProofType } from "./types";

describe("SecurityModel", () => {
  describe("presets", () => {
    it("should create Groth16 BN254 model", () => {
      const model = SecurityModel.groth16Bn254();

      expect(model.setupType).toBe(SetupType.Trusted);
      expect(model.cryptoAssumption).toBe(CryptoAssumption.Pairing);
      expect(model.securityBits).toBe(128);
      expect(model.isPostQuantum()).toBe(false);
    });

    it("should create PLONK KZG BN254 model", () => {
      const model = SecurityModel.plonkKzgBn254();

      expect(model.setupType).toBe(SetupType.Universal);
      expect(model.cryptoAssumption).toBe(CryptoAssumption.Pairing);
      expect(model.securityBits).toBe(128);
    });

    it("should create STARK FRI model", () => {
      const model = SecurityModel.starkFri();

      expect(model.setupType).toBe(SetupType.Transparent);
      expect(model.cryptoAssumption).toBe(CryptoAssumption.HashBased);
      expect(model.securityBits).toBe(100);
      expect(model.isPostQuantum()).toBe(true);
    });
  });

  describe("encode/decode", () => {
    it("should encode and decode correctly", () => {
      const original = SecurityModel.groth16Bn254();
      const encoded = original.encode();

      expect(encoded.length).toBe(5);

      const decoded = SecurityModel.decode(encoded);
      expect(decoded).not.toBeNull();
      expect(decoded!.setupType).toBe(original.setupType);
      expect(decoded!.cryptoAssumption).toBe(original.cryptoAssumption);
      expect(decoded!.securityBits).toBe(original.securityBits);
    });

    it("should return null for too short buffer", () => {
      const decoded = SecurityModel.decode(new Uint8Array(3));
      expect(decoded).toBeNull();
    });
  });
});

describe("RegisteredVK", () => {
  it("should create with valid params", () => {
    const vk = new RegisteredVK({
      proofType: ProofType.Groth16,
      vkHash: new Uint8Array(32).fill(0xaa),
      circuitId: new Uint8Array(32).fill(0xbb),
      curveId: CurveId.BN254,
      maxPublicInputs: 16,
    });

    expect(vk.proofType).toBe(ProofType.Groth16);
    expect(vk.maxPublicInputs).toBe(16);
  });

  it("should reject invalid vkHash size", () => {
    expect(() => {
      new RegisteredVK({
        proofType: ProofType.Groth16,
        vkHash: new Uint8Array(31), // Wrong size
        circuitId: new Uint8Array(32),
        curveId: CurveId.BN254,
        maxPublicInputs: 16,
      });
    }).toThrow("vkHash must be 32 bytes");
  });

  it("should reject invalid circuitId size", () => {
    expect(() => {
      new RegisteredVK({
        proofType: ProofType.Groth16,
        vkHash: new Uint8Array(32),
        circuitId: new Uint8Array(31), // Wrong size
        curveId: CurveId.BN254,
        maxPublicInputs: 16,
      });
    }).toThrow("circuitId must be 32 bytes");
  });
});

describe("DispatchValidator", () => {
  const createTestDescriptor = () =>
    UniversalProofDescriptor.groth16(
      4,
      new Uint8Array(32).fill(0x11),
      new Uint8Array(32).fill(0x22),
    );

  const createTestVK = () =>
    new RegisteredVK({
      proofType: ProofType.Groth16,
      vkHash: new Uint8Array(32).fill(0x11),
      circuitId: new Uint8Array(32).fill(0x22),
      curveId: CurveId.BN254,
      maxPublicInputs: 16,
    });

  describe("factory methods", () => {
    it("should create default validator", () => {
      const validator = DispatchValidator.default();
      expect(validator.maxRecursionDepth).toBe(8);
      expect(validator.minSecurityBits).toBe(100);
      expect(validator.requirePostQuantum).toBe(false);
    });

    it("should create strict validator", () => {
      const validator = DispatchValidator.strict();
      expect(validator.maxRecursionDepth).toBe(4);
      expect(validator.minSecurityBits).toBe(128);
      expect(validator.requirePostQuantum).toBe(true);
    });
  });

  describe("validateProofTypeBinding", () => {
    it("should pass when types match", () => {
      const validator = DispatchValidator.default();
      const descriptor = createTestDescriptor();
      const vk = createTestVK();

      expect(() =>
        validator.validateProofTypeBinding(descriptor, vk),
      ).not.toThrow();
    });

    it("should fail when types mismatch", () => {
      const validator = DispatchValidator.default();
      const descriptor = createTestDescriptor(); // Groth16
      const vk = new RegisteredVK({
        proofType: ProofType.PLONK, // Mismatch
        vkHash: new Uint8Array(32),
        circuitId: new Uint8Array(32),
        curveId: CurveId.BN254,
        maxPublicInputs: 16,
      });

      expect(() => validator.validateProofTypeBinding(descriptor, vk)).toThrow(
        ValidationError,
      );
    });
  });

  describe("validateCurveMatch", () => {
    it("should pass when curves match", () => {
      const validator = DispatchValidator.default();
      const descriptor = createTestDescriptor();
      const vk = createTestVK();

      expect(() => validator.validateCurveMatch(descriptor, vk)).not.toThrow();
    });

    it("should fail when curves mismatch", () => {
      const validator = DispatchValidator.default();
      const descriptor = createTestDescriptor(); // BN254
      const vk = new RegisteredVK({
        proofType: ProofType.Groth16,
        vkHash: new Uint8Array(32),
        circuitId: new Uint8Array(32),
        curveId: CurveId.BLS12_381, // Mismatch
        maxPublicInputs: 16,
      });

      expect(() => validator.validateCurveMatch(descriptor, vk)).toThrow(
        ValidationError,
      );
    });
  });

  describe("validateRecursionDepth", () => {
    it("should pass when depth is within limit", () => {
      const validator = DispatchValidator.default();
      const descriptor = createTestDescriptor();

      expect(() => validator.validateRecursionDepth(descriptor)).not.toThrow();
    });

    it("should fail when depth exceeds limit", () => {
      const validator = new DispatchValidator({ maxRecursionDepth: 4 });
      const descriptor = new UniversalProofDescriptor({
        proofSystemId: ProofType.Groth16,
        curveId: CurveId.BN254,
        hashFunctionId: 0,
        recursionDepth: 8, // Exceeds limit
        publicInputCount: 4,
        proofLength: 256,
        vkCommitment: new Uint8Array(32),
        circuitId: new Uint8Array(32),
      });

      expect(() => validator.validateRecursionDepth(descriptor)).toThrow(
        ValidationError,
      );
    });
  });

  describe("validateInputCount", () => {
    it("should pass when count is within limit", () => {
      const validator = DispatchValidator.default();
      const descriptor = createTestDescriptor();
      const vk = createTestVK();

      expect(() => validator.validateInputCount(descriptor, vk)).not.toThrow();
    });

    it("should fail when count exceeds limit", () => {
      const validator = DispatchValidator.default();
      const descriptor = new UniversalProofDescriptor({
        proofSystemId: ProofType.Groth16,
        curveId: CurveId.BN254,
        hashFunctionId: 0,
        recursionDepth: 0,
        publicInputCount: 100, // Exceeds maxPublicInputs
        proofLength: 256,
        vkCommitment: new Uint8Array(32),
        circuitId: new Uint8Array(32),
      });
      const vk = createTestVK(); // maxPublicInputs = 16

      expect(() => validator.validateInputCount(descriptor, vk)).toThrow(
        ValidationError,
      );
    });
  });

  describe("validateSecurityLevel", () => {
    it("should pass when security is sufficient", () => {
      const validator = DispatchValidator.default();
      const model = SecurityModel.groth16Bn254(); // 128 bits

      expect(() => validator.validateSecurityLevel(model)).not.toThrow();
    });

    it("should fail when security is insufficient", () => {
      const validator = new DispatchValidator({ minSecurityBits: 128 });
      const model = new SecurityModel({
        setupType: SetupType.Trusted,
        cryptoAssumption: CryptoAssumption.Pairing,
        securityBits: 80, // Below minimum
      });

      expect(() => validator.validateSecurityLevel(model)).toThrow(
        ValidationError,
      );
    });

    it("should fail when post-quantum required but not provided", () => {
      const validator = DispatchValidator.strict();
      const model = SecurityModel.groth16Bn254(); // Not post-quantum

      expect(() => validator.validateSecurityLevel(model)).toThrow(
        ValidationError,
      );
    });
  });

  describe("validateAll", () => {
    it("should pass all checks for valid input", () => {
      const validator = DispatchValidator.default();
      const descriptor = createTestDescriptor();
      const vk = createTestVK();
      const model = SecurityModel.groth16Bn254();

      expect(() => validator.validateAll(descriptor, vk, model)).not.toThrow();
    });
  });
});

describe("ValidationError", () => {
  it("should include error code", () => {
    const error = new ValidationError(
      SecurityError.ProofTypeMismatch,
      "Test message",
    );

    expect(error.code).toBe(SecurityError.ProofTypeMismatch);
    expect(error.message).toBe("Test message");
    expect(error.name).toBe("ValidationError");
  });
});

describe("Utility functions", () => {
  describe("hashDescriptor", () => {
    it("should return 32-byte hash", () => {
      const descriptor = UniversalProofDescriptor.groth16(
        4,
        new Uint8Array(32),
        new Uint8Array(32),
      );

      const hash = hashDescriptor(descriptor);
      expect(hash.length).toBe(32);
    });

    it("should return different hashes for different descriptors", () => {
      const d1 = UniversalProofDescriptor.groth16(
        4,
        new Uint8Array(32),
        new Uint8Array(32),
      );
      const d2 = UniversalProofDescriptor.plonk(
        8,
        new Uint8Array(32),
        new Uint8Array(32),
      );

      const h1 = hashDescriptor(d1);
      const h2 = hashDescriptor(d2);

      expect(h1).not.toEqual(h2);
    });
  });

  describe("createAuditRecord", () => {
    it("should create record for passed validation", () => {
      const descriptor = UniversalProofDescriptor.groth16(
        4,
        new Uint8Array(32),
        new Uint8Array(32),
      );

      const record = createAuditRecord(descriptor, true);

      expect(record.passed).toBe(true);
      expect(record.descriptorHash.length).toBe(32);
      expect(record.timestamp).toBeGreaterThan(0);
      expect(record.errorCode).toBeUndefined();
    });

    it("should create record for failed validation", () => {
      const descriptor = UniversalProofDescriptor.groth16(
        4,
        new Uint8Array(32),
        new Uint8Array(32),
      );
      const error = new ValidationError(
        SecurityError.CurveMismatch,
        "Curve mismatch",
      );

      const record = createAuditRecord(descriptor, false, error);

      expect(record.passed).toBe(false);
      expect(record.errorCode).toBe(SecurityError.CurveMismatch);
      expect(record.errorMessage).toBe("Curve mismatch");
    });
  });
});
