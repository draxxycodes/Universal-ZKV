/**
 * Attestor Contract Integration
 *
 * Interacts with the on-chain attestor contract to submit verification results
 */

import {
  createPublicClient,
  createWalletClient,
  http,
  type Address,
  type Hash,
} from "viem";
import { arbitrumSepolia } from "viem/chains";
import { privateKeyToAccount } from "viem/accounts";
import pino from "pino";

const logger = pino({ name: "attestor" });

// Attestor contract ABI (simplified)
const ATTESTOR_ABI = [
  {
    inputs: [
      { name: "proofHash", type: "bytes32" },
      { name: "isValid", type: "bool" },
      { name: "proofType", type: "uint8" },
    ],
    name: "attest",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [{ name: "proofHash", type: "bytes32" }],
    name: "getAttestation",
    outputs: [
      { name: "isValid", type: "bool" },
      { name: "timestamp", type: "uint256" },
      { name: "proofType", type: "uint8" },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    anonymous: false,
    inputs: [
      { indexed: true, name: "proofHash", type: "bytes32" },
      { indexed: false, name: "isValid", type: "bool" },
      { indexed: false, name: "proofType", type: "uint8" },
      { indexed: false, name: "timestamp", type: "uint256" },
    ],
    name: "ProofAttested",
    type: "event",
  },
] as const;

const PROOF_TYPE_PLONK = 1; // 0 = Groth16, 1 = PLONK, 2 = STARK

export class AttestorClient {
  private publicClient;
  private walletClient;
  private attestorAddress: Address;
  private account;

  constructor() {
    const rpcUrl =
      process.env.RPC_URL || "https://sepolia-rollup.arbitrum.io/rpc";
    const attestorAddress = process.env.ATTESTOR_ADDRESS as Address;
    const privateKey = process.env.ATTESTOR_PRIVATE_KEY;

    if (!attestorAddress) {
      throw new Error("ATTESTOR_ADDRESS not configured");
    }

    this.attestorAddress = attestorAddress;

    // Public client for reading
    this.publicClient = createPublicClient({
      chain: arbitrumSepolia,
      transport: http(rpcUrl),
    });

    // Wallet client for writing (if private key provided)
    if (privateKey) {
      this.account = privateKeyToAccount(privateKey as `0x${string}`);
      this.walletClient = createWalletClient({
        account: this.account,
        chain: arbitrumSepolia,
        transport: http(rpcUrl),
      });
      logger.info(
        { address: this.account.address },
        "Attestor wallet configured",
      );
    } else {
      logger.warn("ATTESTOR_PRIVATE_KEY not set - attestation disabled");
    }
  }

  /**
   * Submit an attestation to the on-chain contract
   */
  async attest(proofHash: Hash, isValid: boolean): Promise<Hash | null> {
    if (!this.walletClient || !this.account) {
      logger.warn("Attestation skipped - wallet not configured");
      return null;
    }

    try {
      logger.info({ proofHash, isValid }, "Submitting attestation");

      const hash = await this.walletClient.writeContract({
        address: this.attestorAddress,
        abi: ATTESTOR_ABI,
        functionName: "attest",
        args: [proofHash, isValid, PROOF_TYPE_PLONK],
      });

      logger.info({ proofHash, txHash: hash }, "Attestation submitted");
      return hash;
    } catch (error) {
      logger.error({ error, proofHash }, "Failed to submit attestation");
      throw error;
    }
  }

  /**
   * Get attestation status from the on-chain contract
   */
  async getAttestation(proofHash: Hash): Promise<{
    isValid: boolean;
    timestamp: bigint;
    proofType: number;
  } | null> {
    try {
      const result = await this.publicClient.readContract({
        address: this.attestorAddress,
        abi: ATTESTOR_ABI,
        functionName: "getAttestation",
        args: [proofHash],
      });

      return {
        isValid: result[0],
        timestamp: result[1],
        proofType: result[2],
      };
    } catch (error) {
      logger.error({ error, proofHash }, "Failed to get attestation");
      return null;
    }
  }

  /**
   * Get recent attestation events
   */
  async getAttestationEvents(fromBlock?: bigint): Promise<any[]> {
    try {
      const logs = await this.publicClient.getLogs({
        address: this.attestorAddress,
        event: ATTESTOR_ABI[2], // ProofAttested event
        fromBlock: fromBlock || "earliest",
        toBlock: "latest",
      });

      return logs;
    } catch (error) {
      logger.error({ error }, "Failed to get attestation events");
      return [];
    }
  }
}

export const attestorClient = new AttestorClient();
