#!/usr/bin/env node
/**
 * PLONK CLI Tool
 * Task 2.7: PLONK Proof Generation Pipeline
 * 
 * Commands:
 *   generate <circuit> <input> - Generate PLONK proof
 *   verify <circuit> <proof>   - Verify PLONK proof
 *   export <circuit>            - Export verification key
 *   batch <circuit> <count>     - Generate batch of proofs
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const CIRCUITS_DIR = path.join(__dirname, '..');
const BUILD_DIR = path.join(CIRCUITS_DIR, 'build');
const PROOFS_DIR = path.join(CIRCUITS_DIR, 'proofs', 'plonk');

// ANSI colors
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function error(message) {
  log(`Error: ${message}`, 'red');
  process.exit(1);
}

function success(message) {
  log(`✓ ${message}`, 'green');
}

function info(message) {
  log(message, 'blue');
}

function checkCircuitExists(circuit) {
  const circuits = ['poseidon_test', 'eddsa_verify', 'merkle_proof'];
  if (!circuits.includes(circuit)) {
    error(`Unknown circuit: ${circuit}. Available: ${circuits.join(', ')}`);
  }
}

function ensureSetup(circuit) {
  const zkeyPath = path.join(BUILD_DIR, `${circuit}_plonk.zkey`);
  const vkPath = path.join(BUILD_DIR, `${circuit}_plonk_vk.json`);
  
  if (!fs.existsSync(zkeyPath) || !fs.existsSync(vkPath)) {
    error(`PLONK setup not found for ${circuit}. Run: ./generate-plonk-proofs.sh`);
  }
  
  return { zkeyPath, vkPath };
}

function generateWitness(circuit, inputPath, uniqueId) {
  const wasmDir = path.join(BUILD_DIR, `${circuit}_js`);
  const wasmPath = path.join(wasmDir, `${circuit}.wasm`);
  // Use unique witness path to avoid collisions in batch processing
  const witnessPath = uniqueId 
    ? path.join(BUILD_DIR, `${circuit}_witness_${uniqueId}.wtns`)
    : path.join(BUILD_DIR, `${circuit}_witness.wtns`);
  
  if (!fs.existsSync(wasmPath)) {
    error(`WASM not found for ${circuit}. Compile first: circom src/${circuit}.circom --wasm`);
  }
  
  // Ensure input path is absolute
  const absInputPath = path.isAbsolute(inputPath) ? inputPath : path.resolve(inputPath);
  
  try {
    execSync(
      `node "${path.join(wasmDir, 'generate_witness.js')}" "${wasmPath}" "${absInputPath}" "${witnessPath}"`,
      { stdio: 'pipe' }
    );
    return witnessPath;
  } catch (e) {
    error(`Failed to generate witness: ${e.message}`);
  }
}

function generateProof(circuit, inputPath, outputDir, uniqueId) {
  info(`Generating PLONK proof for ${circuit}...`);
  
  checkCircuitExists(circuit);
  const { zkeyPath } = ensureSetup(circuit);
  
  // Ensure input exists
  if (!fs.existsSync(inputPath)) {
    error(`Input file not found: ${inputPath}`);
  }
  
  // Create output directory
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }
  
  // Generate witness with unique ID to avoid file collisions in batch mode
  const witnessPath = generateWitness(circuit, inputPath, uniqueId);
  success(`Generated witness`);
  
  // Generate proof
  const proofPath = path.join(outputDir, 'proof.json');
  const publicPath = path.join(outputDir, 'public.json');
  
  try {
    execSync(
      `snarkjs plonk prove "${zkeyPath}" "${witnessPath}" "${proofPath}" "${publicPath}"`,
      { stdio: 'ignore' }
    );
    success(`Generated proof: ${proofPath}`);
    success(`Public inputs: ${publicPath}`);
    
    // Cleanup witness
    fs.unlinkSync(witnessPath);
    
    return { proofPath, publicPath };
  } catch (e) {
    error(`Failed to generate proof: ${e.message}`);
  }
}

function verifyProof(circuit, proofPath, publicPath) {
  info(`Verifying PLONK proof for ${circuit}...`);
  
  checkCircuitExists(circuit);
  const { vkPath } = ensureSetup(circuit);
  
  if (!fs.existsSync(proofPath)) {
    error(`Proof file not found: ${proofPath}`);
  }
  
  if (!publicPath) {
    publicPath = path.join(path.dirname(proofPath), 'public.json');
  }
  
  if (!fs.existsSync(publicPath)) {
    error(`Public inputs file not found: ${publicPath}`);
  }
  
  try {
    execSync(
      `snarkjs plonk verify "${vkPath}" "${publicPath}" "${proofPath}"`,
      { stdio: 'pipe' }
    );
    success(`Proof is VALID`);
    return true;
  } catch (e) {
    log(`Proof is INVALID`, 'red');
    return false;
  }
}

function exportVerificationKey(circuit) {
  info(`Exporting verification key for ${circuit}...`);
  
  checkCircuitExists(circuit);
  const { zkeyPath, vkPath } = ensureSetup(circuit);
  
  if (fs.existsSync(vkPath)) {
    success(`Verification key already exists: ${vkPath}`);
    return vkPath;
  }
  
  try {
    execSync(`snarkjs zkey export verificationkey "${zkeyPath}" "${vkPath}"`, {
      stdio: 'ignore',
    });
    success(`Exported verification key: ${vkPath}`);
    return vkPath;
  } catch (e) {
    error(`Failed to export verification key: ${e.message}`);
  }
}

function generateBatchProofs(circuit, count, inputsDir) {
  info(`Generating ${count} PLONK proofs for ${circuit}...`);
  
  checkCircuitExists(circuit);
  
  if (!fs.existsSync(inputsDir)) {
    error(`Inputs directory not found: ${inputsDir}`);
  }
  
  const outputDir = path.join(PROOFS_DIR, circuit, 'batch');
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }
  
  let successCount = 0;
  let failCount = 0;
  
  for (let i = 1; i <= count; i++) {
    const inputPath = path.join(inputsDir, `input_${i}.json`);
    
    if (!fs.existsSync(inputPath)) {
      log(`Skipping ${i}: input not found`, 'yellow');
      continue;
    }
    
    const proofDir = path.join(outputDir, `proof_${i}`);
    
    try {
      // Pass unique ID to avoid witness file collisions
      generateProof(circuit, inputPath, proofDir, `batch_${i}`);
      successCount++;
    } catch (e) {
      log(`Failed to generate proof ${i}: ${e.message}`, 'red');
      failCount++;
    }
  }
  
  success(`Generated ${successCount} proofs successfully`);
  if (failCount > 0) {
    log(`Failed: ${failCount} proofs`, 'yellow');
  }
}

function generateSampleInputs(circuit, outputDir) {
  info(`Generating sample inputs for ${circuit}...`);
  
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }
  
  switch (circuit) {
    case 'poseidon_test':
      // Generate 10 random hash preimages
      // Note: We compute expectedHash separately for now (can use poseidon-lite or circomlibjs)
      for (let i = 1; i <= 10; i++) {
        const a = Math.floor(Math.random() * 10000);
        const b = Math.floor(Math.random() * 10000);
        // For testing, use dummy expectedHash (user needs to compute actual hash)
        // or use: import { poseidon } from 'circomlibjs'
        const input = { 
          preimage: [String(a), String(b)],
          expectedHash: "0"  // Placeholder - compute actual hash for valid proofs
        };
        fs.writeFileSync(
          path.join(outputDir, `input_${i}.json`),
          JSON.stringify(input, null, 2)
        );
      }
      success(`Generated 10 Poseidon test inputs`);
      log(`Note: expectedHash set to "0" - compute actual hashes for valid proofs`, 'yellow');
      break;
      
    case 'eddsa_verify':
      log(`EdDSA requires signature generation - use external tool`, 'yellow');
      log(`See packages/circuits/USAGE.md for details`, 'yellow');
      break;
      
    case 'merkle_proof':
      log(`Merkle proofs require tree setup - use external tool`, 'yellow');
      log(`See packages/circuits/USAGE.md for details`, 'yellow');
      break;
      
    default:
      error(`Unknown circuit: ${circuit}`);
  }
}

function showUsage() {
  console.log(`
PLONK CLI Tool - UZKV Circuits

Usage:
  node plonk-cli.js <command> [options]

Commands:
  generate <circuit> <input> [output]
    Generate a PLONK proof for the given circuit and input
    Example: node plonk-cli.js generate poseidon_test input.json ./output
    
  verify <circuit> <proof> [public]
    Verify a PLONK proof
    Example: node plonk-cli.js verify poseidon_test proof.json public.json
    
  export <circuit>
    Export verification key for a circuit
    Example: node plonk-cli.js export poseidon_test
    
  batch <circuit> <count> <inputs-dir>
    Generate multiple proofs from a directory of inputs
    Example: node plonk-cli.js batch poseidon_test 10 ./inputs
    
  sample-inputs <circuit> <output-dir>
    Generate sample inputs for testing
    Example: node plonk-cli.js sample-inputs poseidon_test ./inputs

Available Circuits:
  - poseidon_test  : Poseidon hash verification (~150 constraints)
  - eddsa_verify   : EdDSA signature verification (~2,500 constraints)
  - merkle_proof   : Merkle tree membership proof (~4,000 constraints)

Environment:
  CIRCUITS_DIR: ${CIRCUITS_DIR}
  BUILD_DIR:    ${BUILD_DIR}
  PROOFS_DIR:   ${PROOFS_DIR}
  `);
}

// Main CLI handler
function main() {
  const args = process.argv.slice(2);
  
  if (args.length === 0) {
    showUsage();
    process.exit(0);
  }
  
  const command = args[0];
  
  switch (command) {
    case 'generate': {
      const circuit = args[1];
      const inputPath = args[2];
      const outputDir = args[3] || path.join(PROOFS_DIR, circuit);
      
      if (!circuit || !inputPath) {
        error('Usage: generate <circuit> <input> [output]');
      }
      
      generateProof(circuit, inputPath, outputDir);
      break;
    }
    
    case 'verify': {
      const circuit = args[1];
      const proofPath = args[2];
      const publicPath = args[3];
      
      if (!circuit || !proofPath) {
        error('Usage: verify <circuit> <proof> [public]');
      }
      
      verifyProof(circuit, proofPath, publicPath);
      break;
    }
    
    case 'export': {
      const circuit = args[1];
      
      if (!circuit) {
        error('Usage: export <circuit>');
      }
      
      exportVerificationKey(circuit);
      break;
    }
    
    case 'batch': {
      const circuit = args[1];
      const count = parseInt(args[2], 10);
      const inputsDir = args[3];
      
      if (!circuit || !count || !inputsDir) {
        error('Usage: batch <circuit> <count> <inputs-dir>');
      }
      
      generateBatchProofs(circuit, count, inputsDir);
      break;
    }
    
    case 'sample-inputs': {
      const circuit = args[1];
      const outputDir = args[2];
      
      if (!circuit || !outputDir) {
        error('Usage: sample-inputs <circuit> <output-dir>');
      }
      
      generateSampleInputs(circuit, outputDir);
      break;
    }
    
    case 'help':
    case '--help':
    case '-h':
      showUsage();
      break;
      
    default:
      error(`Unknown command: ${command}\n`);
      showUsage();
  }
}

main();
