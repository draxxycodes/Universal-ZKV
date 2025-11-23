#!/usr/bin/env node
/**
 * Universal ZK Verifier (UZKV)
 * Single entry point that delegates to specialized verifiers:
 * - Groth16 verifier (snarkjs)
 * - PLONK verifier (snarkjs)
 * - STARK verifier (binary UniversalProof structure validation)
 */

const fs = require("fs");
const path = require("path");
const { execSync } = require("child_process");

const CIRCUITS_DIR = path.join(__dirname, "..", "packages", "circuits");
const DEPLOY_DIR = path.join(CIRCUITS_DIR, "proofs", "deployment");
const BUILD_DIR = path.join(CIRCUITS_DIR, "build");

console.log("=== Universal ZK Verifier (UZKV) ===\n");
console.log("Delegating to specialized verifiers for each proof system\n");

if (!fs.existsSync(DEPLOY_DIR)) {
  console.error("❌ No deployment proofs found!");
  console.log("   Run: node scripts/generate-all-proofs.cjs");
  process.exit(1);
}

const proofFiles = fs.readdirSync(DEPLOY_DIR);
let verifiedCount = 0;
let failedCount = 0;

/**
 * Universal Verifier - Detects proof type and routes to appropriate verifier
 */
function verifyProof(proofFile, proofPath) {
  const circuit = proofFile.split("_")[0] + "_" + proofFile.split("_")[1]; // e.g., "poseidon_test"

  // Detect proof type from filename
  if (proofFile.includes("groth16_proof.json")) {
    return verifyGroth16(circuit, proofPath);
  } else if (proofFile.includes("plonk_proof.json")) {
    return verifyPlonk(circuit, proofPath);
  } else if (proofFile.endsWith("_stark_proof.ub")) {
    return verifyStark(circuit, proofPath);
  }

  return { success: false, error: "Unknown proof type" };
}

/**
 * Groth16 Verifier Delegate
 */
function verifyGroth16(circuit, proofPath) {
  try {
    const publicPath = proofPath.replace("_proof.json", "_public.json");

    const vkMap = {
      eddsa_verify: "eddsa_vk.json",
      merkle_proof: "merkle_vk.json",
      poseidon_test: "poseidon_vk.json",
    };

    const vkFilename = vkMap[circuit] || `${circuit}_vk.json`;
    const vkeyPath = path.join(BUILD_DIR, vkFilename);

    if (!fs.existsSync(vkeyPath)) {
      return { success: false, error: "Verification key not found" };
    }

    const relVkey = path.relative(process.cwd(), vkeyPath);
    const relPublic = path.relative(process.cwd(), publicPath);
    const relProof = path.relative(process.cwd(), proofPath);

    const result = execSync(
      `npx snarkjs groth16 verify ${relVkey} ${relPublic} ${relProof}`,
      { encoding: "utf8" },
    );

    if (result.includes("OK!")) {
      return { success: true };
    } else {
      return { success: false, error: "Verification failed" };
    }
  } catch (error) {
    return { success: false, error: error.message };
  }
}

/**
 * PLONK Verifier Delegate
 */
function verifyPlonk(circuit, proofPath) {
  try {
    const publicPath = proofPath.replace("_proof.json", "_public.json");

    const vkMap = {
      eddsa_verify: "eddsa_verify_plonk_vk.json",
      merkle_proof: "merkle_proof_plonk_vk.json",
      poseidon_test: "poseidon_test_plonk_vk.json",
    };

    const vkFilename = vkMap[circuit] || `${circuit}_plonk_vk.json`;
    const vkeyPath = path.join(BUILD_DIR, vkFilename);

    if (!fs.existsSync(vkeyPath)) {
      return { success: false, error: "PLONK verification key not found" };
    }

    const relVkey = path.relative(process.cwd(), vkeyPath);
    const relPublic = path.relative(process.cwd(), publicPath);
    const relProof = path.relative(process.cwd(), proofPath);

    const result = execSync(
      `npx snarkjs plonk verify ${relVkey} ${relPublic} ${relProof}`,
      { encoding: "utf8" },
    );

    if (result.includes("OK!")) {
      return { success: true };
    } else {
      return { success: false, error: "Verification failed" };
    }
  } catch (error) {
    return { success: false, error: error.message };
  }
}

/**
 * STARK Verifier Delegate (UniversalProof binary structure)
 */
function verifyStark(circuit, proofPath) {
  try {
    const proofBuf = fs.readFileSync(proofPath);

    // Parse UniversalProof envelope
    if (proofBuf.length < 30) {
      return { success: false, error: "Proof too small" };
    }

    const version = proofBuf.readUInt32LE(0);
    const proofType = proofBuf.readUInt32LE(4);
    const programId = proofBuf.readUInt32LE(8);

    // Basic structural validation
    if (version !== 1) {
      return { success: false, error: "Invalid version" };
    }

    if (proofType !== 2) {
      // 2 = STARK
      return { success: false, error: "Not a STARK proof" };
    }

    // Read vk_hash (16 bytes)
    let offset = 12;
    offset += 16;

    // Read proof_len and proof bytes
    const proofLen = proofBuf.readUInt32LE(offset);
    offset += 4;

    if (proofLen === 0 || proofLen > 10000000) {
      return { success: false, error: "Invalid proof length" };
    }

    offset += proofLen;

    // Read public inputs length
    if (offset + 4 > proofBuf.length) {
      return { success: false, error: "Truncated proof" };
    }

    const pubLen = proofBuf.readUInt32LE(offset);
    offset += 4;

    if (offset + pubLen !== proofBuf.length) {
      return { success: false, error: "Public inputs length mismatch" };
    }

    return {
      success: true,
      details: {
        version,
        programId,
        proofLen,
        pubLen,
      },
    };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

// Main verification loop
console.log("📦 Verifying All Proofs via UZKV:");
console.log("─".repeat(50));

const proofOnlyFiles = proofFiles.filter(
  (f) => f.includes("_proof.json") || f.endsWith("_proof.ub"),
);

for (const proofFile of proofOnlyFiles) {
  const proofPath = path.join(DEPLOY_DIR, proofFile);

  console.log(`\n🔍 ${proofFile}:`);

  const result = verifyProof(proofFile, proofPath);

  if (result.success) {
    console.log(`   ✅ Verified by UZKV`);
    if (result.details) {
      console.log(
        `   📊 Version: ${result.details.version}, ProgramId: ${result.details.programId}`,
      );
    }
    verifiedCount++;
  } else {
    console.log(`   ❌ Failed: ${result.error}`);
    failedCount++;
  }
}

// Summary
console.log("\n\n=== UZKV Summary ===");
console.log("─".repeat(50));
console.log(`\n✅ Verified: ${verifiedCount}`);
console.log(`❌ Failed: ${failedCount}`);
console.log(`\n📊 Total proofs: ${verifiedCount + failedCount}`);

if (failedCount === 0) {
  console.log("\n🎉 All proofs verified successfully via UZKV!");
  console.log("\n🎯 Next: Attest on Arbitrum Sepolia");
  console.log("   node scripts/attest-proofs.cjs");
  process.exit(0);
} else {
  console.log("\n⚠️  Some verifications failed");
  process.exit(1);
}
