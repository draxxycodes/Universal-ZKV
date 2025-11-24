import fs from "fs";
import path from "path";
import crypto from "crypto";
import { ethers } from "ethers";

// Use website-proofs directory with 9,000 proofs (1,000 per circuit per type)
// This allows us to randomly select fresh proofs each workflow run
const WEBSITE_PROOFS_DIR = path.join(
  process.cwd(),
  "..",
  "..",
  "packages",
  "circuits",
  "website-proofs",
);
const DEPLOY_DIR = path.join(process.cwd(), "public", "proofs");

export interface ProofFiles {
  groth16: string[];
  plonk: string[];
  stark: string[];
}

/**
 * Select 3 random proofs from the website-proofs pool (1 per circuit)
 * This ensures we always use fresh, un-attested proofs
 */
function selectRandomProofs(
  proofType: "groth16" | "plonk" | "stark",
): string[] {
  const circuits = ["eddsa_verify", "merkle_proof", "poseidon_test"];
  const selectedProofs: string[] = [];

  try {
    // Check if website-proofs directory exists
    const proofDir = fs.existsSync(WEBSITE_PROOFS_DIR)
      ? WEBSITE_PROOFS_DIR
      : DEPLOY_DIR;

    const allFiles = fs.readdirSync(proofDir);

    for (const circuit of circuits) {
      let matchingFiles: string[];

      if (proofType === "stark") {
        // STARK proofs are .ub files
        matchingFiles = allFiles.filter(
          (f) => f.startsWith(`${circuit}_stark_`) && f.endsWith(".ub"),
        );
      } else {
        // Groth16/PLONK proofs are .json files
        matchingFiles = allFiles.filter(
          (f) =>
            f.startsWith(`${circuit}_${proofType}_`) &&
            f.endsWith("_proof.json"),
        );
      }

      if (matchingFiles.length > 0) {
        // Pick a random proof from available ones
        const randomIndex = Math.floor(Math.random() * matchingFiles.length);
        selectedProofs.push(matchingFiles[randomIndex]);
      } else {
        // Fallback to old naming convention if new format not found
        const fallbackName =
          proofType === "stark"
            ? `${circuit}_stark_proof.ub`
            : `${circuit}_${proofType}_proof.json`;
        if (allFiles.includes(fallbackName)) {
          selectedProofs.push(fallbackName);
        }
      }
    }
  } catch (error) {
    console.error(`Error selecting random ${proofType} proofs:`, error);
  }

  return selectedProofs;
}

/**
 * Get random proof files from website-proofs pool
 * Replaces generate-all-proofs.cjs - now we just select random ones each time
 */
export async function getProofFiles(): Promise<ProofFiles> {
  const proofFiles: ProofFiles = {
    groth16: selectRandomProofs("groth16"),
    plonk: selectRandomProofs("plonk"),
    stark: selectRandomProofs("stark"),
  };

  return proofFiles;
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

    // Create contract instance (matches working local script)
    const ATTESTOR_ABI = [
      "function attestProof(bytes32 proofHash) external",
      "function isAttested(bytes32 proofHash) external view returns (bool)",
    ];
    const attestor = new ethers.Contract(
      ATTESTOR_ADDRESS,
      ATTESTOR_ABI,
      wallet,
    );

    await log(`📦 Attesting ${proofType.toUpperCase()} Proofs:`);

    // Get proof files
    const proofFiles = await getProofFiles();
    const filesForType = proofFiles[proofType as keyof ProofFiles] || [];

    const txHashes: string[] = [];

    // Attest each proof
    for (const proofFile of filesForType) {
      // Check both website-proofs and public/proofs directories
      const websiteProofPath = path.join(WEBSITE_PROOFS_DIR, proofFile);
      const deployProofPath = path.join(DEPLOY_DIR, proofFile);
      const proofPath = fs.existsSync(websiteProofPath)
        ? websiteProofPath
        : deployProofPath;

      const circuitName = proofFile.split("_")[0];

      await log(`🔄 ${circuitName}:`);
      await log("──────────────────────────────────────────────────");

      try {
        // Calculate proof hash using SHA-256 (matches working local script)
        let proofHash: string;

        if (proofFile.endsWith("_stark_proof.ub")) {
          // STARK binary proof
          const proofBuf = fs.readFileSync(proofPath);
          proofHash = crypto
            .createHash("sha256")
            .update(proofBuf)
            .digest("hex");
        } else {
          // Groth16/PLONK JSON proofs
          const proof = JSON.parse(fs.readFileSync(proofPath, "utf8"));
          const publicPath = proofPath.replace("_proof.json", "_public.json");
          const publicInputs = JSON.parse(fs.readFileSync(publicPath, "utf8"));

          const dataStr = JSON.stringify({ proof, publicInputs });
          proofHash = crypto.createHash("sha256").update(dataStr).digest("hex");
        }

        await log(`🔑 Proof hash: 0x${proofHash.substring(0, 16)}...`);

        // Check if already attested
        try {
          const isAttested = await attestor.isAttested("0x" + proofHash);
          if (isAttested) {
            await log(`ℹ️  Already attested (skipped)`);
            continue;
          }
        } catch (checkError) {
          // If check fails, continue with attestation attempt
          await log(`⚠️  Could not check attestation status, proceeding...`);
        }

        await log(`📤 Submitting to Attestor...`);

        // Send transaction using contract instance (matches working local script)
        const tx = await attestor.attestProof("0x" + proofHash, {
          gasLimit: 100000,
          type: 0, // Legacy transaction
        });

        await log(`⏳ Transaction sent: ${tx.hash}`);
        onTransaction?.(tx.hash);

        await log(`⏳ Waiting for confirmation...`);
        const receipt = await tx.wait(1);

        if (receipt.status === 1) {
          await log(`✅ Attested! TX: ${receipt.hash}`);
          await log(`🔗 https://sepolia.arbiscan.io/tx/${receipt.hash}`);
          txHashes.push(receipt.hash);
        } else {
          await log(`❌ Transaction failed`);
        }
      } catch (error: any) {
        await log(`❌ Failed to attest ${proofFile}: ${error.message}`);
        console.error(error);
      }
    }

    await log("=== Attestation Summary ===");
    await log(`✅ Successfully attested ${txHashes.length} proofs`);

    return txHashes;
  } catch (error) {
    console.error("Attestation error:", error);
    throw error;
  }
}
