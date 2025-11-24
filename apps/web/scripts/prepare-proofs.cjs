#!/usr/bin/env node
/**
 * Vercel Build Script: Copy random proofs from website-proofs to public/proofs
 * This runs during Vercel build to make proofs available
 */

const fs = require("fs");
const path = require("path");

const WEBSITE_PROOFS_DIR = path.join(
  __dirname,
  "..",
  "..",
  "packages",
  "circuits",
  "website-proofs",
);
const PUBLIC_PROOFS_DIR = path.join(__dirname, "..", "public", "proofs");

console.log("=== Vercel Build: Preparing Proofs ===\n");

// Ensure public/proofs directory exists
if (!fs.existsSync(PUBLIC_PROOFS_DIR)) {
  fs.mkdirSync(PUBLIC_PROOFS_DIR, { recursive: true });
}

// Check if website-proofs exists (only available locally)
if (!fs.existsSync(WEBSITE_PROOFS_DIR)) {
  console.log("⚠️  website-proofs not found (using existing public/proofs)");
  console.log(
    "💡 This is normal on Vercel - website-proofs is gitignored and only exists locally\n",
  );
  process.exit(0);
}

console.log("✅ Found website-proofs directory locally");
console.log("🔄 Copying random proofs to public/proofs for deployment\n");

const circuits = ["eddsa_verify", "merkle_proof", "poseidon_test"];
const proofTypes = ["groth16", "plonk", "stark"];

let copiedCount = 0;

for (const circuit of circuits) {
  for (const proofType of proofTypes) {
    const allFiles = fs.readdirSync(WEBSITE_PROOFS_DIR);

    let matchingFiles;
    if (proofType === "stark") {
      matchingFiles = allFiles.filter(
        (f) => f.startsWith(`${circuit}_stark_`) && f.endsWith(".ub"),
      );
    } else {
      matchingFiles = allFiles.filter(
        (f) =>
          f.startsWith(`${circuit}_${proofType}_`) &&
          f.endsWith("_proof.json"),
      );
    }

    if (matchingFiles.length > 0) {
      // Pick random proof
      const randomIndex = Math.floor(Math.random() * matchingFiles.length);
      const selectedFile = matchingFiles[randomIndex];

      // Copy proof file
      const sourcePath = path.join(WEBSITE_PROOFS_DIR, selectedFile);
      const targetName =
        proofType === "stark"
          ? `${circuit}_stark_proof.ub`
          : `${circuit}_${proofType}_proof.json`;
      const targetPath = path.join(PUBLIC_PROOFS_DIR, targetName);

      fs.copyFileSync(sourcePath, targetPath);

      // Also copy public inputs file if it exists
      if (proofType !== "stark") {
        const publicFile = selectedFile.replace("_proof.json", "_public.json");
        const sourcePublicPath = path.join(WEBSITE_PROOFS_DIR, publicFile);
        const targetPublicName = `${circuit}_${proofType}_public.json`;
        const targetPublicPath = path.join(PUBLIC_PROOFS_DIR, targetPublicName);

        if (fs.existsSync(sourcePublicPath)) {
          fs.copyFileSync(sourcePublicPath, targetPublicPath);
        }
      }

      console.log(`✅ ${circuit} ${proofType}: ${selectedFile}`);
      copiedCount++;
    }
  }
}

console.log(`\n✅ Copied ${copiedCount} proofs to public/proofs`);
console.log("🚀 Ready for Vercel deployment\n");
