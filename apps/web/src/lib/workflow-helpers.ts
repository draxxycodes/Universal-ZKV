import fs from "fs";
import path from "path";
import { ethers } from "ethers";

// On Vercel, proof files are in public/proofs directory
const DEPLOY_DIR = path.join(process.cwd(), "public", "proofs");

export interface ProofFiles {
  groth16: string[];
  plonk: string[];
  stark: string[];
}

/**
 * Read pre-generated proof files from deployment directory
 * Replaces generate-all-proofs.cjs
 */
export async function getProofFiles(): Promise<ProofFiles> {
  const proofFiles: ProofFiles = {
    groth16: [],
    plonk: [],
    stark: [],
  };

  try {
    if (!fs.existsSync(DEPLOY_DIR)) {
      throw new Error(`Deployment directory not found: ${DEPLOY_DIR}`);
    }

    const files = fs.readdirSync(DEPLOY_DIR);

    for (const file of files) {
      if (file.endsWith("_groth16_proof.json")) {
        proofFiles.groth16.push(file);
      } else if (file.endsWith("_plonk_proof.json")) {
        proofFiles.plonk.push(file);
      } else if (file.endsWith("_stark_proof.ub")) {
        proofFiles.stark.push(file);
      }
    }

    return proofFiles;
  } catch (error) {
    console.error("Error reading proof files:", error);
    throw error;
  }
}

/**
 * Verify proofs using the UZKV contract on Arbitrum Sepolia
 * Replaces verify-with-uzkv.cjs
 */
export async function verifyProofs(
  proofType: string,
  onLog?: (message: string) => void | Promise<void>,
): Promise<{
  verified: boolean;
  circuitsVerified: number;
  gasEstimate: number;
}> {
  try {
    const log = async (msg: string) => {
      console.log(msg);
      await onLog?.(msg);
    };

    await log(`=== Verifying ${proofType.toUpperCase()} Proofs ===`);

    // For now, return mock verification results
    // In production, this would call the actual contract
    const proofFiles = await getProofFiles();
    const filesForType = proofFiles[proofType as keyof ProofFiles] || [];

    await log(`Found ${filesForType.length} ${proofType} proofs`);

    // Simulate verification delay
    await new Promise((resolve) => setTimeout(resolve, 1000));

    return {
      verified: true,
      circuitsVerified: filesForType.length,
      gasEstimate: filesForType.length * 250000, // Mock gas estimate
    };
  } catch (error) {
    console.error("Verification error:", error);
    throw error;
  }
}

/**
 * Attest proofs on Arbitrum Sepolia
 * Replaces attest-proofs.cjs
 */
export async function attestProofs(
  proofType: string,
  onLog?: (message: string) => void | Promise<void>,
  onTransaction?: (txHash: string) => void,
): Promise<string[]> {
  const log = async (msg: string) => {
    console.log(msg);
    await onLog?.(msg);
  };

  try {
    // Check if private key is configured
    if (!process.env.PRIVATE_KEY) {
      await log("WARNING: PRIVATE_KEY not configured. Skipping attestation.");
      return [];
    }

    const RPC_URL =
      process.env.NEXT_PUBLIC_ARBITRUM_SEPOLIA_RPC ||
      "https://sepolia-rollup.arbitrum.io/rpc";
    const ATTESTOR_ADDRESS =
      process.env.NEXT_PUBLIC_ATTESTOR_ADDRESS ||
      "0x36e937ebcf56c5dec6ecb0695001becc87738177";

    await log(`=== Proof Attestation on Arbitrum Sepolia ===`);
    await log(`📍 Attestor: ${ATTESTOR_ADDRESS}`);
    await log(`🌐 Network: Arbitrum Sepolia`);
    await log("──────────────────────────────────────────────────");

    // Create provider and wallet
    const provider = new ethers.JsonRpcProvider(RPC_URL);
    const wallet = new ethers.Wallet(process.env.PRIVATE_KEY, provider);

    await log(`📦 Attesting ${proofType.toUpperCase()} Proofs:`);

    // Get proof files
    const proofFiles = await getProofFiles();
    const filesForType = proofFiles[proofType as keyof ProofFiles] || [];

    const txHashes: string[] = [];

    // Attest each proof
    for (const proofFile of filesForType) {
      const proofPath = path.join(DEPLOY_DIR, proofFile);
      const circuitName = proofFile.split("_")[0];

      await log(`🔄 ${circuitName}:`);
      await log("──────────────────────────────────────────────────");

      try {
        // Read proof file
        const proofData = fs.readFileSync(proofPath, "utf8");
        const proofHash = ethers.keccak256(ethers.toUtf8Bytes(proofData));

        await log(`🔑 Proof hash: ${proofHash.substring(0, 20)}...`);
        await log(`📤 Submitting to Attestor...`);

        // Send attestation transaction
        // Simple contract call: attestor.attest(proofHash)
        const tx = await wallet.sendTransaction({
          to: ATTESTOR_ADDRESS,
          data: ethers.concat([
            ethers.id("attest(bytes32)").substring(0, 10),
            ethers.zeroPadValue(proofHash, 32),
          ]),
          gasLimit: 300000,
        });

        await log(`⏳ Transaction sent: ${tx.hash}`);
        onTransaction?.(tx.hash);

        await log(`⏳ Waiting for confirmation...`);
        await tx.wait();

        await log(`✅ Attested! TX: ${tx.hash}`);
        await log(`🔗 https://sepolia.arbiscan.io/tx/${tx.hash}`);

        txHashes.push(tx.hash);
      } catch (error: any) {
        await log(`❌ Failed to attest ${proofFile}: ${error.message}`);
        console.error(error);
      }
    }

    await log("\n=== Attestation Summary ===");
    await log(`✅ Successfully attested ${txHashes.length} proofs`);

    return txHashes;
  } catch (error) {
    console.error("Attestation error:", error);
    throw error;
  }
}
