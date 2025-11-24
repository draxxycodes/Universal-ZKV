#!/usr/bin/env node
/**
 * Refresh deployment proofs with new random selections
 * Run this before deploying to Vercel to get fresh proofs
 */

const fs = require("fs");
const path = require("path");

const CIRCUITS_DIR = path.join(__dirname, "..", "packages", "circuits");
const PROOFS_DIR = path.join(CIRCUITS_DIR, "proofs");
const DEPLOY_DIR = path.join(PROOFS_DIR, "deployment");
const PUBLIC_DIR = path.join(__dirname, "..", "apps", "web", "public", "proofs");

console.log("=== Refreshing Deployment Proofs ===\n");

const circuits = ["poseidon_test", "eddsa_verify", "merkle_proof"];

// Select a random valid proof file for each circuit
function getRandomProofFiles(circuit) {
  const validDir = path.join(PROOFS_DIR, circuit, "valid");

  if (!fs.existsSync(validDir)) {
    console.log(`   ⚠️  No valid directory found for ${circuit}`);
    return null;
  }

  const files = fs.readdirSync(validDir);
  const proofFiles = files.filter(
    (f) => f.endsWith("_proof.json") && !f.includes("invalid"),
  );

  if (proofFiles.length === 0) {
    console.log(`   ⚠️  No proof files found for ${circuit}`);
    return null;
  }

  // Pick random proof file
  const randomIndex = Math.floor(Math.random() * proofFiles.length);
  const proofFile = proofFiles[randomIndex];

  // Extract the base name (e.g., "poseidon_test_123")
  const baseName = proofFile.replace("_proof.json", "");

  return {
    proof: path.join(validDir, `${baseName}_proof.json`),
    public: path.join(validDir, `${baseName}_public.json`),
    witness: path.join(validDir, `${baseName}_witness.json`),
    baseName,
  };
}

// Copy files to deployment and public directories
function copyProofFiles(circuit, files, proofType) {
  const circuitName = circuit.split("_")[0]; // e.g., "eddsa", "merkle", "poseidon"
  
  const deployProof = path.join(DEPLOY_DIR, `${circuit}_${proofType}_proof.json`);
  const deployPublic = path.join(DEPLOY_DIR, `${circuit}_${proofType}_public.json`);
  
  const publicProof = path.join(PUBLIC_DIR, `${circuit}_${proofType}_proof.json`);
  const publicPublic = path.join(PUBLIC_DIR, `${circuit}_${proofType}_public.json`);
  
  // Copy to deployment directory
  if (fs.existsSync(files.proof)) {
    fs.copyFileSync(files.proof, deployProof);
    console.log(`   ✅ Copied to deployment: ${circuit}_${proofType}_proof.json`);
  }
  
  if (fs.existsSync(files.public)) {
    fs.copyFileSync(files.public, deployPublic);
  }
  
  // Copy to public directory (for Vercel)
  if (fs.existsSync(files.proof)) {
    fs.copyFileSync(files.proof, publicProof);
    console.log(`   ✅ Copied to public: ${circuit}_${proofType}_proof.json`);
  }
  
  if (fs.existsSync(files.public)) {
    fs.copyFileSync(files.public, publicPublic);
  }
}

// Ensure directories exist
if (!fs.existsSync(DEPLOY_DIR)) {
  fs.mkdirSync(DEPLOY_DIR, { recursive: true });
}
if (!fs.existsSync(PUBLIC_DIR)) {
  fs.mkdirSync(PUBLIC_DIR, { recursive: true });
}

// Copy Groth16 proofs (random selection from corpus)
console.log("📦 Refreshing Groth16 Proofs:");
console.log("─".repeat(50));

for (const circuit of circuits) {
  console.log(`\n🔄 ${circuit}:`);
  
  const proofFiles = getRandomProofFiles(circuit);
  if (!proofFiles) {
    console.log(`   ⚠️  Skipping ${circuit}`);
    continue;
  }
  
  console.log(`   📄 Selected: ${proofFiles.baseName}`);
  copyProofFiles(circuit, proofFiles, "groth16");
}

// Copy PLONK proofs (same random selection)
console.log("\n\n📦 Refreshing PLONK Proofs:");
console.log("─".repeat(50));

for (const circuit of circuits) {
  console.log(`\n🔄 ${circuit}:`);
  
  const proofFiles = getRandomProofFiles(circuit);
  if (!proofFiles) {
    console.log(`   ⚠️  Skipping ${circuit}`);
    continue;
  }
  
  console.log(`   📄 Selected: ${proofFiles.baseName}`);
  copyProofFiles(circuit, proofFiles, "plonk");
}

// Copy STARK proofs (they should already exist)
console.log("\n\n📦 STARK Proofs:");
console.log("─".repeat(50));
console.log("(STARK proofs remain unchanged - using existing .ub files)");

for (const circuit of circuits) {
  const deployStark = path.join(DEPLOY_DIR, `${circuit}_stark_proof.ub`);
  const publicStark = path.join(PUBLIC_DIR, `${circuit}_stark_proof.ub`);
  
  if (fs.existsSync(deployStark) && !fs.existsSync(publicStark)) {
    fs.copyFileSync(deployStark, publicStark);
    console.log(`✅ Copied ${circuit}_stark_proof.ub to public`);
  }
}

console.log("\n\n=== Summary ===");
console.log("─".repeat(50));
console.log("✅ Deployment proofs refreshed with new random selections");
console.log("✅ Public proofs updated for Vercel deployment");
console.log("\n💡 Next steps:");
console.log("   1. git add apps/web/public/proofs");
console.log("   2. git commit -m 'chore: refresh deployment proofs'");
console.log("   3. git push (triggers Vercel deployment with new proofs)");
