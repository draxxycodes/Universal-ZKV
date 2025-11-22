#!/usr/bin/env node

/**
 * Check Test Corpus Generation Progress
 * 
 * Monitors the progress of Task 2.8 test corpus generation
 */

const { existsSync, readdirSync, statSync } = require('fs');
const { join } = require('path');

const CIRCUITS_DIR = join(__dirname, '..');
const PROOFS_DIR = join(CIRCUITS_DIR, 'proofs/plonk');
const INPUTS_DIR = join(CIRCUITS_DIR, 'test-inputs');

function countProofs(circuitDir) {
  if (!existsSync(circuitDir)) return 0;
  
  const batchDir = join(circuitDir, 'batch');
  if (!existsSync(batchDir)) return 0;
  
  let count = 0;
  const dirs = readdirSync(batchDir, { withFileTypes: true });
  
  for (const dir of dirs) {
    if (dir.isDirectory()) {
      const proofFile = join(batchDir, dir.name, 'proof.json');
      if (existsSync(proofFile)) {
        count++;
      }
    }
  }
  
  return count;
}

function countInputs(circuitDir) {
  if (!existsSync(circuitDir)) return 0;
  
  const files = readdirSync(circuitDir);
  return files.filter(f => f.startsWith('input_') && f.endsWith('.json')).length;
}

function formatProgress(current, total) {
  const percentage = ((current / total) * 100).toFixed(1);
  const blocks = Math.floor((current / total) * 20);
  const bar = '█'.repeat(blocks) + '░'.repeat(20 - blocks);
  return `[${bar}] ${current}/${total} (${percentage}%)`;
}

function main() {
  console.log('\n╔════════════════════════════════════════════════════════╗');
  console.log('║     UZKV Test Corpus Generation - Progress Check      ║');
  console.log('╚════════════════════════════════════════════════════════╝\n');

  // Check inputs
  console.log('📝 Test Inputs:');
  const circuits = ['poseidon_test', 'eddsa_verify', 'merkle_proof'];
  let totalInputs = 0;
  
  circuits.forEach(circuit => {
    const count = countInputs(join(INPUTS_DIR, circuit));
    totalInputs += count;
    const status = count === 250 ? '✅' : count > 0 ? '⏳' : '❌';
    console.log(`  ${status} ${circuit.padEnd(20)} ${formatProgress(count, 250)}`);
  });
  
  console.log(`\n  Total Inputs: ${totalInputs}/750 (${((totalInputs/750)*100).toFixed(1)}%)\n`);

  // Check proofs
  console.log('🔐 PLONK Proofs:');
  let totalProofs = 0;
  
  circuits.forEach(circuit => {
    const count = countProofs(join(PROOFS_DIR, circuit));
    totalProofs += count;
    const status = count === 250 ? '✅' : count > 0 ? '🔄' : '⏳';
    console.log(`  ${status} ${circuit.padEnd(20)} ${formatProgress(count, 250)}`);
  });
  
  console.log(`\n  Total Proofs: ${totalProofs}/750 (${((totalProofs/750)*100).toFixed(1)}%)\n`);

  // Overall progress
  const overallProgress = ((totalProofs / 750) * 100).toFixed(1);
  console.log('📊 Overall Progress:');
  console.log(`  ${formatProgress(totalProofs, 750)}\n`);

  // Estimated time
  if (totalProofs > 0 && totalProofs < 750) {
    const proofsRemaining = 750 - totalProofs;
    const avgTimePerProof = 1.0; // seconds (conservative estimate)
    const timeRemaining = Math.ceil((proofsRemaining * avgTimePerProof) / 60);
    
    console.log('⏱️  Estimated Time Remaining:');
    console.log(`  ~${timeRemaining} minutes\n`);
  }

  // Completion status
  if (totalProofs === 750) {
    console.log('✅ CORPUS GENERATION COMPLETE!\n');
    console.log('Next steps:');
    console.log('  1. Verify corpus: node scripts/plonk-cli.cjs verify poseidon_test proofs/plonk/poseidon_test/batch/proof_1/proof.json');
    console.log('  2. Run integration tests: cd ../plonk-service && pnpm test');
    console.log('  3. Generate performance report: pnpm test performance\n');
  } else if (totalProofs > 0) {
    console.log('🔄 GENERATION IN PROGRESS...\n');
    console.log('Check progress again:');
    console.log('  node scripts/check-corpus-progress.cjs\n');
  } else {
    console.log('⏳ GENERATION NOT STARTED OR NO PROOFS YET\n');
    console.log('Start generation:');
    console.log('  node scripts/generate-test-corpus.cjs\n');
  }

  // Check for catalog
  const catalogPath = join(CIRCUITS_DIR, 'test-corpus-catalog.json');
  if (existsSync(catalogPath)) {
    const stat = statSync(catalogPath);
    console.log(`📋 Catalog: ${catalogPath}`);
    console.log(`   Size: ${(stat.size / 1024).toFixed(2)} KB`);
    console.log(`   Modified: ${stat.mtime.toLocaleString()}\n`);
  }
}

main();
