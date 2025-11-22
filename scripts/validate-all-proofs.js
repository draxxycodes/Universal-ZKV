#!/usr/bin/env node

/**
 * UZKV Full Proof Validation Script
 * 
 * Validates all generated proofs (valid and invalid) across all circuits.
 * Generates comprehensive validation report with statistics.
 * 
 * Usage: node scripts/validate-all-proofs.js [--sample N] [--circuit CIRCUIT_NAME]
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Parse command line arguments
const args = process.argv.slice(2);
const sampleSize = args.includes('--sample') ? parseInt(args[args.indexOf('--sample') + 1]) : null;
const targetCircuit = args.includes('--circuit') ? args[args.indexOf('--circuit') + 1] : null;

// Configuration
const BASE_DIR = path.resolve(__dirname, '..');
const BUILD_DIR = path.join(BASE_DIR, 'packages', 'circuits', 'build');
const PROOFS_DIR = path.join(BASE_DIR, 'packages', 'circuits', 'proofs');

const CIRCUITS = [
  'poseidon_test',
  'eddsa_verify',
  'merkle_proof'
];

// Filter circuits if target specified
const circuitsToValidate = targetCircuit ? [targetCircuit] : CIRCUITS;

console.log('\n============================================================');
console.log('🔍 UZKV COMPREHENSIVE PROOF VALIDATION');
console.log('============================================================');
console.log(`Base Directory: ${BASE_DIR}`);
console.log(`Build Directory: ${BUILD_DIR}`);
console.log(`Proofs Directory: ${PROOFS_DIR}`);
console.log(`Circuits: ${circuitsToValidate.join(', ')}`);
if (sampleSize) {
  console.log(`Sample Size: ${sampleSize} proofs per circuit`);
}
console.log('============================================================\n');

// Validation results tracker
const results = {
  circuits: {},
  summary: {
    totalProofs: 0,
    validProofs: 0,
    invalidProofs: 0,
    successfulValidations: 0,
    failedValidations: 0,
    expectedFailures: 0,
    unexpectedFailures: 0,
    startTime: Date.now(),
    endTime: null,
    duration: null
  }
};

/**
 * Get all proof files for a circuit
 */
function getProofFiles(circuit, type = 'valid') {
  const proofsPath = path.join(PROOFS_DIR, circuit, type);
  if (!fs.existsSync(proofsPath)) {
    return [];
  }
  
  const files = fs.readdirSync(proofsPath);
  const proofFiles = files.filter(f => f.endsWith('_proof.json'));
  
  // Apply sampling if specified
  if (sampleSize && proofFiles.length > sampleSize) {
    // Random sampling
    const sampled = [];
    const step = Math.floor(proofFiles.length / sampleSize);
    for (let i = 0; i < sampleSize; i++) {
      sampled.push(proofFiles[i * step]);
    }
    return sampled;
  }
  
  return proofFiles;
}

/**
 * Verify a single proof
 */
function verifyProof(circuit, proofFile, type) {
  const proofPath = path.join(PROOFS_DIR, circuit, type, proofFile).replace(/\\/g, '/');
  const publicFile = proofFile.replace('_proof.json', '_public.json');
  const publicPath = path.join(PROOFS_DIR, circuit, type, publicFile).replace(/\\/g, '/');
  
  // Map circuit names to VK file names
  const vkMap = {
    'poseidon_test': 'poseidon_vk.json',
    'eddsa_verify': 'eddsa_vk.json',
    'merkle_proof': 'merkle_vk.json'
  };
  
  const vkeyPath = path.join(BUILD_DIR, vkMap[circuit]).replace(/\\/g, '/');
  
  try {
    const cmd = `snarkjs groth16 verify "${vkeyPath}" "${publicPath}" "${proofPath}"`;
    const output = execSync(cmd, { encoding: 'utf-8', stdio: 'pipe' });
    
    // Check if verification succeeded
    const isValid = output.includes('OK!');
    return { success: true, valid: isValid, error: null };
  } catch (error) {
    return { success: false, valid: false, error: error.message };
  }
}

/**
 * Validate all proofs for a circuit
 */
function validateCircuit(circuit) {
  console.log(`\n============================================================`);
  console.log(`📊 Validating: ${circuit}`);
  console.log(`============================================================`);
  
  const circuitResults = {
    valid: {
      total: 0,
      verified: 0,
      failed: 0,
      unexpectedFailures: 0
    },
    invalid: {
      total: 0,
      verified: 0,
      failed: 0,
      unexpectedFailures: 0
    }
  };
  
  // Validate VALID proofs (should all verify successfully)
  const validProofs = getProofFiles(circuit, 'valid');
  circuitResults.valid.total = validProofs.length;
  
  console.log(`\n🟢 Validating ${validProofs.length} VALID proofs...`);
  let validProgress = 0;
  const validBatchSize = 100;
  
  for (let i = 0; i < validProofs.length; i++) {
    const result = verifyProof(circuit, validProofs[i], 'valid');
    
    if (result.success && result.valid) {
      circuitResults.valid.verified++;
    } else if (result.success && !result.valid) {
      circuitResults.valid.unexpectedFailures++;
      console.log(`  ❌ UNEXPECTED: Valid proof failed verification: ${validProofs[i]}`);
    } else {
      circuitResults.valid.failed++;
      console.log(`  ⚠️  Error verifying: ${validProofs[i]} - ${result.error}`);
    }
    
    // Progress indicator
    if ((i + 1) % validBatchSize === 0) {
      validProgress = ((i + 1) / validProofs.length * 100).toFixed(1);
      process.stdout.write(`  Progress: ${i + 1}/${validProofs.length} (${validProgress}%)\r`);
    }
  }
  
  console.log(`\n  ✅ Verified: ${circuitResults.valid.verified}/${circuitResults.valid.total}`);
  if (circuitResults.valid.unexpectedFailures > 0) {
    console.log(`  ❌ Unexpected failures: ${circuitResults.valid.unexpectedFailures}`);
  }
  
  // Validate INVALID proofs (should all fail verification)
  const invalidProofs = getProofFiles(circuit, 'invalid');
  circuitResults.invalid.total = invalidProofs.length;
  
  if (invalidProofs.length > 0) {
    console.log(`\n🔴 Validating ${invalidProofs.length} INVALID proofs...`);
    let invalidProgress = 0;
    const invalidBatchSize = 50;
    
    for (let i = 0; i < invalidProofs.length; i++) {
      const result = verifyProof(circuit, invalidProofs[i], 'invalid');
      
      if (result.success && !result.valid) {
        // Expected: invalid proof correctly rejected
        circuitResults.invalid.verified++;
      } else if (result.success && result.valid) {
        // Unexpected: invalid proof passed verification
        circuitResults.invalid.unexpectedFailures++;
        console.log(`  ⚠️  CRITICAL: Invalid proof passed verification: ${invalidProofs[i]}`);
      } else {
        // Error during verification (acceptable for invalid proofs)
        circuitResults.invalid.failed++;
      }
      
      // Progress indicator
      if ((i + 1) % invalidBatchSize === 0) {
        invalidProgress = ((i + 1) / invalidProofs.length * 100).toFixed(1);
        process.stdout.write(`  Progress: ${i + 1}/${invalidProofs.length} (${invalidProgress}%)\r`);
      }
    }
    
    console.log(`\n  ✅ Correctly rejected: ${circuitResults.invalid.verified}/${circuitResults.invalid.total}`);
    if (circuitResults.invalid.unexpectedFailures > 0) {
      console.log(`  ⚠️  CRITICAL failures: ${circuitResults.invalid.unexpectedFailures}`);
    }
  }
  
  // Update summary
  results.circuits[circuit] = circuitResults;
  results.summary.totalProofs += circuitResults.valid.total + circuitResults.invalid.total;
  results.summary.validProofs += circuitResults.valid.total;
  results.summary.invalidProofs += circuitResults.invalid.total;
  results.summary.successfulValidations += circuitResults.valid.verified + circuitResults.invalid.verified;
  results.summary.expectedFailures += circuitResults.invalid.verified;
  results.summary.unexpectedFailures += circuitResults.valid.unexpectedFailures + circuitResults.invalid.unexpectedFailures;
  
  console.log(`\n✅ ${circuit} validation complete!`);
}

/**
 * Generate validation report
 */
function generateReport() {
  results.summary.endTime = Date.now();
  results.summary.duration = ((results.summary.endTime - results.summary.startTime) / 1000).toFixed(2);
  
  console.log('\n\n============================================================');
  console.log('📊 VALIDATION SUMMARY');
  console.log('============================================================');
  console.log(`Total proofs validated: ${results.summary.totalProofs}`);
  console.log(`  Valid proofs: ${results.summary.validProofs}`);
  console.log(`  Invalid proofs: ${results.summary.invalidProofs}`);
  console.log(`\nValidation Results:`);
  console.log(`  ✅ Successful validations: ${results.summary.successfulValidations}`);
  console.log(`  ⚠️  Expected failures (invalid proofs): ${results.summary.expectedFailures}`);
  console.log(`  ❌ Unexpected failures: ${results.summary.unexpectedFailures}`);
  console.log(`\nDuration: ${results.summary.duration}s`);
  console.log('============================================================');
  
  // Per-circuit breakdown
  console.log('\n📋 Per-Circuit Results:');
  for (const circuit of Object.keys(results.circuits)) {
    const cr = results.circuits[circuit];
    console.log(`\n  ${circuit}:`);
    console.log(`    Valid: ${cr.valid.verified}/${cr.valid.total} verified`);
    if (cr.valid.unexpectedFailures > 0) {
      console.log(`      ❌ Unexpected failures: ${cr.valid.unexpectedFailures}`);
    }
    console.log(`    Invalid: ${cr.invalid.verified}/${cr.invalid.total} correctly rejected`);
    if (cr.invalid.unexpectedFailures > 0) {
      console.log(`      ⚠️  CRITICAL failures: ${cr.invalid.unexpectedFailures}`);
    }
  }
  
  // Calculate success rate
  const circuitNames = Object.keys(results.circuits);
  if (circuitNames.length === 0) {
    console.log('\n⚠️  No circuits validated');
    return;
  }
  
  let totalExpected = 0;
  let totalSuccess = 0;
  
  for (const circuit of circuitNames) {
    if (results.circuits[circuit] && results.circuits[circuit].valid) {
      totalExpected += results.circuits[circuit].valid.total;
      totalSuccess += results.circuits[circuit].valid.verified;
    }
  }
  
  const successRate = totalExpected > 0 ? ((totalSuccess / totalExpected) * 100).toFixed(2) : '0.00';
  
  console.log(`\n🎯 Overall Success Rate: ${successRate}%`);
  console.log('============================================================\n');
  
  // Save detailed report
  const reportPath = path.join(BASE_DIR, 'validation-report.json');
  fs.writeFileSync(reportPath, JSON.stringify(results, null, 2));
  console.log(`📄 Detailed report saved to: validation-report.json\n`);
  
  // Exit with error if there were unexpected failures
  if (results.summary.unexpectedFailures > 0) {
    console.error('⚠️  Validation completed with unexpected failures!');
    process.exit(1);
  }
}

// Main execution
async function main() {
  try {
    for (const circuit of circuitsToValidate) {
      validateCircuit(circuit);
    }
    
    generateReport();
    console.log('✅ Validation complete!\n');
    process.exit(0);
  } catch (error) {
    console.error('\n❌ Validation failed:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

main();
