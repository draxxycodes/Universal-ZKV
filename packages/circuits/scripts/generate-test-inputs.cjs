#!/usr/bin/env node
/**
 * Generate valid test inputs for circuits with proper hash computation
 * Task 2.7: PLONK Proof Generation Pipeline
 */

const { buildPoseidon } = require("circomlibjs");
const fs = require("fs");
const path = require("path");

const CIRCUITS_DIR = path.join(__dirname, "..");

async function generatePoseidonInputs(
  count,
  outputDir,
  includeInvalid = false,
) {
  console.log(`Generating ${count} Poseidon inputs...`);

  const poseidon = await buildPoseidon();

  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  const validCount = includeInvalid ? Math.floor(count * 0.8) : count;
  const invalidCount = includeInvalid ? count - validCount : 0;

  // Generate valid inputs
  for (let i = 1; i <= validCount; i++) {
    const a = BigInt(Math.floor(Math.random() * 10000));
    const b = BigInt(Math.floor(Math.random() * 10000));

    // Compute actual Poseidon hash
    const hash = poseidon([a, b]);
    const hashStr = poseidon.F.toString(hash);

    const input = {
      preimage: [a.toString(), b.toString()],
      expectedHash: hashStr,
    };

    fs.writeFileSync(
      path.join(outputDir, `input_${i}.json`),
      JSON.stringify(input, null, 2),
    );
  }

  console.log(`✓ Generated ${validCount} valid Poseidon inputs`);

  // Generate invalid inputs (wrong hashes)
  if (includeInvalid) {
    for (let i = 1; i <= invalidCount; i++) {
      const idx = validCount + i;
      const a = BigInt(Math.floor(Math.random() * 10000));
      const b = BigInt(Math.floor(Math.random() * 10000));

      // Compute correct hash
      const hash = poseidon([a, b]);
      const hashStr = poseidon.F.toString(hash);

      // Use wrong hash (add 1)
      const wrongHash = (BigInt(hashStr) + BigInt(1)).toString();

      const input = {
        preimage: [a.toString(), b.toString()],
        expectedHash: wrongHash,
      };

      fs.writeFileSync(
        path.join(outputDir, `input_${idx}.json`),
        JSON.stringify(input, null, 2),
      );
    }

    console.log(`✓ Generated ${invalidCount} invalid Poseidon inputs`);
  }
}

async function main() {
  const circuit = process.argv[2];
  const count = parseInt(process.argv[3] || "10", 10);
  const includeInvalid =
    process.argv[4] === "true" || process.argv[4] === "--invalid";
  const outputDir =
    process.argv[5] || path.join(CIRCUITS_DIR, "test-inputs", circuit);

  if (!circuit) {
    console.error(
      "Usage: node generate-test-inputs.cjs <circuit> [count] [includeInvalid] [output-dir]",
    );
    console.error(
      "Example: node generate-test-inputs.cjs poseidon_test 10 true",
    );
    process.exit(1);
  }

  switch (circuit) {
    case "poseidon_test":
      await generatePoseidonInputs(count, outputDir, includeInvalid);
      break;

    case "eddsa_verify":
      console.log("EdDSA signature generation requires key pair setup");
      console.log("Use packages/circuits/USAGE.md for EdDSA examples");
      break;

    case "merkle_proof":
      console.log("Merkle proof generation requires tree setup");
      console.log("Use packages/circuits/USAGE.md for Merkle examples");
      break;

    default:
      console.error(`Unknown circuit: ${circuit}`);
      process.exit(1);
  }
}

main().catch((err) => {
  console.error("Error:", err.message);
  process.exit(1);
});
