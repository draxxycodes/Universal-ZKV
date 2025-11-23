#!/usr/bin/env node
/**
 * Attest proofs on Arbitrum Sepolia
 * Supports Groth16, PLONK, and STARK proofs
 */

const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const { execSync } = require("child_process");
const { ethers } = require("ethers");

// Load .env.sepolia
require("dotenv").config({ path: path.join(__dirname, "..", ".env.sepolia") });

const CIRCUITS_DIR = path.join(__dirname, "..", "packages", "circuits");
const DEPLOY_DIR = path.join(CIRCUITS_DIR, "proofs", "deployment");
const ATTESTATIONS_DIR = path.join(CIRCUITS_DIR, "attestations");

// Ensure attestations directory exists
if (!fs.existsSync(ATTESTATIONS_DIR)) {
  fs.mkdirSync(ATTESTATIONS_DIR, { recursive: true });
}

// Configuration
const ATTESTOR_ADDRESS =
  process.env.ATTESTOR_CONTRACT || "0x36e937ebcf56c5dec6ecb0695001becc87738177";

// Multiple RPC endpoints for fallback (ordered by reliability)
// Note: If all fail, you may need to use Alchemy/Infura with API key
const RPC_ENDPOINTS = [
  "https://sepolia-rollup.arbitrum.io/rpc",
  "https://arbitrum-sepolia.publicnode.com",
  "https://arbitrum-sepolia.blockpi.network/v1/rpc/public",
  "https://public.stackup.sh/api/v1/node/arbitrum-sepolia",
];

let currentRpcIndex = 0;
let RPC_URL = RPC_ENDPOINTS[currentRpcIndex];

const PRIVATE_KEY = process.env.PRIVATE_KEY;
const DRY_RUN = process.env.DRY_RUN === "true";

if (!PRIVATE_KEY && !DRY_RUN) {
  console.error("❌ PRIVATE_KEY not found in .env.sepolia");
  console.log("💡 Tip: Use DRY_RUN=true for testing without blockchain connection");
  process.exit(1);
}

// Retry configuration
const MAX_RETRIES = 3;
const INITIAL_RETRY_DELAY = 3000; // 3 seconds
const TX_TIMEOUT = 60000; // 60 seconds for transaction

// Attestor contract ABI (only attestProof function)
const ATTESTOR_ABI = [
  "function attestProof(bytes32 proofHash) external",
  "function isAttested(bytes32 proofHash) external view returns (bool)",
];

console.log("=== Proof Attestation on Arbitrum Sepolia ===\n");
if (DRY_RUN) {
  console.log("🧪 DRY RUN MODE - No actual transactions will be sent\n");
}
console.log(`📍 Attestor: ${ATTESTOR_ADDRESS}`);
console.log(`🌐 Network: Arbitrum Sepolia`);
console.log(`🔗 RPC: ${RPC_URL}`);
console.log("─".repeat(50));

if (!fs.existsSync(DEPLOY_DIR)) {
  console.error("\n❌ No deployment proofs found!");
  console.log("   Run: node scripts/generate-all-proofs.cjs");
  process.exit(1);
}

const proofFiles = fs.readdirSync(DEPLOY_DIR);
const attestations = [];
let successCount = 0;
let failedCount = 0;

// Helper: Calculate proof hash
function calculateProofHash(proofData) {
  const dataStr = JSON.stringify(proofData);
  return crypto.createHash("sha256").update(dataStr).digest("hex");
}

// Helper: Calculate hash for binary buffer (STARK proofs)
function calculateBufferHash(buf) {
  return crypto.createHash("sha256").update(buf).digest("hex");
}

// Helper: Sleep function
function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// Helper: Try next RPC endpoint
function switchToNextRpc() {
  currentRpcIndex = (currentRpcIndex + 1) % RPC_ENDPOINTS.length;
  RPC_URL = RPC_ENDPOINTS[currentRpcIndex];
  console.log(`   🔄 Switching to RPC: ${RPC_URL}`);
}

// Helper: Create provider with timeout and retry settings
function createProvider(rpcUrl) {
  const fetchRequest = new ethers.FetchRequest(rpcUrl);
  fetchRequest.timeout = TX_TIMEOUT;
  fetchRequest.retryCount = 2;
  
  // Use staticNetwork to skip network detection (faster, more reliable)
  const network = ethers.Network.from({
    chainId: 421614,
    name: "arbitrum-sepolia",
  });
  
  const provider = new ethers.JsonRpcProvider(
    fetchRequest,
    network,
    { staticNetwork: network }
  );
  
  return provider;
}

// Helper: Validate RPC connection
async function validateConnection(provider) {
  try {
    const blockNumber = await Promise.race([
      provider.getBlockNumber(),
      new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Connection timeout')), 10000)
      )
    ]);
    return blockNumber > 0;
  } catch (error) {
    console.log(`   🔍 Connection check failed: ${error.message}`);
    return false;
  }
}

// Helper: Attest proof on-chain with retry logic using ethers.js
async function attestProof(proofHash, circuit, proofType) {
  // Dry run mode - simulate success
  if (DRY_RUN) {
    console.log(`   🧪 [DRY RUN] Would attest proof hash: 0x${proofHash}`);
    await sleep(500); // Small delay for realism
    const fakeTxHash = "0x" + crypto.randomBytes(32).toString("hex");
    console.log(`   ✅ [DRY RUN] Simulated TX: ${fakeTxHash}`);
    console.log(`   🔗 https://sepolia.arbiscan.io/tx/${fakeTxHash}`);
    return { success: true, txHash: fakeTxHash, dryRun: true };
  }
  
  let lastError = null;
  
  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      if (attempt > 1) {
        console.log(`   🔄 Retry attempt ${attempt}/${MAX_RETRIES}...`);
      } else {
        console.log(`   📤 Submitting to Attestor...`);
      }

      // Create provider and wallet
      const provider = createProvider(RPC_URL);
      
      // Validate connection first
      const isConnected = await validateConnection(provider);
      if (!isConnected) {
        throw new Error('RPC connection failed');
      }
      
      const wallet = new ethers.Wallet(PRIVATE_KEY, provider);
      
      // Create contract instance
      const attestor = new ethers.Contract(ATTESTOR_ADDRESS, ATTESTOR_ABI, wallet);
      
      // Check if already attested
      try {
        const isAttested = await attestor.isAttested("0x" + proofHash);
        if (isAttested) {
          console.log(`   ℹ️  Already attested (skipped)`);
          return { success: true, txHash: "already-attested", skipped: true };
        }
      } catch (checkError) {
        // If check fails, continue with attestation attempt
        console.log(`   ⚠️  Could not check attestation status, proceeding...`);
      }
      
      // Send transaction
      const tx = await attestor.attestProof("0x" + proofHash, {
        gasLimit: 100000,
        type: 0, // Legacy transaction
      });
      
      console.log(`   ⏳ Transaction sent: ${tx.hash}`);
      console.log(`   ⏳ Waiting for confirmation...`);
      
      // Wait for confirmation with timeout
      const receipt = await tx.wait(1);
      
      if (receipt.status === 1) {
        console.log(`   ✅ Attested! TX: ${receipt.hash}`);
        console.log(`   🔗 https://sepolia.arbiscan.io/tx/${receipt.hash}`);
        return { success: true, txHash: receipt.hash };
      } else {
        throw new Error("Transaction failed");
      }
      
    } catch (error) {
      lastError = error;
      
      // Check if proof is already attested
      if (
        error.message.includes("already attested") ||
        error.message.includes("50726f6f6620616c7265616479206174746573746564")
      ) {
        console.log(`   ℹ️  Already attested (skipped)`);
        return { success: true, txHash: "already-attested", skipped: true };
      }

      // Log error details
      console.log(`   ⚠️  Error: ${error.message.split('\n')[0]}`);

      // If timeout or connection error, try different RPC or retry
      if (
        error.message.includes("timeout") ||
        error.message.includes("network") ||
        error.message.includes("connection") ||
        error.code === "TIMEOUT" ||
        error.code === "NETWORK_ERROR"
      ) {
        if (attempt < MAX_RETRIES) {
          // Try switching RPC endpoint
          switchToNextRpc();
          
          // Exponential backoff
          const delay = INITIAL_RETRY_DELAY * Math.pow(2, attempt - 1);
          console.log(`   ⏳ Waiting ${delay / 1000}s before retry...`);
          await sleep(delay);
        }
      } else {
        // Non-timeout error, don't retry
        break;
      }
    }
  }

  console.log(`   ❌ Attestation failed after ${MAX_RETRIES} attempts`);
  if (lastError) {
    const errorMsg = lastError.message.split('\n')[0];
    console.log(`   📋 Last error: ${errorMsg}`);
  }
  return { success: false, error: lastError?.message || "Unknown error" };
}

// Main async function
async function main() {
  // 1. Attest Groth16 proofs
  const groth16Proofs = proofFiles.filter((f) =>
    f.includes("groth16_proof.json"),
  );

  if (groth16Proofs.length > 0) {
  console.log("\n📦 Attesting Groth16 Proofs:");
  console.log("─".repeat(50));

  for (const proofFile of groth16Proofs) {
    const circuit = proofFile.replace("_groth16_proof.json", "");
    console.log(`\n🔄 ${circuit}:`);

    try {
      const proofPath = path.join(DEPLOY_DIR, proofFile);
      const publicPath = proofPath.replace("_proof.json", "_public.json");

      const proof = JSON.parse(fs.readFileSync(proofPath, "utf8"));
      const publicInputs = JSON.parse(fs.readFileSync(publicPath, "utf8"));

      const proofHash = calculateProofHash({ proof, publicInputs });
      console.log(`   🔑 Proof hash: 0x${proofHash.substring(0, 16)}...`);

      const result = await attestProof(proofHash, circuit, "groth16");

      if (result.success) {
        attestations.push({
          circuit,
          proofType: "groth16",
          proofHash: `0x${proofHash}`,
          txHash: result.txHash,
          timestamp: new Date().toISOString(),
        });
        successCount++;
      } else {
        failedCount++;
      }

      // Wait 2 seconds between transactions
      if (groth16Proofs.indexOf(proofFile) < groth16Proofs.length - 1) {
        await sleep(2000);
      }
    } catch (error) {
      console.log(`   ❌ Error: ${error.message}`);
      failedCount++;
    }
  }
  }

  // 2. Attest PLONK proofs
const plonkProofs = proofFiles.filter((f) => f.includes("plonk_proof.json"));

if (plonkProofs.length > 0) {
  console.log("\n\n📦 Attesting PLONK Proofs:");
  console.log("─".repeat(50));

  for (const proofFile of plonkProofs) {
    const circuit = proofFile.replace("_plonk_proof.json", "");
    console.log(`\n🔄 ${circuit}:`);

    try {
      const proofPath = path.join(DEPLOY_DIR, proofFile);
      const publicPath = proofPath.replace("_proof.json", "_public.json");

      const proof = JSON.parse(fs.readFileSync(proofPath, "utf8"));
      const publicInputs = JSON.parse(fs.readFileSync(publicPath, "utf8"));

      const proofHash = calculateProofHash({ proof, publicInputs });
      console.log(`   🔑 Proof hash: 0x${proofHash.substring(0, 16)}...`);

      const result = await attestProof(proofHash, circuit, "plonk");

      if (result.success) {
        attestations.push({
          circuit,
          proofType: "plonk",
          proofHash: `0x${proofHash}`,
          txHash: result.txHash,
          timestamp: new Date().toISOString(),
        });
        successCount++;
      } else {
        failedCount++;
      }

      // Wait 2 seconds between transactions
      if (plonkProofs.indexOf(proofFile) < plonkProofs.length - 1) {
        await sleep(2000);
      }
    } catch (error) {
      console.log(`   ❌ Error: ${error.message}`);
      failedCount++;
    }
  }
  }

  // 3. Attest STARK proofs
  const starkProofs = proofFiles.filter((f) => f.endsWith("_stark_proof.ub"));

  if (starkProofs.length > 0) {
  console.log("\n\n📦 Attesting STARK Proofs:");
  console.log("─".repeat(50));

  for (const proofFile of starkProofs) {
    const circuit = proofFile.replace("_stark_proof.ub", "");
    console.log(`\n🔄 ${circuit}:`);

    try {
      const proofPath = path.join(DEPLOY_DIR, proofFile);
      const proofBuf = fs.readFileSync(proofPath);

      const proofHash = calculateBufferHash(proofBuf);
      console.log(`   🔑 Proof hash: 0x${proofHash.substring(0, 16)}...`);

      const result = await attestProof(proofHash, circuit, "stark");

      if (result.success) {
        attestations.push({
          circuit,
          proofType: "stark",
          proofHash: `0x${proofHash}`,
          txHash: result.txHash,
          timestamp: new Date().toISOString(),
        });
        successCount++;
      } else {
        failedCount++;
      }

      // Wait 2 seconds between transactions
      if (starkProofs.indexOf(proofFile) < starkProofs.length - 1) {
        await sleep(2000);
      }
    } catch (error) {
      console.log(`   ❌ Error: ${error.message}`);
      failedCount++;
    }
  }
  }

  // Save attestation summary
const summaryPath = path.join(ATTESTATIONS_DIR, "attestation-summary.json");
fs.writeFileSync(
  summaryPath,
  JSON.stringify(
    {
      network: "Arbitrum Sepolia",
      attestor: ATTESTOR_ADDRESS,
      timestamp: new Date().toISOString(),
      attestations,
      summary: {
        total: successCount + failedCount,
        successful: successCount,
        failed: failedCount,
      },
    },
    null,
    2,
  ),
);

  // Summary
  console.log("\n\n=== Attestation Summary ===");
  console.log("─".repeat(50));
  console.log(`\n✅ Successful: ${successCount}`);
  console.log(`❌ Failed: ${failedCount}`);
  console.log(`\n📊 Total attestations: ${successCount + failedCount}`);
  console.log(`\n📁 Summary saved: ${summaryPath}`);

  if (successCount > 0) {
    console.log("\n🎉 Proofs attested on Arbitrum Sepolia!");
    console.log(
      `\n🔗 View Attestor: https://sepolia.arbiscan.io/address/${ATTESTOR_ADDRESS}`,
    );
  }

  process.exit(failedCount > 0 ? 1 : 0);
}

// Run main function
main().catch((error) => {
  console.error("\n❌ Fatal error:", error.message);
  process.exit(1);
});
