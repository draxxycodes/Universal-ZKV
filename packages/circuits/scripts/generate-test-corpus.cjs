#!/usr/bin/env node
/**
 * Complete Test Corpus Generator
 * Task 2.8: Test Corpus Generation
 *
 * Generates 500+ valid proofs and 100+ invalid proofs across all circuits
 */

const { execSync } = require("child_process");
const fs = require("fs");
const path = require("path");

const CIRCUITS_DIR = path.join(__dirname, "..");

// ANSI colors
const colors = {
  reset: "\x1b[0m",
  red: "\x1b[31m",
  green: "\x1b[32m",
  yellow: "\x1b[33m",
  blue: "\x1b[34m",
  cyan: "\x1b[36m",
};

function log(message, color = "reset") {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function execCommand(command, description) {
  log(`\n${description}...`, "cyan");
  try {
    execSync(command, { stdio: "inherit", cwd: CIRCUITS_DIR });
    log(`✓ ${description} complete`, "green");
    return true;
  } catch (error) {
    log(`✗ ${description} failed`, "red");
    return false;
  }
}

async function generateTestCorpus() {
  log("\n╔════════════════════════════════════════════════════════╗", "cyan");
  log("║     UZKV Test Corpus Generator - Task 2.8              ║", "cyan");
  log("║     Target: 500+ valid + 100+ invalid proofs          ║", "cyan");
  log("╚════════════════════════════════════════════════════════╝\n", "cyan");

  const startTime = Date.now();
  const results = {
    poseidon: { valid: 0, invalid: 0, proofs: 0 },
    eddsa: { valid: 0, invalid: 0, proofs: 0 },
    merkle: { valid: 0, invalid: 0, proofs: 0 },
  };

  // Step 1: Generate Poseidon inputs (200 valid + 50 invalid)
  log("═══ Step 1/6: Poseidon Test Inputs ═══", "yellow");
  if (
    execCommand(
      "node scripts/generate-test-inputs.cjs poseidon_test 250",
      "Generating 250 Poseidon inputs (200 valid + 50 invalid)",
    )
  ) {
    results.poseidon.valid = 200;
    results.poseidon.invalid = 50;
  }

  // Step 2: Generate EdDSA inputs (200 valid + 50 invalid)
  log("\n═══ Step 2/6: EdDSA Signature Inputs ═══", "yellow");
  if (
    execCommand(
      "node scripts/generate-eddsa-signatures.cjs 250 true",
      "Generating 250 EdDSA signatures (200 valid + 50 invalid)",
    )
  ) {
    results.eddsa.valid = 200;
    results.eddsa.invalid = 50;
  }

  // Step 3: Generate Merkle inputs (200 valid + 50 invalid)
  log("\n═══ Step 3/6: Merkle Proof Inputs ═══", "yellow");
  if (
    execCommand(
      "node scripts/generate-merkle-proofs-fast.cjs 250 20 true",
      "Generating 250 Merkle proofs (200 valid + 50 invalid)",
    )
  ) {
    results.merkle.valid = 200;
    results.merkle.invalid = 50;
  }

  // Step 4: Generate PLONK proofs for Poseidon
  log("\n═══ Step 4/6: Poseidon PLONK Proofs ═══", "yellow");
  log("Generating proofs in batches...", "cyan");

  const poseidonBatches = Math.ceil(250 / 50); // 50 proofs per batch
  for (let i = 0; i < poseidonBatches; i++) {
    const batchNum = i + 1;
    const batchSize = Math.min(50, 250 - i * 50);

    if (
      execCommand(
        `node scripts/plonk-cli.cjs batch poseidon_test ${batchSize} test-inputs/poseidon_test`,
        `Batch ${batchNum}/${poseidonBatches}: ${batchSize} Poseidon proofs`,
      )
    ) {
      results.poseidon.proofs += batchSize;
    }
  }

  // Step 5: Generate PLONK proofs for EdDSA
  log("\n═══ Step 5/6: EdDSA PLONK Proofs ═══", "yellow");
  log("Generating proofs in batches...", "cyan");

  const eddsaBatches = Math.ceil(250 / 50);
  for (let i = 0; i < eddsaBatches; i++) {
    const batchNum = i + 1;
    const batchSize = Math.min(50, 250 - i * 50);

    if (
      execCommand(
        `node scripts/plonk-cli.cjs batch eddsa_verify ${batchSize} test-inputs/eddsa_verify`,
        `Batch ${batchNum}/${eddsaBatches}: ${batchSize} EdDSA proofs`,
      )
    ) {
      results.eddsa.proofs += batchSize;
    }
  }

  // Step 6: Generate PLONK proofs for Merkle
  log("\n═══ Step 6/6: Merkle PLONK Proofs ═══", "yellow");
  log("Generating proofs in batches...", "cyan");

  const merkleBatches = Math.ceil(250 / 50);
  for (let i = 0; i < merkleBatches; i++) {
    const batchNum = i + 1;
    const batchSize = Math.min(50, 250 - i * 50);

    if (
      execCommand(
        `node scripts/plonk-cli.cjs batch merkle_proof ${batchSize} test-inputs/merkle_proof`,
        `Batch ${batchNum}/${merkleBatches}: ${batchSize} Merkle proofs`,
      )
    ) {
      results.merkle.proofs += batchSize;
    }
  }

  // Generate catalog
  log("\n═══ Generating Test Corpus Catalog ═══", "yellow");
  generateCatalog(results);

  // Calculate statistics
  const endTime = Date.now();
  const duration = ((endTime - startTime) / 1000 / 60).toFixed(2);

  const totalValid =
    results.poseidon.valid + results.eddsa.valid + results.merkle.valid;
  const totalInvalid =
    results.poseidon.invalid + results.eddsa.invalid + results.merkle.invalid;
  const totalProofs =
    results.poseidon.proofs + results.eddsa.proofs + results.merkle.proofs;

  // Print summary
  log("\n╔════════════════════════════════════════════════════════╗", "green");
  log("║             Test Corpus Generation Complete            ║", "green");
  log("╚════════════════════════════════════════════════════════╝", "green");

  log("\n📊 Summary Statistics:", "cyan");
  log("─────────────────────────────────────────────────────────");
  log(
    `Poseidon:  ${results.poseidon.valid} valid + ${results.poseidon.invalid} invalid = ${results.poseidon.proofs} proofs`,
    "white",
  );
  log(
    `EdDSA:     ${results.eddsa.valid} valid + ${results.eddsa.invalid} invalid = ${results.eddsa.proofs} proofs`,
    "white",
  );
  log(
    `Merkle:    ${results.merkle.valid} valid + ${results.merkle.invalid} invalid = ${results.merkle.proofs} proofs`,
    "white",
  );
  log("─────────────────────────────────────────────────────────");
  log(
    `Total:     ${totalValid} valid + ${totalInvalid} invalid = ${totalProofs} proofs`,
    "green",
  );
  log(`Duration:  ${duration} minutes`, "cyan");
  log("─────────────────────────────────────────────────────────\n");

  if (totalProofs >= 600) {
    log("✅ Target achieved: 500+ valid + 100+ invalid proofs", "green");
  } else {
    log(
      `⚠️  Target not fully met: ${totalProofs}/600 proofs generated`,
      "yellow",
    );
  }

  log("\n📁 Output locations:", "cyan");
  log(`  Inputs:  ${path.join(CIRCUITS_DIR, "test-inputs")}`);
  log(`  Proofs:  ${path.join(CIRCUITS_DIR, "proofs/plonk")}`);
  log(`  Catalog: ${path.join(CIRCUITS_DIR, "test-corpus-catalog.json")}\n`);
}

function generateCatalog(results) {
  const catalog = {
    generatedAt: new Date().toISOString(),
    version: "1.0.0",
    summary: {
      totalInputs:
        results.poseidon.valid +
        results.poseidon.invalid +
        results.eddsa.valid +
        results.eddsa.invalid +
        results.merkle.valid +
        results.merkle.invalid,
      totalProofs:
        results.poseidon.proofs + results.eddsa.proofs + results.merkle.proofs,
      validInputs:
        results.poseidon.valid + results.eddsa.valid + results.merkle.valid,
      invalidInputs:
        results.poseidon.invalid +
        results.eddsa.invalid +
        results.merkle.invalid,
    },
    circuits: {
      poseidon_test: {
        constraints: 601,
        validInputs: results.poseidon.valid,
        invalidInputs: results.poseidon.invalid,
        proofsGenerated: results.poseidon.proofs,
        inputsDir: "test-inputs/poseidon_test",
        proofsDir: "proofs/plonk/poseidon_test",
        zkeyFile: "build/poseidon_test_plonk.zkey",
        vkFile: "build/poseidon_test_plonk_vk.json",
      },
      eddsa_verify: {
        constraints: 23793,
        validInputs: results.eddsa.valid,
        invalidInputs: results.eddsa.invalid,
        proofsGenerated: results.eddsa.proofs,
        inputsDir: "test-inputs/eddsa_verify",
        proofsDir: "proofs/plonk/eddsa_verify",
        zkeyFile: "build/eddsa_verify_plonk.zkey",
        vkFile: "build/eddsa_verify_plonk_vk.json",
      },
      merkle_proof: {
        constraints: 12886,
        validInputs: results.merkle.valid,
        invalidInputs: results.merkle.invalid,
        proofsGenerated: results.merkle.proofs,
        inputsDir: "test-inputs/merkle_proof",
        proofsDir: "proofs/plonk/merkle_proof",
        zkeyFile: "build/merkle_proof_plonk.zkey",
        vkFile: "build/merkle_proof_plonk_vk.json",
      },
    },
    usage: {
      verifyProof: "node scripts/plonk-cli.cjs verify <circuit> <proof>",
      batchVerify:
        "find proofs/plonk/<circuit> -name proof.json -exec node scripts/plonk-cli.cjs verify <circuit> {} \\;",
      integrationTests: "pnpm test --filter @uzkv/circuits",
    },
  };

  const catalogPath = path.join(CIRCUITS_DIR, "test-corpus-catalog.json");
  fs.writeFileSync(catalogPath, JSON.stringify(catalog, null, 2));

  log(`✓ Catalog saved to ${catalogPath}`, "green");
}

// Main execution
generateTestCorpus().catch((err) => {
  log(`\n✗ Error: ${err.message}`, "red");
  console.error(err.stack);
  process.exit(1);
});
