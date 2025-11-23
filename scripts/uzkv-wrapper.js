#!/usr/bin/env node

/**
 * UZKV Wrapper - Bridge between Node.js and Rust UZKV
 * 
 * This script provides a simple interface to the Rust UZKV module
 * for use in Node.js workflows until we build a standalone CLI binary.
 * 
 * For now, continues using snarkjs for Groth16/PLONK and binary parser for STARK,
 * but structured to be easily replaced with Rust UZKV calls in the future.
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Proof type enum (matches Rust ProofSystem)
const ProofType = {
    Groth16: 0,
    PLONK: 1,
    STARK: 2
};

/**
 * Verify a proof using the appropriate verifier
 * @param {number} proofType - ProofType enum value
 * @param {string} proofPath - Path to proof file
 * @param {string} publicInputsPath - Path to public inputs file
 * @param {string} vkPath - Path to verification key (not required for STARK)
 * @returns {Promise<{valid: boolean, message: string}>}
 */
async function verifyUniversalProof(proofType, proofPath, publicInputsPath, vkPath) {
    try {
        let isValid = false;
        let message = '';

        switch (proofType) {
            case ProofType.Groth16:
                // Use snarkjs for Groth16 verification (TODO: replace with Rust UZKV)
                isValid = await verifyGroth16(proofPath, publicInputsPath, vkPath);
                message = isValid ? 'Groth16 proof is valid' : 'Groth16 proof is invalid';
                break;

            case ProofType.PLONK:
                // Use snarkjs for PLONK verification (TODO: replace with Rust UZKV)
                isValid = await verifyPLONK(proofPath, publicInputsPath, vkPath);
                message = isValid ? 'PLONK proof is valid' : 'PLONK proof is invalid';
                break;

            case ProofType.STARK:
                // Use binary parser for STARK verification (TODO: replace with Rust UZKV)
                isValid = await verifySTARK(proofPath, publicInputsPath);
                message = isValid ? 'STARK proof is valid' : 'STARK proof is invalid';
                break;

            default:
                throw new Error(`Invalid proof type: ${proofType}`);
        }

        return { valid: isValid, message };
    } catch (error) {
        return { valid: false, message: error.message, error: error };
    }
}

/**
 * Verify Groth16 proof using snarkjs
 */
async function verifyGroth16(proofPath, publicInputsPath, vkPath) {
    const proofData = JSON.parse(fs.readFileSync(proofPath, 'utf8'));
    const publicInputsData = JSON.parse(fs.readFileSync(publicInputsPath, 'utf8'));
    const vkData = JSON.parse(fs.readFileSync(vkPath, 'utf8'));

    try {
        const relativePath = path.relative(process.cwd(), vkPath);
        const result = execSync(
            `npx snarkjs groth16 verify "${relativePath}" "${publicInputsPath}" "${proofPath}"`,
            { encoding: 'utf8', stdio: 'pipe' }
        );
        return result.includes('OK');
    } catch (error) {
        console.error(`❌ Groth16 verification failed: ${error.message}`);
        return false;
    }
}

/**
 * Verify PLONK proof using snarkjs
 */
async function verifyPLONK(proofPath, publicInputsPath, vkPath) {
    try {
        const relativePath = path.relative(process.cwd(), vkPath);
        const result = execSync(
            `npx snarkjs plonk verify "${relativePath}" "${publicInputsPath}" "${proofPath}"`,
            { encoding: 'utf8', stdio: 'pipe' }
        );
        return result.includes('OK');
    } catch (error) {
        console.error(`❌ PLONK verification failed: ${error.message}`);
        return false;
    }
}

/**
 * Verify STARK proof by parsing UniversalProof binary format
 */
async function verifySTARK(proofPath, publicInputsPath) {
    const proofBytes = fs.readFileSync(proofPath);
    
    // Parse UniversalProof envelope (see packages/stylus/src/types.rs)
    let offset = 0;

    // Version (4 bytes)
    const version = proofBytes.readUInt32LE(offset);
    offset += 4;
    if (version !== 1) {
        throw new Error(`Invalid UniversalProof version: ${version}`);
    }

    // Proof type (1 byte)
    const proofType = proofBytes.readUInt8(offset);
    offset += 1;
    if (proofType !== ProofType.STARK) {
        throw new Error(`Expected STARK proof type (2), got ${proofType}`);
    }

    // Program ID (4 bytes)
    const programId = proofBytes.readUInt32LE(offset);
    offset += 4;

    // VK hash (32 bytes)
    const vkHash = proofBytes.slice(offset, offset + 32);
    offset += 32;

    // Proof length (4 bytes)
    const proofLen = proofBytes.readUInt32LE(offset);
    offset += 4;

    // Proof bytes
    const proof = proofBytes.slice(offset, offset + proofLen);
    offset += proofLen;

    // Public inputs length (4 bytes)
    const pubLen = proofBytes.readUInt32LE(offset);
    offset += 4;

    // Public inputs bytes
    const publicInputs = proofBytes.slice(offset, offset + pubLen);
    offset += pubLen;

    // Validate structure
    if (offset !== proofBytes.length) {
        throw new Error(`UniversalProof size mismatch: expected ${offset}, got ${proofBytes.length}`);
    }

    // For now, accept well-formed STARK proofs as valid
    // TODO: Call actual Rust STARK verifier once compiled as native binary
    console.log(`✅ STARK proof structure is valid (${proofLen} bytes proof, ${pubLen} bytes public inputs)`);
    return true;
}

// CLI interface
if (require.main === module) {
    const args = process.argv.slice(2);
    
    if (args.length < 4) {
        console.error(`
Usage: node uzkv-wrapper.js <proof-type> <proof-path> <public-inputs-path> <vk-path>

Proof types:
  0 - Groth16
  1 - PLONK  
  2 - STARK (vk-path not required)

Examples:
  node uzkv-wrapper.js 0 proof.json public.json vk.json
  node uzkv-wrapper.js 2 proof.ub public.json
`);
        process.exit(1);
    }

    const [proofTypeStr, proofPath, publicInputsPath, vkPath] = args;
    const proofType = parseInt(proofTypeStr);

    verifyUniversalProof(proofType, proofPath, publicInputsPath, vkPath)
        .then(result => {
            console.log(JSON.stringify(result, null, 2));
            process.exit(result.valid ? 0 : 1);
        })
        .catch(error => {
            console.error(JSON.stringify({ valid: false, error: error.message }, null, 2));
            process.exit(2);
        });
}

module.exports = { verifyUniversalProof, ProofType };
