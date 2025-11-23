/**
 * Attestor Client for On-Chain Attestation
 *
 * Interacts with the deployed attestor contract at 0x36e937ebcf56c5dec6ecb0695001becc87738177
 * to record proof verification results on Arbitrum Sepolia
 */

import {
  createPublicClient,
  createWalletClient,
  http,
  type PublicClient,
  type WalletClient,
  type Hash,
  type Address,
} from "viem";
import { arbitrumSepolia } from "viem/chains";
import { privateKeyToAccount } from "viem/accounts";
import pino from "pino";

const logger = pino({ name: "attestor-client" });

// Attestor contract ABI (minimal interface)
const ATTESTOR_ABI = [
  {
    type: "function",
    name: "attestProof",
    inputs: [{ name: "proofHash", type: "bytes32" }],
    outputs: [],
    stateMutability: "nonpayable",
  },
  {
    type: "function",
    name: "isAttested",
    inputs: [{ name: "proofHash", type: "bytes32" }],
    outputs: [{ name: "", type: "bool" }],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "getAttestationTimestamp",
    inputs: [{ name: "proofHash", type: "bytes32" }],
    outputs: [{ name: "", type: "uint256" }],
    stateMutability: "view",
  },
  {
    type: "event",
    name: "ProofAttested",
    inputs: [
      { name: "proofHash", type: "bytes32", indexed: true },
      { name: "timestamp", type: "uint256", indexed: false },
    ],
  },
] as const;

export interface AttestationResult {
  success: boolean;
  transactionHash?: Hash;
  gasUsed?: bigint;
  error?: string;
}

export interface AttestationStatus {
  isAttested: boolean;
  timestamp?: number;
}

export class AttestorClient {
  private publicClient: PublicClient;
  private walletClient?: WalletClient;
  private attestorAddress: Address;

  constructor(
    rpcUrl: string = process.env.RPC_URL ||
      "https://sepolia-rollup.arbitrum.io/rpc",
    attestorAddress: string = process.env.ATTESTOR_ADDRESS ||
      "0x36e937ebcf56c5dec6ecb0695001becc87738177",
    privateKey?: string,
  ) {
    this.attestorAddress = attestorAddress as Address;

    // Create public client for reading
    this.publicClient = createPublicClient({
      chain: arbitrumSepolia,
      transport: http(rpcUrl),
    });

    // Create wallet client if private key provided
    if (privateKey) {
      const account = privateKeyToAccount(privateKey as `0x${string}`);
      this.walletClient = createWalletClient({
        account,
        chain: arbitrumSepolia,
        transport: http(rpcUrl),
      });

      logger.info({ address: account.address }, "Wallet client initialized");
    } else {
      logger.warn("No private key provided - attestation will be read-only");
    }
  }

  /**
   * Attest a proof on-chain
   */
  async attestProof(proofHash: string): Promise<AttestationResult> {
    if (!this.walletClient) {
      return {
        success: false,
        error: "No wallet client configured - cannot submit transactions",
      };
    }

    try {
      logger.info({ proofHash }, "Attesting proof on-chain");

      // Check if already attested
      const isAttested = await this.isAttested(proofHash);
      if (isAttested.isAttested) {
        logger.info({ proofHash }, "Proof already attested");
        return {
          success: true,
          error: "Proof already attested",
        };
      }

      // Simulate transaction first
      const { request } = await this.publicClient.simulateContract({
        address: this.attestorAddress,
        abi: ATTESTOR_ABI,
        functionName: "attestProof",
        args: [proofHash as `0x${string}`],
        account: this.walletClient.account,
      });

      // Execute transaction
      const hash = await this.walletClient.writeContract(request);

      logger.info(
        { transactionHash: hash },
        "Attestation transaction submitted",
      );

      // Wait for confirmation
      const receipt = await this.publicClient.waitForTransactionReceipt({
        hash,
      });

      if (receipt.status === "success") {
        logger.info(
          { transactionHash: hash, gasUsed: receipt.gasUsed },
          "Proof attested successfully",
        );

        return {
          success: true,
          transactionHash: hash,
          gasUsed: receipt.gasUsed,
        };
      } else {
        logger.error({ receipt }, "Attestation transaction reverted");
        return {
          success: false,
          error: "Transaction reverted",
        };
      }
    } catch (error) {
      logger.error({ error, proofHash }, "Failed to attest proof");
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }

  /**
   * Check if a proof is attested
   */
  async isAttested(proofHash: string): Promise<AttestationStatus> {
    try {
      const isAttested = await this.publicClient.readContract({
        address: this.attestorAddress,
        abi: ATTESTOR_ABI,
        functionName: "isAttested",
        args: [proofHash as `0x${string}`],
      });

      if (!isAttested) {
        return { isAttested: false };
      }

      // Get timestamp
      const timestamp = await this.publicClient.readContract({
        address: this.attestorAddress,
        abi: ATTESTOR_ABI,
        functionName: "getAttestationTimestamp",
        args: [proofHash as `0x${string}`],
      });

      return {
        isAttested: true,
        timestamp: Number(timestamp),
      };
    } catch (error) {
      logger.error({ error, proofHash }, "Failed to check attestation status");
      return { isAttested: false };
    }
  }

  /**
   * Get attestation events for a proof
   */
  async getAttestationEvents(proofHash?: string): Promise<any[]> {
    try {
      const logs = await this.publicClient.getContractEvents({
        address: this.attestorAddress,
        abi: ATTESTOR_ABI,
        eventName: "ProofAttested",
        fromBlock: 0n,
        toBlock: "latest",
        args: proofHash ? { proofHash: proofHash as `0x${string}` } : undefined,
      });

      return logs.map((log) => ({
        proofHash: log.args.proofHash,
        timestamp: Number(log.args.timestamp),
        blockNumber: log.blockNumber,
        transactionHash: log.transactionHash,
      }));
    } catch (error) {
      logger.error({ error }, "Failed to fetch attestation events");
      return [];
    }
  }

  /**
   * Estimate gas for attestation
   */
  async estimateAttestationGas(proofHash: string): Promise<bigint> {
    try {
      const gas = await this.publicClient.estimateContractGas({
        address: this.attestorAddress,
        abi: ATTESTOR_ABI,
        functionName: "attestProof",
        args: [proofHash as `0x${string}`],
        account: this.walletClient?.account,
      });

      return gas;
    } catch (error) {
      logger.error({ error }, "Failed to estimate gas");
      return 60000n; // Default estimate
    }
  }
}

// Export singleton instance
export const attestorClient = new AttestorClient(
  process.env.RPC_URL,
  process.env.ATTESTOR_ADDRESS,
  process.env.PRIVATE_KEY,
);
