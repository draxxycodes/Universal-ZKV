/**
 * Witness Generators for UZKV Test Circuits
 * 
 * Generates random witness data for:
 * - EdDSA signature verification
 * - Merkle tree membership proofs
 */

const crypto = require('crypto');
const { buildPoseidon } = require('circomlibjs');
const { buildBabyjub, buildEddsa, buildMimc7 } = require('circomlibjs');

/**
 * Generate random EdDSA signature witness
 * @returns {Object} Witness data for eddsa_verify circuit
 */
async function generateRandomEdDSAWitness() {
    const babyJub = await buildBabyjub();
    const eddsa = await buildEddsa();
    
    // Generate random private key (32 bytes)
    const prvKey = Buffer.from(crypto.randomBytes(32));
    
    // Derive public key
    const pubKey = eddsa.prv2pub(prvKey);
    
    // Generate random message
    const msg = babyJub.F.e(BigInt('0x' + crypto.randomBytes(32).toString('hex')));
    
    // Sign the message
    const signature = eddsa.signMiMC(prvKey, msg);
    
    return {
        Ax: babyJub.F.toObject(pubKey[0]).toString(),
        Ay: babyJub.F.toObject(pubKey[1]).toString(),
        S: signature.S.toString(),
        R8x: babyJub.F.toObject(signature.R8[0]).toString(),
        R8y: babyJub.F.toObject(signature.R8[1]).toString(),
        M: babyJub.F.toObject(msg).toString()
    };
}

/**
 * Generate random Merkle tree proof witness
 * @param {number} levels - Tree depth
 * @returns {Object} Witness data for merkle_proof circuit
 */
async function generateRandomMerkleWitness(levels) {
    const mimc7 = await buildMimc7();
    
    // Generate random leaf (ensure it's a valid field element)
    const leaf = mimc7.F.e(BigInt('0x' + crypto.randomBytes(32).toString('hex')));
    
    // Generate random path
    const pathElements = [];
    const pathIndices = [];
    
    let currentHash = leaf;
    
    for (let i = 0; i < levels; i++) {
        // Random sibling (ensure it's a valid field element)
        const sibling = mimc7.F.e(BigInt('0x' + crypto.randomBytes(32).toString('hex')));
        pathElements.push(mimc7.F.toObject(sibling).toString());
        
        // Random direction (0 = left, 1 = right)
        const direction = Math.random() < 0.5 ? 0 : 1;
        pathIndices.push(direction);
        
        // Compute parent hash using MiMC7
        const left = direction === 0 ? currentHash : sibling;
        const right = direction === 0 ? sibling : currentHash;
        
        // MiMC7 hash: mimc7(left, right)
        currentHash = mimc7.hash(left, right);
    }
    
    return {
        leaf: mimc7.F.toObject(leaf).toString(),
        pathElements: pathElements,
        pathIndices: pathIndices,
        root: mimc7.F.toObject(currentHash).toString()
    };
}

/**
 * Generate random Poseidon hash witness
 * @returns {Object} Witness data for poseidon_test circuit
 */
async function generateRandomPoseidonWitness() {
    const poseidon = await buildPoseidon();
    
    // Generate random preimages (mod field size to ensure valid field elements)
    const preimage0 = poseidon.F.e(BigInt('0x' + crypto.randomBytes(32).toString('hex')));
    const preimage1 = poseidon.F.e(BigInt('0x' + crypto.randomBytes(32).toString('hex')));
    
    // Compute expected hash
    const hash = poseidon([preimage0, preimage1]);
    const hashValue = poseidon.F.toObject(hash);
    
    return {
        preimage: [poseidon.F.toObject(preimage0).toString(), poseidon.F.toObject(preimage1).toString()],
        expectedHash: hashValue.toString()
    };
}

/**
 * Generate malformed witness (for invalid proof generation)
 * @param {Object} validWitness - Valid witness data
 * @param {string} circuitType - Circuit type (poseidon_test, eddsa_verify, merkle_proof)
 * @returns {Object} Malformed witness
 */
function generateMalformedWitness(validWitness, circuitType) {
    const corrupted = JSON.parse(JSON.stringify(validWitness));
    
    if (circuitType === 'poseidon_test') {
        // Corrupt the expected hash
        const hash = BigInt(corrupted.expectedHash);
        corrupted.expectedHash = (hash + BigInt(1)).toString();
    } else if (circuitType === 'eddsa_verify') {
        // Corrupt the signature
        const S = BigInt(corrupted.S);
        corrupted.S = (S + BigInt(1)).toString();
    } else if (circuitType === 'merkle_proof') {
        // Corrupt a random path element
        const idx = Math.floor(Math.random() * corrupted.pathElements.length);
        const elem = BigInt(corrupted.pathElements[idx]);
        corrupted.pathElements[idx] = (elem + BigInt(1)).toString();
    }
    
    return corrupted;
}

module.exports = {
    generateRandomEdDSAWitness,
    generateRandomMerkleWitness,
    generateRandomPoseidonWitness,
    generateMalformedWitness
};
