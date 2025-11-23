/**
 * Universal Proof Protocol Types - Unit Tests
 *
 * These tests ensure byte-for-byte compatibility with the Rust implementation.
 * Test vectors should match the Rust tests in packages/stylus/src/types.rs
 */

import { describe, it, expect } from "vitest";
import { ProofType, PublicStatement, UniversalProof } from "./types";

describe("ProofType", () => {
  it("should have correct numeric values", () => {
    expect(ProofType.Groth16).toBe(0);
    expect(ProofType.PLONK).toBe(1);
    expect(ProofType.STARK).toBe(2);
  });
});

describe("PublicStatement", () => {
  it("should encode and decode correctly", () => {
    const statement = new PublicStatement({
      merkleRoot: new Uint8Array(32).fill(0x11),
      publicKey: new Uint8Array(32).fill(0x22),
      nullifier: new Uint8Array(32).fill(0x33),
      value: 12345n,
      extra: new Uint8Array(0),
    });

    const encoded = statement.encode();
    const decoded = PublicStatement.decode(encoded);

    expect(decoded.merkleRoot).toEqual(statement.merkleRoot);
    expect(decoded.publicKey).toEqual(statement.publicKey);
    expect(decoded.nullifier).toEqual(statement.nullifier);
    expect(decoded.value).toBe(statement.value);
    expect(decoded.extra).toEqual(statement.extra);
  });

  it("should encode with correct size (no extra data)", () => {
    const statement = new PublicStatement({
      merkleRoot: new Uint8Array(32).fill(0x11),
      publicKey: new Uint8Array(32).fill(0x22),
      nullifier: new Uint8Array(32).fill(0x33),
      value: 12345n,
    });

    const encoded = statement.encode();
    expect(encoded.length).toBe(116); // 32+32+32+16+4+0
  });

  it("should encode with extra data", () => {
    const extra = new Uint8Array([0xde, 0xad, 0xbe, 0xef]);
    const statement = new PublicStatement({
      merkleRoot: new Uint8Array(32).fill(0x11),
      publicKey: new Uint8Array(32).fill(0x22),
      nullifier: new Uint8Array(32).fill(0x33),
      value: 12345n,
      extra,
    });

    const encoded = statement.encode();
    expect(encoded.length).toBe(120); // 116 + 4 extra bytes

    const decoded = PublicStatement.decode(encoded);
    expect(decoded.extra).toEqual(extra);
  });

  it("should validate field sizes", () => {
    // Invalid merkleRoot size
    expect(() => {
      new PublicStatement({
        merkleRoot: new Uint8Array(31), // Wrong size
        publicKey: new Uint8Array(32),
        nullifier: new Uint8Array(32),
        value: 0n,
      });
    }).toThrow("merkleRoot must be 32 bytes");

    // Invalid publicKey size
    expect(() => {
      new PublicStatement({
        merkleRoot: new Uint8Array(32),
        publicKey: new Uint8Array(33), // Wrong size
        nullifier: new Uint8Array(32),
        value: 0n,
      });
    }).toThrow("publicKey must be 32 bytes");

    // Invalid nullifier size
    expect(() => {
      new PublicStatement({
        merkleRoot: new Uint8Array(32),
        publicKey: new Uint8Array(32),
        nullifier: new Uint8Array(31), // Wrong size
        value: 0n,
      });
    }).toThrow("nullifier must be 32 bytes");
  });

  it("should validate value range", () => {
    // Negative value
    expect(() => {
      new PublicStatement({
        merkleRoot: new Uint8Array(32),
        publicKey: new Uint8Array(32),
        nullifier: new Uint8Array(32),
        value: -1n,
      });
    }).toThrow("value must be non-negative");

    // Value too large for u128
    expect(() => {
      new PublicStatement({
        merkleRoot: new Uint8Array(32),
        publicKey: new Uint8Array(32),
        nullifier: new Uint8Array(32),
        value: 2n ** 128n, // Exactly at limit (should fail)
      });
    }).toThrow("value must fit in u128");
  });

  it("should decode and reject buffer too short", () => {
    const tooShort = new Uint8Array(100); // < 116 bytes
    expect(() => PublicStatement.decode(tooShort)).toThrow("Buffer too short");
  });

  it("should calculate encoded size correctly", () => {
    const statement1 = new PublicStatement({
      merkleRoot: new Uint8Array(32),
      publicKey: new Uint8Array(32),
      nullifier: new Uint8Array(32),
      value: 0n,
    });
    expect(statement1.encodedSize()).toBe(116);

    const statement2 = new PublicStatement({
      merkleRoot: new Uint8Array(32),
      publicKey: new Uint8Array(32),
      nullifier: new Uint8Array(32),
      value: 0n,
      extra: new Uint8Array(100),
    });
    expect(statement2.encodedSize()).toBe(216); // 116 + 100
  });

  it("should handle large u128 values correctly", () => {
    const maxU128 = 2n ** 128n - 1n;
    const statement = new PublicStatement({
      merkleRoot: new Uint8Array(32),
      publicKey: new Uint8Array(32),
      nullifier: new Uint8Array(32),
      value: maxU128,
    });

    const encoded = statement.encode();
    const decoded = PublicStatement.decode(encoded);

    expect(decoded.value).toBe(maxU128);
  });
});

describe("UniversalProof", () => {
  it("should encode and decode correctly", () => {
    const proof = new UniversalProof({
      version: 1,
      proofType: ProofType.PLONK,
      programId: 42,
      vkHash: new Uint8Array(32).fill(0xab),
      proofBytes: new Uint8Array([0x01, 0x02, 0x03, 0x04, 0x05]),
      publicInputsBytes: new Uint8Array([0x06, 0x07, 0x08, 0x09]),
    });

    const encoded = proof.encode();
    const decoded = UniversalProof.decode(encoded);

    expect(decoded.version).toBe(proof.version);
    expect(decoded.proofType).toBe(proof.proofType);
    expect(decoded.programId).toBe(proof.programId);
    expect(decoded.vkHash).toEqual(proof.vkHash);
    expect(decoded.proofBytes).toEqual(proof.proofBytes);
    expect(decoded.publicInputsBytes).toEqual(proof.publicInputsBytes);
  });

  it("should default to version 1", () => {
    const proof = new UniversalProof({
      proofType: ProofType.Groth16,
      programId: 0,
      vkHash: new Uint8Array(32),
      proofBytes: new Uint8Array(128),
      publicInputsBytes: new Uint8Array(116),
    });

    expect(proof.version).toBe(1);
  });

  it("should reject invalid version", () => {
    expect(() => {
      new UniversalProof({
        version: 99,
        proofType: ProofType.Groth16,
        programId: 0,
        vkHash: new Uint8Array(32),
        proofBytes: new Uint8Array(0),
        publicInputsBytes: new Uint8Array(0),
      });
    }).toThrow("Unsupported protocol version: 99");
  });

  it("should validate vkHash size", () => {
    expect(() => {
      new UniversalProof({
        proofType: ProofType.Groth16,
        programId: 0,
        vkHash: new Uint8Array(31), // Wrong size
        proofBytes: new Uint8Array(0),
        publicInputsBytes: new Uint8Array(0),
      });
    }).toThrow("vkHash must be 32 bytes");
  });

  it("should validate programId range", () => {
    expect(() => {
      new UniversalProof({
        proofType: ProofType.Groth16,
        programId: -1, // Negative
        vkHash: new Uint8Array(32),
        proofBytes: new Uint8Array(0),
        publicInputsBytes: new Uint8Array(0),
      });
    }).toThrow("programId must be a valid u32");

    expect(() => {
      new UniversalProof({
        proofType: ProofType.Groth16,
        programId: 0x100000000, // > u32::MAX
        vkHash: new Uint8Array(32),
        proofBytes: new Uint8Array(0),
        publicInputsBytes: new Uint8Array(0),
      });
    }).toThrow("programId must be a valid u32");
  });

  it("should decode and reject buffer too short", () => {
    const tooShort = new Uint8Array(40); // < 46 bytes
    expect(() => UniversalProof.decode(tooShort)).toThrow("Buffer too short");
  });

  it("should decode and reject invalid version", () => {
    const buffer = new Uint8Array(46);
    buffer[0] = 99; // Invalid version
    buffer[1] = ProofType.Groth16;

    expect(() => UniversalProof.decode(buffer)).toThrow(
      "Unsupported protocol version: 99",
    );
  });

  it("should decode and reject invalid proof type", () => {
    const buffer = new Uint8Array(46);
    buffer[0] = 1; // Valid version
    buffer[1] = 99; // Invalid proof type

    expect(() => UniversalProof.decode(buffer)).toThrow(
      "Invalid proof type: 99",
    );
  });

  it("should calculate encoded size correctly", () => {
    const proof = new UniversalProof({
      proofType: ProofType.PLONK,
      programId: 0,
      vkHash: new Uint8Array(32),
      proofBytes: new Uint8Array(128),
      publicInputsBytes: new Uint8Array(116),
    });

    expect(proof.encodedSize()).toBe(290); // 46 + 128 + 116
  });

  it("should work with PublicStatement via withStatement", () => {
    const statement = new PublicStatement({
      merkleRoot: new Uint8Array(32).fill(0x11),
      publicKey: new Uint8Array(32).fill(0x22),
      nullifier: new Uint8Array(32).fill(0x33),
      value: 999n,
    });

    const proof = UniversalProof.withStatement({
      proofType: ProofType.Groth16,
      programId: 1,
      vkHash: new Uint8Array(32).fill(0xff),
      proofBytes: new Uint8Array([0xde, 0xad, 0xbe, 0xef]),
      publicStatement: statement,
    });

    const decodedStatement = proof.decodePublicStatement();
    expect(decodedStatement.merkleRoot).toEqual(statement.merkleRoot);
    expect(decodedStatement.publicKey).toEqual(statement.publicKey);
    expect(decodedStatement.nullifier).toEqual(statement.nullifier);
    expect(decodedStatement.value).toBe(statement.value);
  });

  it("should encode all proof types correctly", () => {
    const proofTypes = [ProofType.Groth16, ProofType.PLONK, ProofType.STARK];

    proofTypes.forEach((proofType) => {
      const proof = new UniversalProof({
        proofType,
        programId: 0,
        vkHash: new Uint8Array(32),
        proofBytes: new Uint8Array(100),
        publicInputsBytes: new Uint8Array(116),
      });

      const encoded = proof.encode();
      const decoded = UniversalProof.decode(encoded);

      expect(decoded.proofType).toBe(proofType);
    });
  });
});

describe("Cross-Compatibility Test Vectors", () => {
  it("should match Rust test vector for PublicStatement", () => {
    // This matches the Rust test: test_public_statement_encode_decode
    const statement = new PublicStatement({
      merkleRoot: new Uint8Array(32).fill(0x01),
      publicKey: new Uint8Array(32).fill(0x02),
      nullifier: new Uint8Array(32).fill(0x03),
      value: 12345n,
    });

    const encoded = statement.encode();

    // Verify structure
    expect(encoded.length).toBe(116);

    // Verify merkleRoot bytes
    for (let i = 0; i < 32; i++) {
      expect(encoded[i]).toBe(0x01);
    }

    // Verify publicKey bytes
    for (let i = 32; i < 64; i++) {
      expect(encoded[i]).toBe(0x02);
    }

    // Verify nullifier bytes
    for (let i = 64; i < 96; i++) {
      expect(encoded[i]).toBe(0x03);
    }

    // Verify value (12345 as u128 little-endian in 16 bytes)
    expect(encoded[96]).toBe(0x39); // 12345 & 0xFF
    expect(encoded[97]).toBe(0x30); // (12345 >> 8) & 0xFF
    expect(encoded[98]).toBe(0x00);
    // Rest should be zeros
    for (let i = 99; i < 112; i++) {
      expect(encoded[i]).toBe(0x00);
    }

    // Verify extra length (0 as u32 little-endian)
    expect(encoded[112]).toBe(0x00);
    expect(encoded[113]).toBe(0x00);
    expect(encoded[114]).toBe(0x00);
    expect(encoded[115]).toBe(0x00);

    // Decode and verify
    const decoded = PublicStatement.decode(encoded);
    expect(decoded.value).toBe(12345n);
  });

  it("should match Rust test vector for UniversalProof", () => {
    // This matches the Rust test: test_universal_proof_encode_decode
    const proof = new UniversalProof({
      version: 1,
      proofType: ProofType.PLONK,
      programId: 42,
      vkHash: new Uint8Array(32).fill(0xab),
      proofBytes: new Uint8Array([0x01, 0x02, 0x03, 0x04, 0x05]),
      publicInputsBytes: new Uint8Array([0x06, 0x07, 0x08, 0x09]),
    });

    const encoded = proof.encode();

    // Verify header
    expect(encoded[0]).toBe(1); // version
    expect(encoded[1]).toBe(1); // proof_type (PLONK)

    // Verify programId (42 as u32 little-endian)
    expect(encoded[2]).toBe(42);
    expect(encoded[3]).toBe(0);
    expect(encoded[4]).toBe(0);
    expect(encoded[5]).toBe(0);

    // Verify vkHash (all 0xAB)
    for (let i = 6; i < 38; i++) {
      expect(encoded[i]).toBe(0xab);
    }

    // Verify proof length (5 as u32 little-endian)
    expect(encoded[38]).toBe(5);
    expect(encoded[39]).toBe(0);
    expect(encoded[40]).toBe(0);
    expect(encoded[41]).toBe(0);

    // Verify proof bytes
    expect(encoded[42]).toBe(0x01);
    expect(encoded[43]).toBe(0x02);
    expect(encoded[44]).toBe(0x03);
    expect(encoded[45]).toBe(0x04);
    expect(encoded[46]).toBe(0x05);

    // Verify public inputs length (4 as u32 little-endian)
    expect(encoded[47]).toBe(4);
    expect(encoded[48]).toBe(0);
    expect(encoded[49]).toBe(0);
    expect(encoded[50]).toBe(0);

    // Verify public inputs bytes
    expect(encoded[51]).toBe(0x06);
    expect(encoded[52]).toBe(0x07);
    expect(encoded[53]).toBe(0x08);
    expect(encoded[54]).toBe(0x09);

    // Total size
    expect(encoded.length).toBe(55); // 46 + 5 + 4

    // Decode and verify
    const decoded = UniversalProof.decode(encoded);
    expect(decoded.version).toBe(1);
    expect(decoded.proofType).toBe(ProofType.PLONK);
    expect(decoded.programId).toBe(42);
  });
});
