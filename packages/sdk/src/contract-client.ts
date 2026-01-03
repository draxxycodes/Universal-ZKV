/**
 * UZKV Contract Client
 *
 * Direct interaction with the Universal ZK Verifier smart contract
 * on Arbitrum Sepolia (Stylus).
 *
 * This module provides:
 * - verifyUniversalProof: Submit a proof for on-chain verification
 * - estimateVerificationCost: Get gas estimate for a proof type
 * - getVerificationCount: Read total verification count
 * - registerVK: Register a verification key
 */

import {
    createPublicClient,
    createWalletClient,
    type PublicClient,
    type WalletClient,
    type Address,
    type Hex,
    http,
    encodeFunctionData,
    decodeFunctionResult,
} from "viem";
import { arbitrumSepolia } from "viem/chains";
import { privateKeyToAccount, type PrivateKeyAccount } from "viem/accounts";
import { ProofType } from "./types";

/**
 * Contract ABI for the Universal ZK Verifier
 *
 * Generated from the Stylus contract's exported functions.
 * Note: Stylus uses snake_case for function names internally,
 * but the ABI exports them in camelCase.
 */
const UZKV_ABI = [
    // View Functions
    {
        name: "getVerificationCount",
        type: "function",
        stateMutability: "view",
        inputs: [],
        outputs: [{ type: "uint256" }],
    },
    {
        name: "estimateVerificationCost",
        type: "function",
        stateMutability: "view",
        inputs: [
            { name: "proofType", type: "uint8" },
            { name: "inputCount", type: "uint32" },
        ],
        outputs: [{ type: "uint64" }],
    },
    // State-Changing Functions
    {
        name: "verifyUniversalProof",
        type: "function",
        stateMutability: "nonpayable",
        inputs: [
            { name: "version", type: "uint8" },
            { name: "proofType", type: "uint8" },
            { name: "programId", type: "uint32" },
            { name: "vkHash", type: "bytes32" },
            { name: "proofBytes", type: "bytes" },
            { name: "publicInputsBytes", type: "bytes" },
        ],
        outputs: [{ type: "bool" }],
    },
    {
        name: "registerVK",
        type: "function",
        stateMutability: "nonpayable",
        inputs: [
            { name: "proofType", type: "uint8" },
            { name: "programId", type: "uint32" },
            { name: "vkHash", type: "bytes32" },
            { name: "vkData", type: "bytes" },
        ],
        outputs: [],
    },
    {
        name: "registerPrecomputedPairing",
        type: "function",
        stateMutability: "nonpayable",
        inputs: [
            { name: "proofType", type: "uint8" },
            { name: "programId", type: "uint32" },
            { name: "vkHash", type: "bytes32" },
            { name: "pairingData", type: "bytes" },
        ],
        outputs: [],
    },
    // Events
    {
        name: "ProofVerified",
        type: "event",
        inputs: [
            { name: "proofType", type: "uint8", indexed: true },
            { name: "programId", type: "uint32", indexed: true },
            { name: "vkHash", type: "bytes32", indexed: true },
            { name: "isValid", type: "bool", indexed: false },
        ],
    },
] as const;

/**
 * Configuration for the UZKV Contract Client
 */
export interface ContractClientConfig {
    /** RPC URL for Arbitrum Sepolia */
    rpcUrl?: string;
    /** Contract address */
    contractAddress: Address;
    /** Private key for signing transactions (optional, for write operations) */
    privateKey?: Hex;
}

/**
 * Universal Proof data for verification
 */
export interface UniversalProofData {
    version: number;
    proofType: ProofType;
    programId: number;
    vkHash: Hex;
    proofBytes: Hex;
    publicInputsBytes: Hex;
}

/**
 * Verification Key registration data
 */
export interface VKRegistration {
    proofType: ProofType;
    programId: number;
    vkHash: Hex;
    vkData: Hex;
}

/**
 * UZKV Contract Client
 *
 * Provides direct interaction with the deployed Universal ZK Verifier contract.
 */
export class UZKVContractClient {
    private publicClient: PublicClient;
    private walletClient?: WalletClient;
    private account?: PrivateKeyAccount;
    private contractAddress: Address;

    constructor(config: ContractClientConfig) {
        const rpcUrl =
            config.rpcUrl ||
            "https://arbitrum-sepolia.infura.io/v3/your-infura-key";

        this.contractAddress = config.contractAddress;

        this.publicClient = createPublicClient({
            chain: arbitrumSepolia,
            transport: http(rpcUrl),
        });

        if (config.privateKey) {
            this.account = privateKeyToAccount(config.privateKey);
            this.walletClient = createWalletClient({
                account: this.account,
                chain: arbitrumSepolia,
                transport: http(rpcUrl),
            });
        }
    }

    /**
     * Get the total number of proofs verified
     */
    async getVerificationCount(): Promise<bigint> {
        const result = await this.publicClient.readContract({
            address: this.contractAddress,
            abi: UZKV_ABI,
            functionName: "getVerificationCount",
        });
        return result as bigint;
    }

    /**
     * Estimate gas cost for verifying a proof of given type and input count
     *
     * @param proofType - Type of proof (0=Groth16, 1=PLONK, 2=STARK)
     * @param inputCount - Number of public inputs
     * @returns Estimated gas cost in wei
     */
    async estimateVerificationCost(
        proofType: ProofType,
        inputCount: number
    ): Promise<bigint> {
        const result = await this.publicClient.readContract({
            address: this.contractAddress,
            abi: UZKV_ABI,
            functionName: "estimateVerificationCost",
            args: [proofType, inputCount],
        });
        return result as bigint;
    }

    /**
     * Verify a universal proof on-chain
     *
     * @param proof - The proof data to verify
     * @returns true if proof is valid, false otherwise
     * @throws Error if wallet client is not configured or transaction fails
     */
    async verifyUniversalProof(proof: UniversalProofData): Promise<boolean> {
        if (!this.walletClient || !this.account) {
            throw new Error("Wallet client not configured. Provide privateKey in config.");
        }

        // Simulate first to check validity
        const { result } = await this.publicClient.simulateContract({
            address: this.contractAddress,
            abi: UZKV_ABI,
            functionName: "verifyUniversalProof",
            args: [
                proof.version,
                proof.proofType,
                proof.programId,
                proof.vkHash,
                proof.proofBytes,
                proof.publicInputsBytes,
            ],
            account: this.account,
        });

        // Execute transaction
        const hash = await this.walletClient.writeContract({
            address: this.contractAddress,
            abi: UZKV_ABI,
            functionName: "verifyUniversalProof",
            args: [
                proof.version,
                proof.proofType,
                proof.programId,
                proof.vkHash,
                proof.proofBytes,
                proof.publicInputsBytes,
            ],
            chain: arbitrumSepolia,
            account: this.account,
        });

        // Wait for confirmation
        const receipt = await this.publicClient.waitForTransactionReceipt({ hash });

        return result as boolean;
    }

    /**
     * Register a verification key for a program
     *
     * @param vk - The verification key data to register
     * @returns Transaction hash
     */
    async registerVK(vk: VKRegistration): Promise<Hex> {
        if (!this.walletClient || !this.account) {
            throw new Error("Wallet client not configured. Provide privateKey in config.");
        }

        const hash = await this.walletClient.writeContract({
            address: this.contractAddress,
            abi: UZKV_ABI,
            functionName: "registerVK",
            args: [vk.proofType, vk.programId, vk.vkHash, vk.vkData],
            chain: arbitrumSepolia,
            account: this.account,
        });

        await this.publicClient.waitForTransactionReceipt({ hash });
        return hash;
    }

    /**
     * Register precomputed pairing data for gas-optimized Groth16 verification
     *
     * @param proofType - Should be ProofType.Groth16
     * @param programId - Program ID
     * @param vkHash - Hash of the verification key
     * @param pairingData - Precomputed e(α, β) pairing result
     * @returns Transaction hash
     */
    async registerPrecomputedPairing(
        proofType: ProofType,
        programId: number,
        vkHash: Hex,
        pairingData: Hex
    ): Promise<Hex> {
        if (!this.walletClient || !this.account) {
            throw new Error("Wallet client not configured. Provide privateKey in config.");
        }

        const hash = await this.walletClient.writeContract({
            address: this.contractAddress,
            abi: UZKV_ABI,
            functionName: "registerPrecomputedPairing",
            args: [proofType, programId, vkHash, pairingData],
            chain: arbitrumSepolia,
            account: this.account,
        });

        await this.publicClient.waitForTransactionReceipt({ hash });
        return hash;
    }

    /**
     * Helper: Encode a Groth16 proof for submission
     *
     * @param A - G1 point [x, y] (32 bytes each, big-endian)
     * @param B - G2 point [[x1, x2], [y1, y2]] (32 bytes each)
     * @param C - G1 point [x, y] (32 bytes each, big-endian)
     * @returns Encoded proof bytes
     */
    static encodeGroth16Proof(
        A: [bigint, bigint],
        B: [[bigint, bigint], [bigint, bigint]],
        C: [bigint, bigint]
    ): Hex {
        const bytes = new Uint8Array(256); // 2*32 + 4*32 + 2*32
        let offset = 0;

        // A (G1): x, y
        bytes.set(bigintToBytes32(A[0]), offset);
        offset += 32;
        bytes.set(bigintToBytes32(A[1]), offset);
        offset += 32;

        // B (G2): x1, x2, y1, y2
        bytes.set(bigintToBytes32(B[0][0]), offset);
        offset += 32;
        bytes.set(bigintToBytes32(B[0][1]), offset);
        offset += 32;
        bytes.set(bigintToBytes32(B[1][0]), offset);
        offset += 32;
        bytes.set(bigintToBytes32(B[1][1]), offset);
        offset += 32;

        // C (G1): x, y
        bytes.set(bigintToBytes32(C[0]), offset);
        offset += 32;
        bytes.set(bigintToBytes32(C[1]), offset);

        return bytesToHex(bytes);
    }

    /**
     * Helper: Encode public inputs for submission
     *
     * @param inputs - Array of field elements (bigints)
     * @returns Encoded public inputs bytes
     */
    static encodePublicInputs(inputs: bigint[]): Hex {
        const bytes = new Uint8Array(inputs.length * 32);
        for (let i = 0; i < inputs.length; i++) {
            bytes.set(bigintToBytes32(inputs[i]), i * 32);
        }
        return bytesToHex(bytes);
    }
}

// Helper functions
function bigintToBytes32(n: bigint): Uint8Array {
    const hex = n.toString(16).padStart(64, "0");
    const bytes = new Uint8Array(32);
    for (let i = 0; i < 32; i++) {
        bytes[i] = parseInt(hex.slice(i * 2, i * 2 + 2), 16);
    }
    return bytes;
}

function bytesToHex(bytes: Uint8Array): Hex {
    return ("0x" +
        Array.from(bytes)
            .map((b) => b.toString(16).padStart(2, "0"))
            .join("")) as Hex;
}

/**
 * Create a UZKV Contract Client instance
 */
export function createContractClient(
    config: ContractClientConfig
): UZKVContractClient {
    return new UZKVContractClient(config);
}
