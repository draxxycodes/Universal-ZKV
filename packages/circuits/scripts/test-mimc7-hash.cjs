#!/usr/bin/env node
/**
 * Test MiMC7 Hash Function
 * Verify JS implementation matches circuit implementation
 */

const { buildMimc7 } = require("circomlibjs");
const { buildBabyjub } = require("circomlibjs");

async function main() {
  console.log("Loading MiMC7...");
  const mimc7 = await buildMimc7();
  const babyjub = await buildBabyjub();
  const F = mimc7.F;

  console.log("\n=== MiMC7 API ===");
  console.log("Available methods:", Object.keys(mimc7));

  // Test simple hash
  const left = BigInt(123);
  const right = BigInt(456);

  console.log("\n=== Test 1: hash() ===");
  console.log("Input left:", left.toString());
  console.log("Input right:", right.toString());

  const hash1 = mimc7.hash(left, right);
  console.log("mimc7.hash(left, right):", F.toObject(hash1).toString());

  // Test with rounds parameter
  const hash2 = mimc7.hash(left, right, 91);
  console.log("mimc7.hash(left, right, 91):", F.toObject(hash2).toString());

  // Test multiHash
  console.log("\n=== Test 2: multiHash() ===");
  const hash3 = mimc7.multiHash([left, right]);
  console.log("mimc7.multiHash([left, right]):", F.toObject(hash3).toString());

  const hash4 = mimc7.multiHash([left, right], 0, 91);
  console.log(
    "mimc7.multiHash([left, right], 0, 91):",
    F.toObject(hash4).toString(),
  );

  // Test circuit-style (left as x_in, right as key)
  console.log("\n=== Test 3: Circuit Style ===");
  console.log("Circuit uses: MiMC7(91) with x_in=left, k=right");
  console.log("This is equivalent to: mimc7.hash(left, right, 91)");

  // Compare all methods
  console.log("\n=== Comparison ===");
  console.log("hash(left, right):              ", F.toObject(hash1).toString());
  console.log("hash(left, right, 91):          ", F.toObject(hash2).toString());
  console.log("multiHash([left, right]):       ", F.toObject(hash3).toString());
  console.log("multiHash([left, right], 0, 91):", F.toObject(hash4).toString());

  // Test with real Merkle tree values
  console.log("\n=== Test 4: Real Merkle Values ===");
  const leaf = BigInt("12345678901234567890");
  const sibling = BigInt("98765432109876543210");

  console.log("Leaf:", leaf.toString());
  console.log("Sibling:", sibling.toString());

  const merkleHash = mimc7.hash(leaf, sibling);
  console.log("Hash:", F.toObject(merkleHash).toString());

  // Test Merkle tree computation
  console.log("\n=== Test 5: Merkle Tree Hashing ===");
  const leaves = [BigInt(1), BigInt(2), BigInt(3), BigInt(4)];
  console.log(
    "Leaves:",
    leaves.map((l) => l.toString()),
  );

  // Level 0 -> 1
  const h01 = mimc7.hash(leaves[0], leaves[1]);
  const h23 = mimc7.hash(leaves[2], leaves[3]);
  console.log("h(0,1):", F.toObject(h01).toString());
  console.log("h(2,3):", F.toObject(h23).toString());

  // Level 1 -> 2 (root)
  const root = mimc7.hash(F.toObject(h01), F.toObject(h23));
  console.log("root:", F.toObject(root).toString());
}

main().catch((err) => {
  console.error("Error:", err);
  process.exit(1);
});
