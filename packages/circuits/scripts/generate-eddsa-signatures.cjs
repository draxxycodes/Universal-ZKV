#!/usr/bin/env node
/**
 * EdDSA Signature Generator for Test Corpus
 * Task 2.8: Test Corpus Generation
 *
 * Generates valid EdDSA signatures with varied messages for testing
 */

const { buildEddsa, buildBabyjub } = require("circomlibjs");
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

const CIRCUITS_DIR = path.join(__dirname, "..");

async function generateEdDSASignatures(
  count,
  outputDir,
  includeInvalid = false,
) {
  console.log(`Generating ${count} EdDSA signatures...`);

  const eddsa = await buildEddsa();
  const babyJub = await buildBabyjub();
  const F = babyJub.F;

  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  const validCount = includeInvalid ? Math.floor(count * 0.8) : count;
  const invalidCount = includeInvalid ? count - validCount : 0;

  // Generate valid signatures
  for (let i = 1; i <= validCount; i++) {
    // Generate random private key
    const prvKey = crypto.randomBytes(32);

    // Derive public key
    const pubKey = eddsa.prv2pub(prvKey);

    // Generate random message as Buffer (32 bytes)
    const message = crypto.randomBytes(32);

    // Sign message using MiMC (as circuit uses EdDSAMiMCVerifier)
    const signature = eddsa.signMiMC(prvKey, message);

    // Prepare circuit input (no 'enabled' - circuit sets it internally)
    const input = {
      Ax: F.toString(pubKey[0]),
      Ay: F.toString(pubKey[1]),
      R8x: F.toString(signature.R8[0]),
      R8y: F.toString(signature.R8[1]),
      S: signature.S.toString(),
      M: F.toString(eddsa.F.e(message)),
    };

    // Save input
    const inputPath = path.join(outputDir, `input_${i}.json`);
    fs.writeFileSync(inputPath, JSON.stringify(input, null, 2));

    // Save metadata for reference
    const metadataPath = path.join(outputDir, `metadata_${i}.json`);
    const metadata = {
      publicKey: [F.toString(pubKey[0]), F.toString(pubKey[1])],
      message: message.toString("hex"),
      signature: {
        R8: [F.toString(signature.R8[0]), F.toString(signature.R8[1])],
        S: signature.S.toString(),
      },
      valid: true,
    };
    fs.writeFileSync(metadataPath, JSON.stringify(metadata, null, 2));

    if (i % 10 === 0) {
      console.log(`  Generated ${i}/${validCount} valid signatures`);
    }
  }

  console.log(`✓ Generated ${validCount} valid EdDSA signatures`);

  // Generate invalid signatures (wrong keys, tampered messages)
  if (includeInvalid) {
    console.log(`Generating ${invalidCount} invalid signatures...`);

    for (let i = 1; i <= invalidCount; i++) {
      const idx = validCount + i;

      // Generate signature
      const prvKey = crypto.randomBytes(32);
      const pubKey = eddsa.prv2pub(prvKey);
      const message = crypto.randomBytes(32);
      const signature = eddsa.signMiMC(prvKey, message);

      let input;
      let invalidType;

      // Create different types of invalid signatures
      const invalidCase = i % 3;

      if (invalidCase === 0) {
        // Wrong public key
        const wrongPrvKey = crypto.randomBytes(32);
        const wrongPubKey = eddsa.prv2pub(wrongPrvKey);

        input = {
          Ax: F.toString(wrongPubKey[0]),
          Ay: F.toString(wrongPubKey[1]),
          R8x: F.toString(signature.R8[0]),
          R8y: F.toString(signature.R8[1]),
          S: signature.S.toString(),
          M: F.toString(eddsa.F.e(message)),
        };
        invalidType = "wrong_public_key";
      } else if (invalidCase === 1) {
        // Tampered message
        const tamperedMessage = crypto.randomBytes(32);

        input = {
          Ax: F.toString(pubKey[0]),
          Ay: F.toString(pubKey[1]),
          R8x: F.toString(signature.R8[0]),
          R8y: F.toString(signature.R8[1]),
          S: signature.S.toString(),
          M: F.toString(eddsa.F.e(tamperedMessage)),
        };
        invalidType = "tampered_message";
      } else {
        // Tampered signature
        const tamperedS = (
          BigInt(signature.S.toString()) + BigInt(1)
        ).toString();

        input = {
          Ax: F.toString(pubKey[0]),
          Ay: F.toString(pubKey[1]),
          R8x: F.toString(signature.R8[0]),
          R8y: F.toString(signature.R8[1]),
          S: tamperedS,
          M: F.toString(eddsa.F.e(message)),
        };
        invalidType = "tampered_signature";
      }

      // Save input
      const inputPath = path.join(outputDir, `input_${idx}.json`);
      fs.writeFileSync(inputPath, JSON.stringify(input, null, 2));

      // Save metadata
      const metadataPath = path.join(outputDir, `metadata_${idx}.json`);
      const metadata = {
        valid: false,
        invalidType: invalidType,
        message: message.toString("hex"),
      };
      fs.writeFileSync(metadataPath, JSON.stringify(metadata, null, 2));
    }

    console.log(`✓ Generated ${invalidCount} invalid EdDSA signatures`);
  }

  // Create summary
  const summary = {
    totalCount: count,
    validCount: validCount,
    invalidCount: invalidCount,
    generatedAt: new Date().toISOString(),
    circuit: "eddsa_verify",
  };

  fs.writeFileSync(
    path.join(outputDir, "summary.json"),
    JSON.stringify(summary, null, 2),
  );

  console.log(
    `\n✓ Complete! Summary saved to ${path.join(outputDir, "summary.json")}`,
  );
}

async function main() {
  const count = parseInt(process.argv[2] || "50", 10);
  const includeInvalid =
    process.argv[3] === "true" || process.argv[3] === "--invalid";
  const outputDir =
    process.argv[4] || path.join(CIRCUITS_DIR, "test-inputs", "eddsa_verify");

  console.log("EdDSA Signature Generator");
  console.log("========================");
  console.log(`Count: ${count}`);
  console.log(`Include invalid: ${includeInvalid}`);
  console.log(`Output: ${outputDir}`);
  console.log("");

  await generateEdDSASignatures(count, outputDir, includeInvalid);
}

main().catch((err) => {
  console.error("Error:", err.message);
  console.error(err.stack);
  process.exit(1);
});
