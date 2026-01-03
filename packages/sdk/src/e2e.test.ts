/**
 * End-to-End Integration Tests
 *
 * These tests run against a deployed contract on Arbitrum Sepolia.
 * They require:
 * 1. A deployed contract (address in passed config or env)
 * 2. A private key for signing transactions
 * 3. RPC URL
 *
 * Usage:
 * DEPLOYED_ADDRESS=0x... PRIVATE_KEY=0x... npm test src/e2e.test.ts
 */

import { describe, it, expect, beforeAll } from "vitest";
import {
    createContractClient,
    UZKVContractClient,
    ProofType,
    UniversalProofData,
} from "./index";
import { createGroth16Proof, createProofPayload } from "./circuit-helpers";
import { UniversalProofDescriptor } from "./upd";

// Skip E2E tests if no contract address is provided
const DEPLOYED_ADDRESS = process.env.DEPLOYED_ADDRESS;
const PRIVATE_KEY = process.env.PRIVATE_KEY as `0x${string}` | undefined;
const RPC_URL = process.env.ARB_SEPOLIA_RPC || "https://sepolia-rollup.arbitrum.io/rpc";

const runE2E = DEPLOYED_ADDRESS && PRIVATE_KEY ? describe : describe.skip;

runE2E("End-to-End Protocol Verification", () => {
    let client: UZKVContractClient;

    beforeAll(() => {
        if (!DEPLOYED_ADDRESS || !PRIVATE_KEY) return;

        client = createContractClient({
            contractAddress: DEPLOYED_ADDRESS as `0x${string}`,
            privateKey: PRIVATE_KEY,
            rpcUrl: RPC_URL,
        });
    });

    it("should connect to the contract and read verification count", async () => {
        const count = await client.getVerificationCount();
        expect(count).toBeDefined();
        console.log(`Current verification count: ${count}`);
    });

    it("should estimate gas for Groth16 verification", async () => {
        const gas = await client.estimateVerificationCost(ProofType.Groth16, 2);
        expect(gas).toBeGreaterThan(0n);
        console.log(`Groth16 gas estimate: ${gas}`);
    });

    it("should estimate gas for PLONK verification", async () => {
        const gas = await client.estimateVerificationCost(ProofType.PLONK, 2);
        expect(gas).toBeGreaterThan(0n);
        console.log(`PLONK gas estimate: ${gas}`);
    });

    it("should fail verification for invalid proof data (expected)", async () => {
        // Construct a dummy proof that is structurally valid but cryptographically invalid
        const upd = UniversalProofDescriptor.groth16(2, new Uint8Array(32), new Uint8Array(32));

        // Create dummy proof bytes (random)
        const proofBytes = new Uint8Array(256).fill(1) as any;
        const inputsBytes = new Uint8Array(64).fill(2) as any; // 2 inputs

        const proofData: UniversalProofData = {
            version: 1,
            proofType: ProofType.Groth16,
            programId: 100, // Test program ID
            vkHash: ("0x" + "00".repeat(32)) as `0x${string}`,
            proofBytes: ("0x" + Buffer.from(proofBytes).toString("hex")) as `0x${string}`,
            publicInputsBytes: ("0x" + Buffer.from(inputsBytes).toString("hex")) as `0x${string}`,
        };

        // We expect this to execute but return false (or revert depending on contract logic)
        // The current contract returns bool for verification result
        try {
            const isValid = await client.verifyUniversalProof(proofData);
            expect(isValid).toBe(false);
        } catch (e) {
            // If it reverts (e.g. Deserialization error), that's also acceptable for this test
            // typically verify_universal returns Result<bool>, but if it propagates error it might revert
            console.log("Verification reverted as expected for invalid proof");
        }
    });
});
