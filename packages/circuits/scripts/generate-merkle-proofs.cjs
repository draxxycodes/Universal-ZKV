#!/usr/bin/env node
/**
 * Merkle Proof Generator for Test Corpus
 * Task 2.8: Test Corpus Generation
 *
 * Generates Merkle tree membership proofs for testing
 */

const { buildMimc7 } = require("circomlibjs");
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

const CIRCUITS_DIR = path.join(__dirname, "..");

class MerkleTree {
  constructor(mimc7, depth) {
    this.mimc7 = mimc7;
    this.F = mimc7.F;
    this.depth = depth;
    this.leaves = [];
    this.zeroValues = [];

    // Precompute zero values for each level (optimization)
    this.precomputeZeroValues();
  }

  precomputeZeroValues() {
    this.zeroValues[0] = BigInt(0);
    for (let i = 1; i <= this.depth; i++) {
      this.zeroValues[i] = this.hash(
        this.zeroValues[i - 1],
        this.zeroValues[i - 1],
      );
    }
  }

  addLeaf(leaf) {
    this.leaves.push(leaf);
  }

  hash(left, right) {
    // MiMC7 hash: x_in is left, k (key) is right
    const h = this.mimc7.multiHash([left, right]);
    return this.F.toObject(h);
  }

  getRoot() {
    if (this.leaves.length === 0) {
      return this.zeroValues[this.depth];
    }

    // Build tree on-demand using sparse tree technique
    let currentLevel = [...this.leaves];
    const leafCount = 2 ** this.depth;

    // Pad with zeros
    while (currentLevel.length < leafCount) {
      currentLevel.push(this.zeroValues[0]);
    }

    // Build tree level by level
    for (let level = 0; level < this.depth; level++) {
      const nextLevel = [];
      for (let i = 0; i < currentLevel.length; i += 2) {
        const left = currentLevel[i];
        const right = currentLevel[i + 1];
        nextLevel.push(this.hash(left, right));
      }
      currentLevel = nextLevel;
    }

    return currentLevel[0];
  }

  getMembershipProof(leafIndex) {
    if (leafIndex >= 2 ** this.depth) {
      throw new Error("Invalid leaf index");
    }

    const pathElements = [];
    const pathIndices = [];

    // Build path by reconstructing only necessary nodes
    let currentLevel = [...this.leaves];
    const leafCount = 2 ** this.depth;

    // Pad with zeros
    while (currentLevel.length < leafCount) {
      currentLevel.push(this.zeroValues[0]);
    }

    let currentIndex = leafIndex;

    for (let level = 0; level < this.depth; level++) {
      const isRight = currentIndex % 2 === 1;
      const siblingIndex = isRight ? currentIndex - 1 : currentIndex + 1;

      // Get sibling
      const sibling =
        currentLevel[siblingIndex] !== undefined
          ? currentLevel[siblingIndex]
          : this.zeroValues[level];

      pathElements.push(sibling.toString());
      pathIndices.push(isRight ? 1 : 0);

      // Build next level
      const nextLevel = [];
      for (let i = 0; i < currentLevel.length; i += 2) {
        const left = currentLevel[i];
        const right = currentLevel[i + 1];
        nextLevel.push(this.hash(left, right));
      }
      currentLevel = nextLevel;
      currentIndex = Math.floor(currentIndex / 2);
    }

    const root = this.getRoot();
    const leaf =
      leafIndex < this.leaves.length
        ? this.leaves[leafIndex]
        : this.zeroValues[0];

    return {
      leaf: leaf.toString(),
      pathElements: pathElements,
      pathIndices: pathIndices,
      root: root.toString(),
    };
  }
}

async function generateMerkleProofs(
  count,
  treeDepth,
  outputDir,
  includeInvalid = false,
) {
  console.log(`Generating ${count} Merkle proofs (depth: ${treeDepth})...`);

  const mimc7 = await buildMimc7();
  const F = mimc7.F;

  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  const validCount = includeInvalid ? Math.floor(count * 0.8) : count;
  const invalidCount = includeInvalid ? count - validCount : 0;

  // Generate valid proofs
  for (let i = 1; i <= validCount; i++) {
    // Create tree with random leaves (sparse tree - only add needed leaves)
    const tree = new MerkleTree(mimc7, treeDepth);

    // Only add 10-20 random leaves (sparse tree optimization)
    const actualLeafCount = Math.floor(Math.random() * 11) + 10; // 10-20 leaves
    for (let j = 0; j < actualLeafCount; j++) {
      const leaf = BigInt("0x" + crypto.randomBytes(16).toString("hex"));
      tree.addLeaf(leaf);
    }

    // Generate proof for random leaf (only from actual leaves)
    const leafIndex = Math.floor(Math.random() * actualLeafCount);
    const proof = tree.getMembershipProof(leafIndex);

    // Prepare circuit input
    const input = {
      leaf: proof.leaf,
      pathElements: proof.pathElements,
      pathIndices: proof.pathIndices,
      root: proof.root,
    };

    // Save input
    const inputPath = path.join(outputDir, `input_${i}.json`);
    fs.writeFileSync(inputPath, JSON.stringify(input, null, 2));

    // Save metadata
    const metadataPath = path.join(outputDir, `metadata_${i}.json`);
    const metadata = {
      treeDepth: treeDepth,
      leafIndex: leafIndex,
      actualLeafCount: actualLeafCount,
      root: proof.root,
      valid: true,
    };
    fs.writeFileSync(metadataPath, JSON.stringify(metadata, null, 2));

    if (i % 10 === 0) {
      console.log(`  Generated ${i}/${validCount} valid proofs`);
    }
  }

  console.log(`✓ Generated ${validCount} valid Merkle proofs`);

  // Generate invalid proofs
  if (includeInvalid) {
    console.log(`Generating ${invalidCount} invalid proofs...`);

    for (let i = 1; i <= invalidCount; i++) {
      const idx = validCount + i;

      // Create tree (sparse)
      const tree = new MerkleTree(mimc7, treeDepth);
      const actualLeafCount = Math.floor(Math.random() * 11) + 10;

      for (let j = 0; j < actualLeafCount; j++) {
        const leaf = BigInt("0x" + crypto.randomBytes(16).toString("hex"));
        tree.addLeaf(leaf);
      }

      const leafIndex = Math.floor(Math.random() * actualLeafCount);
      const proof = tree.getMembershipProof(leafIndex);

      let input;
      let invalidType;

      // Create different types of invalid proofs
      const invalidCase = i % 3;

      if (invalidCase === 0) {
        // Wrong leaf
        const wrongLeaf = BigInt("0x" + crypto.randomBytes(16).toString("hex"));
        input = {
          leaf: wrongLeaf.toString(),
          pathElements: proof.pathElements,
          pathIndices: proof.pathIndices,
          root: proof.root,
        };
        invalidType = "wrong_leaf";
      } else if (invalidCase === 1) {
        // Tampered path
        const tamperedPath = [...proof.pathElements];
        const tamperedIndex = Math.floor(Math.random() * tamperedPath.length);
        tamperedPath[tamperedIndex] = (
          BigInt(tamperedPath[tamperedIndex]) + BigInt(1)
        ).toString();

        input = {
          leaf: proof.leaf,
          pathElements: tamperedPath,
          pathIndices: proof.pathIndices,
          root: proof.root,
        };
        invalidType = "tampered_path";
      } else {
        // Wrong root
        const wrongRoot = (BigInt(proof.root) + BigInt(1)).toString();
        input = {
          leaf: proof.leaf,
          pathElements: proof.pathElements,
          pathIndices: proof.pathIndices,
          root: wrongRoot,
        };
        invalidType = "wrong_root";
      }

      // Save input
      const inputPath = path.join(outputDir, `input_${idx}.json`);
      fs.writeFileSync(inputPath, JSON.stringify(input, null, 2));

      // Save metadata
      const metadataPath = path.join(outputDir, `metadata_${idx}.json`);
      const metadata = {
        treeDepth: treeDepth,
        valid: false,
        invalidType: invalidType,
      };
      fs.writeFileSync(metadataPath, JSON.stringify(metadata, null, 2));
    }

    console.log(`✓ Generated ${invalidCount} invalid Merkle proofs`);
  }

  // Create summary
  const summary = {
    totalCount: count,
    validCount: validCount,
    invalidCount: invalidCount,
    treeDepth: treeDepth,
    generatedAt: new Date().toISOString(),
    circuit: "merkle_proof",
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
  const treeDepth = parseInt(process.argv[3] || "20", 10);
  const includeInvalid =
    process.argv[4] === "true" || process.argv[4] === "--invalid";
  const outputDir =
    process.argv[5] || path.join(CIRCUITS_DIR, "test-inputs", "merkle_proof");

  console.log("Merkle Proof Generator");
  console.log("=====================");
  console.log(`Count: ${count}`);
  console.log(`Tree depth: ${treeDepth}`);
  console.log(`Include invalid: ${includeInvalid}`);
  console.log(`Output: ${outputDir}`);
  console.log("");

  await generateMerkleProofs(count, treeDepth, outputDir, includeInvalid);
}

main().catch((err) => {
  console.error("Error:", err.message);
  console.error(err.stack);
  process.exit(1);
});
