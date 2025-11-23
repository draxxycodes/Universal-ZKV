#!/usr/bin/env node
/**
 * Attest proofs on Arbitrum Sepolia
 * Supports Groth16, PLONK, and STARK proofs
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { execSync } = require('child_process');

// Load .env.sepolia
require('dotenv').config({ path: path.join(__dirname, '..', '.env.sepolia') });

const CIRCUITS_DIR = path.join(__dirname, '..', 'packages', 'circuits');
const DEPLOY_DIR = path.join(CIRCUITS_DIR, 'proofs', 'deployment');
const ATTESTATIONS_DIR = path.join(CIRCUITS_DIR, 'attestations');

// Ensure attestations directory exists
if (!fs.existsSync(ATTESTATIONS_DIR)) {
  fs.mkdirSync(ATTESTATIONS_DIR, { recursive: true });
}

// Configuration
const ATTESTOR_ADDRESS = process.env.ATTESTOR_CONTRACT || '0x36e937ebcf56c5dec6ecb0695001becc87738177';
const RPC_URL = process.env.ARB_SEPOLIA_RPC || 'https://arbitrum-sepolia-rpc.publicnode.com';
const PRIVATE_KEY = process.env.PRIVATE_KEY;

if (!PRIVATE_KEY) {
  console.error('❌ PRIVATE_KEY not found in .env.sepolia');
  process.exit(1);
}

console.log('=== Proof Attestation on Arbitrum Sepolia ===\n');
console.log(`📍 Attestor: ${ATTESTOR_ADDRESS}`);
console.log(`🌐 Network: Arbitrum Sepolia`);
console.log('─'.repeat(50));

if (!fs.existsSync(DEPLOY_DIR)) {
  console.error('\n❌ No deployment proofs found!');
  console.log('   Run: node scripts/generate-all-proofs.cjs');
  process.exit(1);
}

const proofFiles = fs.readdirSync(DEPLOY_DIR);
const attestations = [];
let successCount = 0;
let failedCount = 0;

// Helper: Calculate proof hash
function calculateProofHash(proofData) {
  const dataStr = JSON.stringify(proofData);
  return crypto.createHash('sha256').update(dataStr).digest('hex');
}

// Helper: Attest proof on-chain
function attestProof(proofHash, circuit, proofType) {
  try {
    console.log(`   📤 Submitting to Attestor...`);
    
    const command = `cast send ${ATTESTOR_ADDRESS} "attestProof(bytes32)" 0x${proofHash} --rpc-url ${RPC_URL} --private-key ${PRIVATE_KEY} --legacy`;
    
    const result = execSync(command, { encoding: 'utf8' });
    
    // Extract transaction hash
    const txHashMatch = result.match(/transactionHash\s+(.+)/);
    const txHash = txHashMatch ? txHashMatch[1].trim() : 'unknown';
    
    console.log(`   ✅ Attested! TX: ${txHash}`);
    console.log(`   🔗 https://sepolia.arbiscan.io/tx/${txHash}`);
    
    return { success: true, txHash };
    
  } catch (error) {
    // Check if proof is already attested (which is actually a success case)
    if (error.message.includes('50726f6f6620616c7265616479206174746573746564')) {
      console.log(`   ℹ️  Already attested (skipped)`);
      return { success: true, txHash: 'already-attested', skipped: true };
    }
    console.log(`   ❌ Attestation failed: ${error.message}`);
    return { success: false, error: error.message };
  }
}

// 1. Attest Groth16 proofs
const groth16Proofs = proofFiles.filter(f => f.includes('groth16_proof.json'));

if (groth16Proofs.length > 0) {
  console.log('\n📦 Attesting Groth16 Proofs:');
  console.log('─'.repeat(50));
  
  for (const proofFile of groth16Proofs) {
    const circuit = proofFile.replace('_groth16_proof.json', '');
    console.log(`\n🔄 ${circuit}:`);
    
    try {
      const proofPath = path.join(DEPLOY_DIR, proofFile);
      const publicPath = proofPath.replace('_proof.json', '_public.json');
      
      const proof = JSON.parse(fs.readFileSync(proofPath, 'utf8'));
      const publicInputs = JSON.parse(fs.readFileSync(publicPath, 'utf8'));
      
      const proofHash = calculateProofHash({ proof, publicInputs });
      console.log(`   🔑 Proof hash: 0x${proofHash.substring(0, 16)}...`);
      
      const result = attestProof(proofHash, circuit, 'groth16');
      
      if (result.success) {
        attestations.push({
          circuit,
          proofType: 'groth16',
          proofHash: `0x${proofHash}`,
          txHash: result.txHash,
          timestamp: new Date().toISOString()
        });
        successCount++;
      } else {
        failedCount++;
      }
      
      // Wait 2 seconds between transactions
      if (groth16Proofs.indexOf(proofFile) < groth16Proofs.length - 1) {
        execSync('sleep 2');
      }
      
    } catch (error) {
      console.log(`   ❌ Error: ${error.message}`);
      failedCount++;
    }
  }
}

// 2. Attest PLONK proofs
const plonkProofs = proofFiles.filter(f => f.includes('plonk_proof.json'));

if (plonkProofs.length > 0) {
  console.log('\n\n📦 Attesting PLONK Proofs:');
  console.log('─'.repeat(50));
  
  for (const proofFile of plonkProofs) {
    const circuit = proofFile.replace('_plonk_proof.json', '');
    console.log(`\n🔄 ${circuit}:`);
    
    try {
      const proofPath = path.join(DEPLOY_DIR, proofFile);
      const publicPath = proofPath.replace('_proof.json', '_public.json');
      
      const proof = JSON.parse(fs.readFileSync(proofPath, 'utf8'));
      const publicInputs = JSON.parse(fs.readFileSync(publicPath, 'utf8'));
      
      const proofHash = calculateProofHash({ proof, publicInputs });
      console.log(`   🔑 Proof hash: 0x${proofHash.substring(0, 16)}...`);
      
      const result = attestProof(proofHash, circuit, 'plonk');
      
      if (result.success) {
        attestations.push({
          circuit,
          proofType: 'plonk',
          proofHash: `0x${proofHash}`,
          txHash: result.txHash,
          timestamp: new Date().toISOString()
        });
        successCount++;
      } else {
        failedCount++;
      }
      
      // Wait 2 seconds between transactions
      if (plonkProofs.indexOf(proofFile) < plonkProofs.length - 1) {
        execSync('sleep 2');
      }
      
    } catch (error) {
      console.log(`   ❌ Error: ${error.message}`);
      failedCount++;
    }
  }
}

// 3. Attest STARK proofs
const starkProofs = proofFiles.filter(f => f.endsWith('_stark_proof.ub'));

function calculateBufferHash(buf) {
  return crypto.createHash('sha256').update(buf).digest('hex');
}

if (starkProofs.length > 0) {
  console.log('\n\n📦 Attesting STARK Proofs:');
  console.log('─'.repeat(50));
  
  for (const proofFile of starkProofs) {
    const circuit = proofFile.replace('_stark_proof.ub', '');
    console.log(`\n🔄 ${circuit}:`);
    
    try {
      const proofPath = path.join(DEPLOY_DIR, proofFile);
      const proofBuf = fs.readFileSync(proofPath);
      
      const proofHash = calculateBufferHash(proofBuf);
      console.log(`   🔑 Proof hash: 0x${proofHash.substring(0, 16)}...`);
      
      const result = attestProof(proofHash, circuit, 'stark');
      
      if (result.success) {
        attestations.push({
          circuit,
          proofType: 'stark',
          proofHash: `0x${proofHash}`,
          txHash: result.txHash,
          timestamp: new Date().toISOString()
        });
        successCount++;
      } else {
        failedCount++;
      }
      
      // Wait 2 seconds between transactions
      if (starkProofs.indexOf(proofFile) < starkProofs.length - 1) {
        execSync('sleep 2');
      }
      
    } catch (error) {
      console.log(`   ❌ Error: ${error.message}`);
      failedCount++;
    }
  }
}

// Save attestation summary
const summaryPath = path.join(ATTESTATIONS_DIR, 'attestation-summary.json');
fs.writeFileSync(summaryPath, JSON.stringify({
  network: 'Arbitrum Sepolia',
  attestor: ATTESTOR_ADDRESS,
  timestamp: new Date().toISOString(),
  attestations,
  summary: {
    total: successCount + failedCount,
    successful: successCount,
    failed: failedCount
  }
}, null, 2));

// Summary
console.log('\n\n=== Attestation Summary ===');
console.log('─'.repeat(50));
console.log(`\n✅ Successful: ${successCount}`);
console.log(`❌ Failed: ${failedCount}`);
console.log(`\n📊 Total attestations: ${successCount + failedCount}`);
console.log(`\n📁 Summary saved: ${summaryPath}`);

if (successCount > 0) {
  console.log('\n🎉 Proofs attested on Arbitrum Sepolia!');
  console.log(`\n🔗 View Attestor: https://sepolia.arbiscan.io/address/${ATTESTOR_ADDRESS}`);
}

process.exit(failedCount > 0 ? 1 : 0);
