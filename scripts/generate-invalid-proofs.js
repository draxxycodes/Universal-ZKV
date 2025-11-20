#!/usr/bin/env node
/**
 * Invalid Proof Generation Script for UZKV Test Circuits
 * 
 * Generates malformed/invalid proofs for negative testing.
 * 
 * Usage:
 *   node scripts/generate-invalid-proofs.js [count] [circuits...]
 * 
 * Examples:
 *   node scripts/generate-invalid-proofs.js                     # Generate 1,000 invalid proofs for all circuits
 *   node scripts/generate-invalid-proofs.js 100                 # Generate 100 invalid proofs for all circuits
 *   node scripts/generate-invalid-proofs.js 100 poseidon_test  # Generate 100 invalid proofs for Poseidon only
 */

const snarkjs = require('snarkjs');
const fs = require('fs');
const path = require('path');
const { generateMalformedWitness } = require('./witness-generators');
const { generateProof, generateWitness } = require('./generate-test-proofs');

// Configuration
const DEFAULT_COUNT = 1000;
const CIRCUITS = ['poseidon_test', 'eddsa_verify', 'merkle_proof'];
const BASE_DIR = path.join(__dirname, '..', 'packages', 'circuits');
const PROOFS_DIR = path.join(BASE_DIR, 'proofs');

// Statistics
const stats = {
    startTime: Date.now(),
    totalProofs: 0,
    successCount: 0,
    errorCount: 0,
    byCircuit: {},
    corruptionTypes: {
        witness: 0,      // Corrupted witness (valid proof of invalid statement)
        proof_pi_a: 0,   // Corrupted pi_a coordinate
        proof_pi_b: 0,   // Corrupted pi_b coordinate
        proof_pi_c: 0,   // Corrupted pi_c coordinate
        public: 0        // Corrupted public signals
    }
};

/**
 * Corrupt a valid proof by modifying proof elements
 * @param {Object} proof - Valid Groth16 proof
 * @param {string} corruptionType - Type of corruption (pi_a, pi_b, pi_c)
 * @returns {Object} Corrupted proof
 */
function corruptProof(proof, corruptionType = null) {
    const corrupted = JSON.parse(JSON.stringify(proof));
    
    // Randomly select corruption type if not specified
    const types = ['pi_a', 'pi_b', 'pi_c'];
    const type = corruptionType || types[Math.floor(Math.random() * types.length)];
    
    // Determine which coordinate to corrupt
    let coordIndex;
    if (type === 'pi_a' || type === 'pi_c') {
        coordIndex = Math.floor(Math.random() * 3); // G1 points have 3 coordinates [x, y, z]
    } else if (type === 'pi_b') {
        coordIndex = Math.floor(Math.random() * 3); // G2 points have 3 coordinates [x, y, z]
        const subIndex = Math.floor(Math.random() * 2); // Each coordinate has 2 elements
        
        // Corrupt G2 point (nested array structure)
        const value = BigInt(corrupted[type][coordIndex][subIndex]);
        corrupted[type][coordIndex][subIndex] = (value + BigInt(1)).toString();
        
        stats.corruptionTypes[`proof_${type}`]++;
        return corrupted;
    }
    
    // Corrupt G1 point
    const value = BigInt(corrupted[type][coordIndex]);
    corrupted[type][coordIndex] = (value + BigInt(1)).toString();
    
    stats.corruptionTypes[`proof_${type}`]++;
    return corrupted;
}

/**
 * Corrupt public signals
 * @param {Array} publicSignals - Valid public signals
 * @returns {Array} Corrupted public signals
 */
function corruptPublicSignals(publicSignals) {
    const corrupted = [...publicSignals];
    const index = Math.floor(Math.random() * corrupted.length);
    const value = BigInt(corrupted[index]);
    corrupted[index] = (value + BigInt(1)).toString();
    
    stats.corruptionTypes.public++;
    return corrupted;
}

/**
 * Generate a single invalid proof
 * @param {string} circuit - Circuit name
 * @param {number} id - Proof ID
 * @param {string} method - Method: 'witness', 'proof', 'public'
 */
async function generateInvalidProof(circuit, id, method = null) {
    const methods = ['witness', 'proof', 'public'];
    const selectedMethod = method || methods[Math.floor(Math.random() * methods.length)];
    
    try {
        let proof, publicSignals, witness;
        
        if (selectedMethod === 'witness') {
            // Generate proof from malformed witness (valid proof of invalid statement)
            const validWitness = await generateWitness(circuit);
            witness = generateMalformedWitness(validWitness, circuit);
            
            const result = await generateProof(circuit, witness, `invalid_${id}`);
            proof = result.proof;
            publicSignals = result.publicSignals;
            
            stats.corruptionTypes.witness++;
        } else {
            // Generate valid proof first, then corrupt it
            witness = await generateWitness(circuit);
            const result = await generateProof(circuit, witness, `temp_${id}`);
            
            if (selectedMethod === 'proof') {
                proof = corruptProof(result.proof);
                publicSignals = result.publicSignals;
            } else { // 'public'
                proof = result.proof;
                publicSignals = corruptPublicSignals(result.publicSignals);
            }
            
            // Delete temporary valid proof files
            const tempProofPath = path.join(PROOFS_DIR, circuit, 'valid', `${circuit}_temp_${id}_proof.json`);
            const tempPublicPath = path.join(PROOFS_DIR, circuit, 'valid', `${circuit}_temp_${id}_public.json`);
            const tempWitnessPath = path.join(PROOFS_DIR, circuit, 'valid', `${circuit}_temp_${id}_witness.json`);
            
            if (fs.existsSync(tempProofPath)) fs.unlinkSync(tempProofPath);
            if (fs.existsSync(tempPublicPath)) fs.unlinkSync(tempPublicPath);
            if (fs.existsSync(tempWitnessPath)) fs.unlinkSync(tempWitnessPath);
        }
        
        // Save invalid proof
        const proofPath = path.join(PROOFS_DIR, circuit, 'invalid', `${circuit}_invalid_${id}_proof.json`);
        fs.writeFileSync(proofPath, JSON.stringify(proof, null, 2));
        
        // Save public signals
        const publicPath = path.join(PROOFS_DIR, circuit, 'invalid', `${circuit}_invalid_${id}_public.json`);
        fs.writeFileSync(publicPath, JSON.stringify(publicSignals, null, 2));
        
        // Save metadata
        const metadataPath = path.join(PROOFS_DIR, circuit, 'invalid', `${circuit}_invalid_${id}_metadata.json`);
        fs.writeFileSync(metadataPath, JSON.stringify({
            id,
            circuit,
            corruptionMethod: selectedMethod,
            timestamp: new Date().toISOString()
        }, null, 2));
        
        stats.successCount++;
        stats.totalProofs++;
        
    } catch (error) {
        console.error(`\n❌ Error generating invalid proof ${id} for ${circuit}:`, error.message);
        stats.errorCount++;
        throw error;
    }
}

/**
 * Generate invalid proofs for a single circuit
 * @param {string} circuit - Circuit name
 * @param {number} count - Number of invalid proofs to generate
 */
async function generateInvalidProofsForCircuit(circuit, count) {
    console.log(`\n${'='.repeat(60)}`);
    console.log(`⚠️  Generating ${count} INVALID proofs for ${circuit}`);
    console.log(`${'='.repeat(60)}\n`);
    
    stats.byCircuit[circuit] = {
        startTime: Date.now(),
        count: 0,
        errors: 0
    };
    
    const batchSize = 50; // Smaller batches for invalid proofs
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
                await generateInvalidProof(circuit, i);
                
                batchSuccess++;
                stats.byCircuit[circuit].count++;
                
                // Progress indicator (every 5 proofs)
                if ((i - batchStart) % 5 === 4) {
                    process.stdout.write('x');
                }
            } catch (error) {
                batchErrors++;
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
    console.log(`✅ ${circuit} complete: ${stats.byCircuit[circuit].count} invalid proofs in ${circuitTime}s`);
    console.log(`${'='.repeat(60)}`);
}

/**
 * Main invalid proof generation workflow
 */
async function generateInvalidProofDataset() {
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
    console.log(`⚠️  UZKV Invalid Proof Generation (Negative Testing)`);
    console.log(`${'='.repeat(60)}`);
    console.log(`📋 Configuration:`);
    console.log(`   Invalid proofs per circuit: ${count.toLocaleString()}`);
    console.log(`   Circuits: ${selectedCircuits.join(', ')}`);
    console.log(`   Total invalid proofs: ${(count * selectedCircuits.length).toLocaleString()}`);
    console.log(`   Output: ${PROOFS_DIR}/<circuit>/invalid/`);
    console.log(`${'='.repeat(60)}\n`);
    
    // Generate invalid proofs for each circuit
    for (const circuit of selectedCircuits) {
        try {
            await generateInvalidProofsForCircuit(circuit, count);
        } catch (error) {
            console.error(`\n❌ Fatal error in ${circuit}:`, error);
            process.exit(1);
        }
    }
    
    // Final statistics
    const totalTime = ((Date.now() - stats.startTime) / 1000).toFixed(2);
    const avgTime = (parseFloat(totalTime) / stats.totalProofs).toFixed(3);
    
    console.log(`\n${'='.repeat(60)}`);
    console.log(`🎉 INVALID PROOF GENERATION COMPLETE`);
    console.log(`${'='.repeat(60)}`);
    console.log(`📊 Statistics:`);
    console.log(`   Total invalid proofs: ${stats.totalProofs.toLocaleString()}`);
    console.log(`   Successful: ${stats.successCount.toLocaleString()}`);
    console.log(`   Errors: ${stats.errorCount.toLocaleString()}`);
    console.log(`   Total time: ${totalTime}s (${(parseFloat(totalTime) / 60).toFixed(2)} minutes)`);
    console.log(`   Avg time: ${avgTime}s per proof`);
    console.log(`\n📊 Corruption Methods:`);
    console.log(`   Witness corruption: ${stats.corruptionTypes.witness}`);
    console.log(`   Proof pi_a corruption: ${stats.corruptionTypes.proof_pi_a}`);
    console.log(`   Proof pi_b corruption: ${stats.corruptionTypes.proof_pi_b}`);
    console.log(`   Proof pi_c corruption: ${stats.corruptionTypes.proof_pi_c}`);
    console.log(`   Public signal corruption: ${stats.corruptionTypes.public}`);
    console.log(`\n📂 Invalid proof files saved to:`);
    
    for (const circuit of selectedCircuits) {
        const circuitDir = path.join(PROOFS_DIR, circuit, 'invalid');
        const fileCount = fs.readdirSync(circuitDir).length;
        console.log(`   ${circuit}: ${fileCount} files in ${circuitDir}`);
    }
    
    console.log(`${'='.repeat(60)}\n`);
    
    // Write summary report
    const summaryPath = path.join(PROOFS_DIR, 'invalid-generation-summary.json');
    const summary = {
        timestamp: new Date().toISOString(),
        configuration: {
            invalidProofsPerCircuit: count,
            circuits: selectedCircuits,
            totalInvalidProofs: count * selectedCircuits.length
        },
        statistics: {
            totalProofs: stats.totalProofs,
            successCount: stats.successCount,
            errorCount: stats.errorCount,
            totalTimeSeconds: parseFloat(totalTime),
            avgTimePerProof: parseFloat(avgTime)
        },
        corruptionTypes: stats.corruptionTypes,
        byCircuit: stats.byCircuit
    };
    
    fs.writeFileSync(summaryPath, JSON.stringify(summary, null, 2));
    console.log(`📄 Summary report: ${summaryPath}\n`);
}

// Run the script
if (require.main === module) {
    generateInvalidProofDataset().catch((error) => {
        console.error('\n❌ Fatal error:', error);
        process.exit(1);
    });
}

module.exports = { generateInvalidProof, corruptProof, corruptPublicSignals };
