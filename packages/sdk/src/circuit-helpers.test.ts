/**
 * Tests for PublicStatement Circuit Helpers
 */

import { describe, it, expect } from "vitest";
import {
  circuitInputsToPublicStatement,
  fieldElementToBytes32,
  parseSnarkjsPublicInputs,
  createGroth16Proof,
  createTestPublicStatement,
  validatePublicStatement,
  createProofPayload,
} from "./circuit-helpers";
import { ProofType, PublicStatement } from "./types";

describe("Circuit Helpers", () => {
  describe("fieldElementToBytes32", () => {
    it("should convert field element string to 32 bytes", () => {
      const field = "12345";
      const bytes = fieldElementToBytes32(field);

      expect(bytes.length).toBe(32);
      expect(bytes[31]).toBe(0x39); // 12345 = 0x3039
      expect(bytes[30]).toBe(0x30);
    });

    it("should handle large field elements", () => {
      const field =
        "8234104122482341265491137074636836252947884782870784360943022469005013929455";
      const bytes = fieldElementToBytes32(field);

      expect(bytes.length).toBe(32);
    });

    it("should handle BigInt input", () => {
      const field = BigInt("0x1234567890abcdef");
      const bytes = fieldElementToBytes32(field);

      expect(bytes.length).toBe(32);
      expect(bytes[31]).toBe(0xef);
      expect(bytes[30]).toBe(0xcd);
    });
  });

  describe("parseSnarkjsPublicInputs", () => {
    it("should parse 5 public inputs into PublicStatement format", () => {
      const publicJson = [
        "0",
        "8234104122482341265491137074636836252947884782870784360943022469005013929455",
        "15046301437886485981820688550832103193484625835926133964909148811342873885668",
        "1000000",
        "0",
      ];

      const inputs = parseSnarkjsPublicInputs(publicJson);

      expect(inputs.merkle_root).toBe("0");
      expect(inputs.public_key).toBe(
        "8234104122482341265491137074636836252947884782870784360943022469005013929455",
      );
      expect(inputs.nullifier).toBe(
        "15046301437886485981820688550832103193484625835926133964909148811342873885668",
      );
      expect(inputs.value).toBe("1000000");
      expect(inputs.extra).toBe("0");
    });

    it("should throw error if wrong number of inputs", () => {
      const publicJson = ["1", "2", "3"]; // Only 3 inputs

      expect(() => parseSnarkjsPublicInputs(publicJson)).toThrow(
        "Expected 5 public inputs (PublicStatement fields), got 3",
      );
    });
  });

  describe("circuitInputsToPublicStatement", () => {
    it("should convert circuit inputs to PublicStatement", () => {
      const inputs = {
        merkle_root: "0",
        public_key:
          "8234104122482341265491137074636836252947884782870784360943022469005013929455",
        nullifier:
          "15046301437886485981820688550832103193484625835926133964909148811342873885668",
        value: "1000000",
        extra: "0",
      };

      const statement = circuitInputsToPublicStatement(inputs);

      expect(statement.merkleRoot.length).toBe(32);
      expect(statement.publicKey.length).toBe(32);
      expect(statement.nullifier.length).toBe(32);
      expect(statement.value).toBe(BigInt(1000000));
      expect(statement.extra.length).toBe(0);
    });

    it("should handle non-zero extra field", () => {
      const inputs = {
        merkle_root: "0",
        public_key: "123",
        nullifier: "456",
        value: "1000",
        extra: "0x1234",
      };

      const statement = circuitInputsToPublicStatement(inputs);

      expect(statement.extra.length).toBe(2);
      expect(statement.extra[0]).toBe(0x12);
      expect(statement.extra[1]).toBe(0x34);
    });
  });

  describe("createGroth16Proof", () => {
    it("should create UniversalProof from circuit outputs", () => {
      const publicInputs = {
        merkle_root: "0",
        public_key:
          "8234104122482341265491137074636836252947884782870784360943022469005013929455",
        nullifier:
          "15046301437886485981820688550832103193484625835926133964909148811342873885668",
        value: "1000000",
        extra: "0",
      };

      const proofBytes = new Uint8Array(256);
      const vkHash = new Uint8Array(32);
      const proof = createGroth16Proof(
        "poseidon_with_statement",
        publicInputs,
        proofBytes,
        vkHash,
      );

      expect(proof.proofType).toBe(ProofType.Groth16);
      expect(proof.programId).toBe(1); // PoseidonWithStatement
      expect(proof.publicInputsBytes.length).toBeGreaterThanOrEqual(116);
      expect(proof.proofBytes.length).toBe(256);
    });

    it("should encode correctly", () => {
      const publicInputs = {
        merkle_root: "0",
        public_key: "123",
        nullifier: "456",
        value: "1000",
        extra: "0",
      };

      const proofBytes = new Uint8Array(256);
      const vkHash = new Uint8Array(32);
      const proof = createGroth16Proof(1, publicInputs, proofBytes, vkHash);

      const encoded = proof.encode();
      expect(encoded.length).toBeGreaterThan(0);
    });
  });

  describe("validatePublicStatement", () => {
    it("should validate correct PublicStatement", () => {
      const statement = createTestPublicStatement();

      expect(() => validatePublicStatement(statement)).not.toThrow();
    });

    it("should throw on invalid merkleRoot length", () => {
      // PublicStatement constructor already validates, so we test our validation function separately
      expect(() => {
        new PublicStatement({
          merkleRoot: new Uint8Array(16),
          publicKey: new Uint8Array(32),
          nullifier: new Uint8Array(32),
          value: 0n,
          extra: new Uint8Array(0),
        });
      }).toThrow("merkleRoot must be 32 bytes");
    });

    it("should throw on invalid publicKey length", () => {
      expect(() => {
        new PublicStatement({
          merkleRoot: new Uint8Array(32),
          publicKey: new Uint8Array(20),
          nullifier: new Uint8Array(32),
          value: 0n,
          extra: new Uint8Array(0),
        });
      }).toThrow("publicKey must be 32 bytes");
    });

    it("should throw on negative value", () => {
      expect(() => {
        new PublicStatement({
          merkleRoot: new Uint8Array(32),
          publicKey: new Uint8Array(32),
          nullifier: new Uint8Array(32),
          value: BigInt(-1),
          extra: new Uint8Array(0),
        });
      }).toThrow("value must be non-negative");
    });

    it("should throw on value exceeding u128", () => {
      expect(() => {
        new PublicStatement({
          merkleRoot: new Uint8Array(32),
          publicKey: new Uint8Array(32),
          nullifier: new Uint8Array(32),
          value: 1n << 128n,
          extra: new Uint8Array(0),
        });
      }).toThrow("value must fit in u128");
    });
  });

  describe("createProofPayload", () => {
    it("should create complete proof payload", () => {
      const publicInputs = {
        merkle_root: "0",
        public_key:
          "8234104122482341265491137074636836252947884782870784360943022469005013929455",
        nullifier:
          "15046301437886485981820688550832103193484625835926133964909148811342873885668",
        value: "1000000",
        extra: "0",
      };

      const proofJson = {
        pi_a: ["1", "2", "1"],
        pi_b: [
          ["3", "4"],
          ["5", "6"],
          ["1", "0"],
        ],
        pi_c: ["7", "8", "1"],
        protocol: "groth16",
        curve: "bn128",
      };

      const vkHash = new Uint8Array(32);
      const payload = createProofPayload(
        "poseidon_with_statement",
        publicInputs,
        proofJson,
        vkHash,
      );

      expect(payload.universalProof).toBeDefined();
      expect(payload.publicStatement).toBeDefined();
      expect(payload.universalProof.programId).toBe(1); // PoseidonWithStatement
      expect(payload.publicStatement.value).toBe(BigInt(1000000));
    });

    it("should throw on invalid PublicStatement", () => {
      const publicInputs = {
        merkle_root: "0",
        public_key: "123",
        nullifier: "456",
        value: "-1", // Invalid negative value
        extra: "0",
      };

      const proofJson = {};
      const vkHash = new Uint8Array(32);

      expect(() =>
        createProofPayload(1, publicInputs, proofJson, vkHash),
      ).toThrow();
    });
  });

  describe("createTestPublicStatement", () => {
    it("should create valid test PublicStatement", () => {
      const statement = createTestPublicStatement();

      expect(statement.merkleRoot.length).toBe(32);
      expect(statement.publicKey.length).toBe(32);
      expect(statement.nullifier.length).toBe(32);
      expect(statement.value).toBe(BigInt(1000000));
      expect(statement.extra.length).toBe(0);

      // Should pass validation
      expect(() => validatePublicStatement(statement)).not.toThrow();
    });

    it("should create statement that encodes correctly", () => {
      const statement = createTestPublicStatement();
      const encoded = statement.encode();

      expect(encoded.length).toBe(116); // 32 + 32 + 32 + 16 + 4 + 0
    });
  });
});
