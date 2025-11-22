#!/usr/bin/env node
/**
 * Fast Merkle Proof Generator for Test Corpus
 * Task 2.8: Test Corpus Generation
 * 
 * Uses efficient sparse tree representation with MiMC7
 */

const { buildMimc7 } = require('circomlibjs');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const CIRCUITS_DIR = path.join(__dirname, '..');

async function generateMerkleProofs(count, treeDepth, outputDir, includeInvalid = false) {
  console.log(`Generating ${count} Merkle proofs (depth: ${treeDepth})...`);
  
  const mimc7 = await buildMimc7();
  const F = mimc7.F;
  
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }
  
  const validCount = includeInvalid ? Math.floor(count * 0.8) : count;
  const invalidCount = includeInvalid ? count - validCount : 0;
  
  // Helper to hash using MiMC7 matching circuit implementation
  // Circuit uses: MiMC7(91) with x_in=left, k=right
  // This computes: mimc7(x_in=left, k=right) for 91 rounds
  // The hash function processes: (k + x_in + c[i])^7 for each round
  const hash = (left, right) => {
    const h = mimc7.hash(BigInt(left), BigInt(right));
    return F.toObject(h);
  };
  
  // Generate valid proofs (much faster - compute path directly)
  for (let i = 1; i <= validCount; i++) {
    // Random leaf
    const leaf = BigInt('0x' + crypto.randomBytes(16).toString('hex'));
    
    // Random path elements
    const pathElements = [];
    for (let level = 0; level < treeDepth; level++) {
      const sibling = BigInt('0x' + crypto.randomBytes(16).toString('hex'));
      pathElements.push(sibling.toString());
    }
    
    // Random path indices
    const pathIndices = [];
    for (let level = 0; level < treeDepth; level++) {
      pathIndices.push(Math.random() < 0.5 ? 0 : 1);
    }
    
    // Compute root from leaf and path
    let currentHash = leaf;
    for (let level = 0; level < treeDepth; level++) {
      const sibling = BigInt(pathElements[level]);
      const isRight = pathIndices[level] === 1;
      
      if (isRight) {
        // Current is right, sibling is left
        currentHash = hash(sibling, currentHash);
      } else {
        // Current is left, sibling is right
        currentHash = hash(currentHash, sibling);
      }
    }
    
    const root = currentHash;
    
    // Prepare circuit input
    const input = {
      leaf: leaf.toString(),
      pathElements: pathElements,
      pathIndices: pathIndices,
      root: root.toString()
    };
    
    // Save input
    const inputPath = path.join(outputDir, `input_${i}.json`);
    fs.writeFileSync(inputPath, JSON.stringify(input, null, 2));
    
    // Save metadata
    const metadataPath = path.join(outputDir, `metadata_${i}.json`);
    const metadata = {
      treeDepth: treeDepth,
      root: root.toString(),
      valid: true
    };
    fs.writeFileSync(metadataPath, JSON.stringify(metadata, null, 2));
    
    if (i % 25 === 0) {
      console.log(`  Generated ${i}/${validCount} valid proofs`);
    }
  }
  
  console.log(`✓ Generated ${validCount} valid Merkle proofs`);
  
  // Generate invalid proofs
  if (includeInvalid) {
    console.log(`Generating ${invalidCount} invalid proofs...`);
    
    for (let i = 1; i <= invalidCount; i++) {
      const idx = validCount + i;
      
      // Generate valid proof first
      const leaf = BigInt('0x' + crypto.randomBytes(16).toString('hex'));
      const pathElements = [];
      const pathIndices = [];
      
      for (let level = 0; level < treeDepth; level++) {
        pathElements.push(BigInt('0x' + crypto.randomBytes(16).toString('hex')).toString());
        pathIndices.push(Math.random() < 0.5 ? 0 : 1);
      }
      
      // Compute correct root
      let currentHash = leaf;
      for (let level = 0; level < treeDepth; level++) {
        const sibling = BigInt(pathElements[level]);
        const isRight = pathIndices[level] === 1;
        currentHash = isRight ? hash(sibling, currentHash) : hash(currentHash, sibling);
      }
      const correctRoot = currentHash;
      
      let input;
      let invalidType;
      
      // Create different types of invalid proofs
      const invalidCase = i % 3;
      
      if (invalidCase === 0) {
        // Wrong leaf
        const wrongLeaf = (leaf + BigInt(1)).toString();
        input = {
          leaf: wrongLeaf,
          pathElements: pathElements,
          pathIndices: pathIndices,
          root: correctRoot.toString()
        };
        invalidType = 'wrong_leaf';
        
      } else if (invalidCase === 1) {
        // Tampered path
        const tamperedPath = [...pathElements];
        const tamperedIndex = Math.floor(Math.random() * tamperedPath.length);
        tamperedPath[tamperedIndex] = (BigInt(tamperedPath[tamperedIndex]) + BigInt(1)).toString();
        
        input = {
          leaf: leaf.toString(),
          pathElements: tamperedPath,
          pathIndices: pathIndices,
          root: correctRoot.toString()
        };
        invalidType = 'tampered_path';
        
      } else {
        // Wrong root
        const wrongRoot = (correctRoot + BigInt(1)).toString();
        input = {
          leaf: leaf.toString(),
          pathElements: pathElements,
          pathIndices: pathIndices,
          root: wrongRoot
        };
        invalidType = 'wrong_root';
      }
      
      // Save input
      const inputPath = path.join(outputDir, `input_${idx}.json`);
      fs.writeFileSync(inputPath, JSON.stringify(input, null, 2));
      
      // Save metadata
      const metadataPath = path.join(outputDir, `metadata_${idx}.json`);
      const metadata = {
        treeDepth: treeDepth,
        valid: false,
        invalidType: invalidType
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
    circuit: 'merkle_proof'
  };
  
  fs.writeFileSync(
    path.join(outputDir, 'summary.json'),
    JSON.stringify(summary, null, 2)
  );
  
  console.log(`\n✓ Complete! Summary saved to ${path.join(outputDir, 'summary.json')}`);
}

async function main() {
  const count = parseInt(process.argv[2] || '50', 10);
  const treeDepth = parseInt(process.argv[3] || '20', 10);
  const includeInvalid = process.argv[4] === 'true' || process.argv[4] === '--invalid';
  const outputDir = process.argv[5] || path.join(CIRCUITS_DIR, 'test-inputs', 'merkle_proof');
  
  console.log('Fast Merkle Proof Generator');
  console.log('===========================');
  console.log(`Count: ${count}`);
  console.log(`Tree depth: ${treeDepth}`);
  console.log(`Include invalid: ${includeInvalid}`);
  console.log(`Output: ${outputDir}`);
  console.log('');
  
  await generateMerkleProofs(count, treeDepth, outputDir, includeInvalid);
}

main().catch(err => {
  console.error('Error:', err.message);
  console.error(err.stack);
  process.exit(1);
});
