/**
 * Universal Proof Descriptor (UPD) v2 - Unit Tests
 *
 * Tests for UPD encoding/decoding, validation, and gas estimation.
 * Ensures byte-for-byte compatibility with Rust implementation.
 */

import { describe, it, expect } from "vitest";
import {
  CurveId,
  HashFunctionId,
  DescriptorError,
  UniversalProofDescriptor,
} from "./upd";
import { ProofType } from "./types";

describe("CurveId", () => {
  it("should have correct numeric values", () => {
    expect(CurveId.BN254).toBe(0);
    expect(CurveId.BLS12_381).toBe(1);
    expect(CurveId.Pasta).toBe(2);
    expect(CurveId.Ed25519).toBe(3);
    expect(CurveId.Goldilocks).toBe(4);
    expect(CurveId.None).toBe(255);
  });
});

describe("HashFunctionId", () => {
  it("should have correct numeric values", () => {
    expect(HashFunctionId.Poseidon).toBe(0);
    expect(HashFunctionId.SHA256).toBe(1);
    expect(HashFunctionId.Blake3).toBe(2);
    expect(HashFunctionId.Keccak256).toBe(3);
    expect(HashFunctionId.RescuePrime).toBe(4);
  });
});

describe("UniversalProofDescriptor", () => {
  it("should encode and decode correctly", () => {
    const descriptor = new UniversalProofDescriptor({
      proofSystemId: ProofType.PLONK,
      curveId: CurveId.BN254,
      hashFunctionId: HashFunctionId.Keccak256,
      recursionDepth: 0,
      publicInputCount: 10,
      proofLength: 800,
      vkCommitment: new Uint8Array(32).fill(0xab),
      circuitId: new Uint8Array(32).fill(0xcd),
    });

    const encoded = descriptor.encode();
    expect(encoded.length).toBe(75);

    const decoded = UniversalProofDescriptor.decode(encoded);
    expect(decoded.updVersion).toBe(2);
    expect(decoded.proofSystemId).toBe(ProofType.PLONK);
    expect(decoded.curveId).toBe(CurveId.BN254);
    expect(decoded.hashFunctionId).toBe(HashFunctionId.Keccak256);
    expect(decoded.recursionDepth).toBe(0);
    expect(decoded.publicInputCount).toBe(10);
    expect(decoded.proofLength).toBe(800);
    expect(decoded.vkCommitment).toEqual(new Uint8Array(32).fill(0xab));
    expect(decoded.circuitId).toEqual(new Uint8Array(32).fill(0xcd));
  });

  it("should use Groth16 convenience constructor", () => {
    const descriptor = UniversalProofDescriptor.groth16(
      4,
      new Uint8Array(32).fill(0x11),
      new Uint8Array(32).fill(0x22),
    );

    expect(descriptor.proofSystemId).toBe(ProofType.Groth16);
    expect(descriptor.curveId).toBe(CurveId.BN254);
    expect(descriptor.hashFunctionId).toBe(HashFunctionId.Poseidon);
    expect(descriptor.publicInputCount).toBe(4);
    expect(descriptor.proofLength).toBe(256);
  });

  it("should use PLONK convenience constructor", () => {
    const descriptor = UniversalProofDescriptor.plonk(
      8,
      new Uint8Array(32).fill(0x33),
      new Uint8Array(32).fill(0x44),
    );

    expect(descriptor.proofSystemId).toBe(ProofType.PLONK);
    expect(descriptor.curveId).toBe(CurveId.BN254);
    expect(descriptor.hashFunctionId).toBe(HashFunctionId.Keccak256);
    expect(descriptor.publicInputCount).toBe(8);
  });

  it("should use STARK convenience constructor", () => {
    const descriptor = UniversalProofDescriptor.stark(
      4,
      50000,
      new Uint8Array(32).fill(0x55),
    );

    expect(descriptor.proofSystemId).toBe(ProofType.STARK);
    expect(descriptor.curveId).toBe(CurveId.None);
    expect(descriptor.hashFunctionId).toBe(HashFunctionId.Blake3);
    expect(descriptor.proofLength).toBe(50000);
  });

  it("should validate correctly", () => {
    const valid = UniversalProofDescriptor.groth16(
      4,
      new Uint8Array(32),
      new Uint8Array(32),
    );
    expect(() => valid.validate()).not.toThrow();
  });

  it("should reject too many public inputs", () => {
    const descriptor = new UniversalProofDescriptor({
      proofSystemId: ProofType.Groth16,
      curveId: CurveId.BN254,
      hashFunctionId: HashFunctionId.Poseidon,
      recursionDepth: 0,
      publicInputCount: 2000, // > MAX_PUBLIC_INPUTS
      proofLength: 256,
      vkCommitment: new Uint8Array(32),
      circuitId: new Uint8Array(32),
    });

    expect(() => descriptor.validate()).toThrow(
      DescriptorError.TooManyPublicInputs,
    );
  });

  it("should reject excessive recursion depth", () => {
    const descriptor = new UniversalProofDescriptor({
      proofSystemId: ProofType.Groth16,
      curveId: CurveId.BN254,
      hashFunctionId: HashFunctionId.Poseidon,
      recursionDepth: 20, // > MAX_RECURSION_DEPTH
      publicInputCount: 4,
      proofLength: 256,
      vkCommitment: new Uint8Array(32),
      circuitId: new Uint8Array(32),
    });

    expect(() => descriptor.validate()).toThrow(
      DescriptorError.ExcessiveRecursionDepth,
    );
  });

  it("should estimate gas for different proof types", () => {
    // Use 2 inputs where Groth16 (330k) is cheaper than PLONK (370k)
    const groth16 = UniversalProofDescriptor.groth16(
      2,
      new Uint8Array(32),
      new Uint8Array(32),
    );
    const plonk = UniversalProofDescriptor.plonk(
      2,
      new Uint8Array(32),
      new Uint8Array(32),
    );
    const stark = UniversalProofDescriptor.stark(4, 50000, new Uint8Array(32));

    const groth16Gas = groth16.estimateGas();
    const plonkGas = plonk.estimateGas();
    const starkGas = stark.estimateGas();

    // Groth16 is cheaper for low input counts
    expect(groth16Gas).toBeLessThan(plonkGas);
    expect(plonkGas).toBeLessThan(starkGas);

    // Verify approximate values
    expect(groth16Gas).toBe(250_000n + 40_000n * 2n); // 330k
    expect(plonkGas).toBe(350_000n + 10_000n * 2n); // 370k
    expect(starkGas).toBe(200_000n + 5_000n * 4n + 10n * 50_000n); // 720k
  });

  it("should decode and reject buffer too short", () => {
    const tooShort = new Uint8Array(50);
    expect(() => UniversalProofDescriptor.decode(tooShort)).toThrow(
      DescriptorError.BufferTooShort,
    );
  });

  it("should decode and reject unknown curve", () => {
    const buffer = new Uint8Array(75);
    buffer[0] = 2; // version
    buffer[1] = 0; // proof system (Groth16)
    buffer[2] = 100; // invalid curve ID

    expect(() => UniversalProofDescriptor.decode(buffer)).toThrow(
      DescriptorError.UnknownCurve,
    );
  });
});

describe("Cross-Compatibility with Rust", () => {
  it("should match Rust test vector for UPD encode/decode", () => {
    // This matches the Rust test: test_upd_encode_decode_roundtrip
    const original = UniversalProofDescriptor.groth16(
      4,
      new Uint8Array(32).fill(0x01),
      new Uint8Array(32).fill(0x02),
    );

    const encoded = original.encode();
    expect(encoded.length).toBe(UniversalProofDescriptor.ENCODED_SIZE);

    // Verify header bytes
    expect(encoded[0]).toBe(2); // version
    expect(encoded[1]).toBe(0); // Groth16
    expect(encoded[2]).toBe(0); // BN254
    expect(encoded[3]).toBe(0); // Poseidon
    expect(encoded[4]).toBe(0); // recursion depth

    // public_input_count (big-endian u16) = 4
    expect(encoded[5]).toBe(0);
    expect(encoded[6]).toBe(4);

    // proof_length (big-endian u32) = 256
    expect(encoded[7]).toBe(0);
    expect(encoded[8]).toBe(0);
    expect(encoded[9]).toBe(1);
    expect(encoded[10]).toBe(0);

    const decoded = UniversalProofDescriptor.decode(encoded);
    expect(decoded.updVersion).toBe(original.updVersion);
    expect(decoded.proofSystemId).toBe(original.proofSystemId);
    expect(decoded.publicInputCount).toBe(4);
  });
});
