#!/usr/bin/env node
/**
 * Manually verify a Merkle proof input by computing the path
 */

const { buildMimc7 } = require("circomlibjs");
const fs = require("fs");
const path = require("path");

async function main() {
  const inputFile = process.argv[2];

  if (!inputFile) {
    console.log("Usage: node verify-merkle-input.cjs <input.json>");
    process.exit(1);
  }

  const input = JSON.parse(fs.readFileSync(inputFile, "utf8"));

  const mimc7 = await buildMimc7();
  const F = mimc7.F;

  const leaf = BigInt(input.leaf);
  const pathElements = input.pathElements.map((x) => BigInt(x));
  const pathIndices = input.pathIndices;
  const expectedRoot = BigInt(input.root);

  console.log("=== Merkle Proof Verification ===");
  console.log("Leaf:", leaf.toString());
  console.log("Expected root:", expectedRoot.toString());
  console.log("Tree depth:", pathElements.length);
  console.log();

  let currentHash = leaf;

  for (let level = 0; level < pathElements.length; level++) {
    const sibling = pathElements[level];
    const isRight = pathIndices[level] === 1;

    let left, right;
    if (isRight) {
      // Current is on the right, sibling is on the left
      left = sibling;
      right = currentHash;
    } else {
      // Current is on the left, sibling is on the right
      left = currentHash;
      right = sibling;
    }

    const hash = mimc7.hash(left, right);
    const hashValue = F.toObject(hash);

    console.log(`Level ${level}:`);
    console.log(`  Position: ${isRight ? "right (1)" : "left (0)"}`);
    console.log(`  Current: ${currentHash.toString().substring(0, 20)}...`);
    console.log(`  Sibling: ${sibling.toString().substring(0, 20)}...`);
    console.log(`  Left:    ${left.toString().substring(0, 20)}...`);
    console.log(`  Right:   ${right.toString().substring(0, 20)}...`);
    console.log(`  Hash:    ${hashValue.toString().substring(0, 20)}...`);

    currentHash = hashValue;
  }

  console.log();
  console.log("=== Result ===");
  console.log("Computed root:", currentHash.toString());
  console.log("Expected root:", expectedRoot.toString());
  console.log("Match:", currentHash === expectedRoot ? "✓ YES" : "✗ NO");

  if (currentHash !== expectedRoot) {
    console.log();
    console.log("Root mismatch! This proof will fail circuit validation.");
    process.exit(1);
  } else {
    console.log();
    console.log("Root matches! This proof should pass circuit validation.");
  }
}

main().catch((err) => {
  console.error("Error:", err);
  process.exit(1);
});
