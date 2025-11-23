#!/usr/bin/env node
/**
 * Complete workflow: Generate → Verify → Attest
 * This script orchestrates the entire proof lifecycle
 */

const { execSync } = require("child_process");
const path = require("path");

console.log(`
╔════════════════════════════════════════════════════════════╗
║   Universal ZK Verifier - Complete Proof Workflow         ║
║   Generate → Verify → Attest on Arbitrum Sepolia          ║
╚════════════════════════════════════════════════════════════╝
`);

const steps = [
  {
    name: "Generate Proofs",
    description: "Generate Groth16 and PLONK proofs for all circuits",
    script: "scripts/generate-all-proofs.cjs",
    required: true,
  },
  {
    name: "Verify Proofs Locally",
    description: "Verify all generated proofs using UZKV (Universal Verifier)",
    script: "scripts/verify-with-uzkv.cjs",
    required: true,
  },
  {
    name: "Attest on Arbitrum Sepolia",
    description: "Submit proof attestations to the on-chain contract",
    script: "scripts/attest-proofs.cjs",
    required: false,
  },
];

let currentStep = 1;

for (const step of steps) {
  console.log(`\n[${currentStep}/${steps.length}] ${step.name}`);
  console.log(`    ${step.description}`);
  console.log("─".repeat(60));

  try {
    execSync(`node ${step.script}`, {
      stdio: "inherit",
      cwd: path.join(__dirname, ".."),
    });

    console.log(`\n✅ Step ${currentStep} completed successfully`);
  } catch (error) {
    console.error(`\n❌ Step ${currentStep} failed!`);

    if (step.required) {
      console.error("   This step is required. Cannot proceed.");
      process.exit(1);
    } else {
      console.log("   Continuing to next step...");
    }
  }

  currentStep++;
}

console.log(`
╔════════════════════════════════════════════════════════════╗
║   ✅ Workflow Complete!                                    ║
║                                                            ║
║   All proofs have been:                                   ║
║   1. Generated (Groth16, PLONK & STARK)                   ║
║   2. Verified locally                                     ║
║   3. Attested on Arbitrum Sepolia                         ║
║                                                            ║
║   View attestations:                                      ║
║   https://sepolia.arbiscan.io/address/                    ║
║   0x36e937ebcf56c5dec6ecb0695001becc87738177              ║
╚════════════════════════════════════════════════════════════╝
`);
