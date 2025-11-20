#!/usr/bin/env node
/**
 * Mass Proof Generation Script for UZKV Test Circuits
 * 
 * Generates 10,000+ valid proofs per circuit for comprehensive testing.
 * 
 * Usage:
 *   node scripts/generate-test-proofs.js [count] [circuits...]
 * 
 * Examples:
 *   node scripts/generate-test-proofs.js                        # Generate 10,000 proofs for all circuits
 *   node scripts/generate-test-proofs.js 100                    # Generate 100 proofs for all circuits
 *   node scripts/generate-test-proofs.js 100 poseidon_test     # Generate 100 proofs for Poseidon only
 */

const snarkjs = require('snarkjs');
const fs = require('fs');
const path = require('path');
const {
    generateRandomEdDSAWitness,
    generateRandomMerkleWitness,
    generateRandomPoseidonWitness
} = require('./witness-generators');

// Configuration
const DEFAULT_COUNT = 10000;
const CIRCUITS = ['poseidon_test', 'eddsa_verify', 'merkle_proof'];
const BASE_DIR = path.join(__dirname, '..', 'packages', 'circuits');
const BUILD_DIR = path.join(BASE_DIR, 'build');
const PROOFS_DIR = path.join(BASE_DIR, 'proofs');

// Statistics tracking
const stats = {
    startTime: Date.now(),
    totalProofs: 0,
    successCount: 0,
    errorCount: 0,
    byCircuit: {}
};

/**
 * Generate a single proof for a circuit
 * @param {string} circuit - Circuit name
 * @param {Object} witness - Witness input data
 * @param {number} id - Proof ID
 * @returns {Promise<{proof: Object, publicSignals: Array}>}
 */
async function generateProof(circuit, witness, id) {
    const wasmFile = path.join(BUILD_DIR, `${circuit}_js`, `${circuit}.wasm`);
    
    // Map circuit names to zkey file base names
    const zkeyMap = {
        'poseidon_test': 'poseidon',
        'eddsa_verify': 'eddsa',
        'merkle_proof': 'merkle'
    };
    const zkeyBase = zkeyMap[circuit] || circuit;
    const zkeyFile = path.join(BUILD_DIR, `${zkeyBase}_beacon.zkey`);
    
    // Verify files exist
    if (!fs.existsSync(wasmFile)) {
        throw new Error(`WASM file not found: ${wasmFile}`);
    }
    if (!fs.existsSync(zkeyFile)) {
        throw new Error(`zkey file not found: ${zkeyFile}`);
    }
    
    try {
        // Generate proof using snarkjs
        const { proof, publicSignals } = await snarkjs.groth16.fullProve(
            witness,
            wasmFile,
            zkeyFile
        );
        
        // Save proof
        const proofPath = path.join(PROOFS_DIR, circuit, 'valid', `${circuit}_${id}_proof.json`);
        fs.writeFileSync(proofPath, JSON.stringify(proof, null, 2));
        
        // Save public signals
        const publicPath = path.join(PROOFS_DIR, circuit, 'valid', `${circuit}_${id}_public.json`);
        fs.writeFileSync(publicPath, JSON.stringify(publicSignals, null, 2));
        
        // Save witness (for debugging)
        const witnessPath = path.join(PROOFS_DIR, circuit, 'valid', `${circuit}_${id}_witness.json`);
        fs.writeFileSync(witnessPath, JSON.stringify(witness, null, 2));
        
        return { proof, publicSignals };
    } catch (error) {
        console.error(`\n❌ Error generating proof ${id} for ${circuit}:`, error.message);
        throw error;
    }
}

/**
 * Generate witness data based on circuit type
 * @param {string} circuit - Circuit name
 * @returns {Promise<Object>} Witness data
 */
async function generateWitness(circuit) {
    switch (circuit) {
        case 'poseidon_test':
            return await generateRandomPoseidonWitness();
        
        case 'eddsa_verify':
            return await generateRandomEdDSAWitness();
        
        case 'merkle_proof':
            return await generateRandomMerkleWitness(20); // 20 levels
        
        default:
            throw new Error(`Unknown circuit: ${circuit}`);
    }
}

/**
 * Generate proofs for a single circuit
 * @param {string} circuit - Circuit name
 * @param {number} count - Number of proofs to generate
 */
async function generateProofsForCircuit(circuit, count) {
    console.log(`\n${'='.repeat(60)}`);
    console.log(`📊 Generating ${count} proofs for ${circuit}`);
    console.log(`${'='.repeat(60)}\n`);
    
    stats.byCircuit[circuit] = {
        startTime: Date.now(),
        count: 0,
        errors: 0
    };
    
    const batchSize = 100;
    const totalBatches = Math.ceil(count / batchSize);
    
    for (let batch = 0; batch < totalBatches; batch++) {
        const batchStart = batch * batchSize;
        const batchEnd = Math.min(batchStart + batchSize, count);
        const batchCount = batchEnd - batchStart;
        
        console.log(`\n📦 Batch ${batch + 1}/${totalBatches} (proofs ${batchStart}-${batchEnd - 1})`);
        
        const batchStartTime = Date.now();
        let batchSuccess = 0;
        let batchErrors = 0;
        
        for (let i = batchStart; i < batchEnd; i++) {
            try {
                // Generate witness
                const witness = await generateWitness(circuit);
                
                // Generate proof
                await generateProof(circuit, witness, i);
                
                batchSuccess++;
                stats.successCount++;
                stats.totalProofs++;
                stats.byCircuit[circuit].count++;
                
                // Progress indicator (every 10 proofs)
                if ((i - batchStart) % 10 === 9) {
                    process.stdout.write('.');
                }
            } catch (error) {
                batchErrors++;
                stats.errorCount++;
                stats.byCircuit[circuit].errors++;
            }
        }
        
        const batchTime = ((Date.now() - batchStartTime) / 1000).toFixed(2);
        const proofsPerSec = (batchCount / parseFloat(batchTime)).toFixed(2);
        
        console.log(`\n  ✅ Success: ${batchSuccess}/${batchCount}`);
        console.log(`  ⏱️  Time: ${batchTime}s (${proofsPerSec} proofs/sec)`);
        
        if (batchErrors > 0) {
            console.log(`  ❌ Errors: ${batchErrors}`);
        }
    }
    
    const circuitTime = ((Date.now() - stats.byCircuit[circuit].startTime) / 1000).toFixed(2);
    console.log(`\n${'='.repeat(60)}`);
    console.log(`✅ ${circuit} complete: ${stats.byCircuit[circuit].count} proofs in ${circuitTime}s`);
    console.log(`${'='.repeat(60)}`);
}

/**
 * Main proof generation workflow
 */
async function generateProofDataset() {
    // Parse command line arguments
    const args = process.argv.slice(2);
    const count = args.length > 0 && !isNaN(args[0]) ? parseInt(args[0]) : DEFAULT_COUNT;
    const selectedCircuits = args.length > 1 ? args.slice(1) : CIRCUITS;
    
    // Validate circuit names
    for (const circuit of selectedCircuits) {
        if (!CIRCUITS.includes(circuit)) {
            console.error(`❌ Unknown circuit: ${circuit}`);
            console.error(`   Valid circuits: ${CIRCUITS.join(', ')}`);
            process.exit(1);
        }
    }
    
    console.log(`\n${'='.repeat(60)}`);
    console.log(`🚀 UZKV Mass Proof Generation`);
    console.log(`${'='.repeat(60)}`);
    console.log(`📋 Configuration:`);
    console.log(`   Proofs per circuit: ${count.toLocaleString()}`);
    console.log(`   Circuits: ${selectedCircuits.join(', ')}`);
    console.log(`   Total proofs: ${(count * selectedCircuits.length).toLocaleString()}`);
    console.log(`   Output: ${PROOFS_DIR}`);
    console.log(`${'='.repeat(60)}\n`);
    
    // Verify build directory exists
    if (!fs.existsSync(BUILD_DIR)) {
        console.error(`❌ Build directory not found: ${BUILD_DIR}`);
        console.error(`   Run 'circom' compilation first (Task 3.5.3)`);
        process.exit(1);
    }
    
    // Generate proofs for each circuit
    for (const circuit of selectedCircuits) {
        try {
            await generateProofsForCircuit(circuit, count);
        } catch (error) {
            console.error(`\n❌ Fatal error in ${circuit}:`, error);
            process.exit(1);
        }
    }
    
    // Final statistics
    const totalTime = ((Date.now() - stats.startTime) / 1000).toFixed(2);
    const avgTime = (parseFloat(totalTime) / stats.totalProofs).toFixed(3);
    
    console.log(`\n${'='.repeat(60)}`);
    console.log(`🎉 PROOF GENERATION COMPLETE`);
    console.log(`${'='.repeat(60)}`);
    console.log(`📊 Statistics:`);
    console.log(`   Total proofs: ${stats.totalProofs.toLocaleString()}`);
    console.log(`   Successful: ${stats.successCount.toLocaleString()}`);
    console.log(`   Errors: ${stats.errorCount.toLocaleString()}`);
    console.log(`   Total time: ${totalTime}s (${(parseFloat(totalTime) / 60).toFixed(2)} minutes)`);
    console.log(`   Avg time: ${avgTime}s per proof`);
    console.log(`\n📂 Proof files saved to:`);
    
    for (const circuit of selectedCircuits) {
        const circuitDir = path.join(PROOFS_DIR, circuit, 'valid');
        const fileCount = fs.readdirSync(circuitDir).length;
        console.log(`   ${circuit}: ${fileCount} files in ${circuitDir}`);
    }
    
    console.log(`${'='.repeat(60)}\n`);
    
    // Write summary report
    const summaryPath = path.join(PROOFS_DIR, 'generation-summary.json');
    const summary = {
        timestamp: new Date().toISOString(),
        configuration: {
            proofsPerCircuit: count,
            circuits: selectedCircuits,
            totalProofs: count * selectedCircuits.length
        },
        statistics: {
            totalProofs: stats.totalProofs,
            successCount: stats.successCount,
            errorCount: stats.errorCount,
            totalTimeSeconds: parseFloat(totalTime),
            avgTimePerProof: parseFloat(avgTime)
        },
        byCircuit: stats.byCircuit
    };
    
    fs.writeFileSync(summaryPath, JSON.stringify(summary, null, 2));
    console.log(`📄 Summary report: ${summaryPath}\n`);
}

// Run the script
if (require.main === module) {
    generateProofDataset().catch((error) => {
        console.error('\n❌ Fatal error:', error);
        process.exit(1);
    });
}

module.exports = { generateProof, generateWitness, generateProofsForCircuit };
