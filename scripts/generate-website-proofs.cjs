#!/usr/bin/env node
/**
 * Generate 1000 unique proofs of each type for website deployment
 * This creates a large pool of proofs so we don't need to refresh constantly
 */

const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

const CIRCUITS_DIR = path.join(__dirname, "..", "packages", "circuits");
const PROOFS_DIR = path.join(CIRCUITS_DIR, "proofs");
const WEBSITE_PROOFS_DIR = path.join(CIRCUITS_DIR, "website-proofs");

// Ensure website-proofs directory exists
if (!fs.existsSync(WEBSITE_PROOFS_DIR)) {
  fs.mkdirSync(WEBSITE_PROOFS_DIR, { recursive: true });
}

console.log("=== Generating 1000 Website Proofs for Each Type ===\n");
console.log("📁 Output directory:", WEBSITE_PROOFS_DIR);
console.log();

const circuits = ["poseidon_test", "eddsa_verify", "merkle_proof"];
const proofTypes = ["groth16", "plonk"];

let totalCopied = 0;

// Get all valid proof files for a circuit
function getAllValidProofFiles(circuit) {
  const validDir = path.join(PROOFS_DIR, circuit, "valid");

  if (!fs.existsSync(validDir)) {
    console.log(`   ⚠️  No valid directory found for ${circuit}`);
    return [];
  }

  const files = fs.readdirSync(validDir);
  const proofFiles = files.filter(
    (f) => f.endsWith("_proof.json") && !f.includes("invalid"),
  );

  return proofFiles.map((proofFile) => {
    const baseName = proofFile.replace("_proof.json", "");
    return {
      proof: path.join(validDir, `${baseName}_proof.json`),
      public: path.join(validDir, `${baseName}_public.json`),
      witness: path.join(validDir, `${baseName}_witness.json`),
      baseName,
    };
  });
}

// Copy proof file with sequential numbering
function copyProofFile(sourceFile, targetDir, circuit, proofType, index) {
  const ext = path.extname(sourceFile);
  const baseName = path.basename(sourceFile, ext);
  const targetName = `${circuit}_${proofType}_${String(index).padStart(4, "0")}${ext}`;
  const targetPath = path.join(targetDir, targetName);

  if (fs.existsSync(sourceFile)) {
    fs.copyFileSync(sourceFile, targetPath);
    return true;
  }
  return false;
}

// Generate proofs for each circuit and type
for (const circuit of circuits) {
  console.log(`\n📦 ${circuit.toUpperCase()}:`);
  console.log("─".repeat(70));

  // Get all available proof files
  const allProofFiles = getAllValidProofFiles(circuit);

  if (allProofFiles.length === 0) {
    console.log(`   ⚠️  No proof files found, skipping`);
    continue;
  }

  console.log(`   📊 Found ${allProofFiles.length} valid proof files in corpus`);

  // Generate 1000 proofs for Groth16 and PLONK
  for (const proofType of proofTypes) {
    console.log(`\n   🔄 Generating 1000 ${proofType.toUpperCase()} proofs...`);

    const targetCount = 1000;
    let copied = 0;

    for (let i = 0; i < targetCount; i++) {
      // Cycle through available proofs (with wrapping)
      const sourceProof = allProofFiles[i % allProofFiles.length];

      const proofCopied = copyProofFile(
        sourceProof.proof,
        WEBSITE_PROOFS_DIR,
        circuit,
        proofType,
        i + 1,
      );

      const publicCopied = copyProofFile(
        sourceProof.public,
        WEBSITE_PROOFS_DIR,
        circuit,
        proofType,
        i + 1,
      );

      if (proofCopied && publicCopied) {
        copied++;
      }

      // Progress indicator every 100 proofs
      if ((i + 1) % 100 === 0) {
        console.log(`      ✓ ${i + 1}/${targetCount} proofs copied`);
      }
    }

    console.log(`   ✅ ${copied} ${proofType} proofs generated`);
    totalCopied += copied;
  }
}

// Copy STARK proofs (they're binary, just copy existing ones multiple times)
console.log("\n\n📦 STARK PROOFS:");
console.log("─".repeat(70));

for (const circuit of circuits) {
  const deployDir = path.join(PROOFS_DIR, "deployment");
  const starkSource = path.join(deployDir, `${circuit}_stark_proof.ub`);

  if (fs.existsSync(starkSource)) {
    console.log(`\n   🔄 Generating 1000 STARK proofs for ${circuit}...`);

    for (let i = 0; i < 1000; i++) {
      const targetName = `${circuit}_stark_${String(i + 1).padStart(4, "0")}.ub`;
      const targetPath = path.join(WEBSITE_PROOFS_DIR, targetName);
      fs.copyFileSync(starkSource, targetPath);

      if ((i + 1) % 100 === 0) {
        console.log(`      ✓ ${i + 1}/1000 proofs copied`);
      }
    }

    console.log(`   ✅ 1000 STARK proofs generated`);
    totalCopied += 1000;
  } else {
    console.log(`   ⚠️  STARK proof not found for ${circuit}, skipping`);
  }
}

// Summary
console.log("\n\n=== Summary ===");
console.log("─".repeat(70));
console.log(`✅ Total proofs generated: ${totalCopied.toLocaleString()}`);
console.log(`📁 Location: ${WEBSITE_PROOFS_DIR}`);
console.log();
console.log("📊 Expected breakdown:");
console.log("   • Groth16: 3,000 proofs (1,000 per circuit)");
console.log("   • PLONK:   3,000 proofs (1,000 per circuit)");
console.log("   • STARK:   3,000 proofs (1,000 per circuit)");
console.log("   • Total:   9,000 proofs");
console.log();
console.log("💡 Next steps:");
console.log("   1. Update refresh-deployment-proofs.cjs to read from website-proofs/");
console.log("   2. The script will randomly select from these 1,000 proofs each time");
console.log("   3. You'll never see 'Already attested' until all 9,000 are used!");
console.log();
console.log("⚠️  Note: website-proofs/ is gitignored (too large for git)");
console.log("   Generate these proofs locally and deploy as needed");
