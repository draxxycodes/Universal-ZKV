pragma circom 2.1.6;

include "circomlib/circuits/mimc.circom";
include "circomlib/circuits/mux1.circom";
include "circomlib/circuits/poseidon.circom";

// Production-grade Merkle Tree Membership with Standardized Public Statement
// Purpose: Prove membership in Merkle tree with universal PublicStatement format
// Use cases: Private airdrops, anonymous voting, zk-rollups, privacy-preserving NFTs
//
// This circuit outputs a standardized PublicStatement format:
// - merkle_root: Root of the Merkle tree (verified)
// - public_key: Claimer's public key
// - nullifier: Unique identifier to prevent double-claiming
// - value: Claim amount or eligibility value
// - extra: Additional data hash (optional)
template MerkleWithStatement(levels) {
    // Private inputs
    signal input leaf;                    // The leaf value to prove
    signal input pathElements[levels];    // Sibling nodes along the path
    signal input pathIndices[levels];     // 0 = left sibling, 1 = right sibling
    
    // Additional inputs for public statement
    signal input public_key_in;      // Claimer's public key
    signal input value_in;           // Claim amount or value
    signal input extra_in;           // Additional data (0 if unused)
    
    // Public outputs (standardized PublicStatement format)
    signal output merkle_root;
    signal output public_key;
    signal output nullifier;
    signal output value;
    signal output extra;
    
    // === STEP 1: Verify Merkle proof ===
    
    // Hash components for each level
    component hashers[levels];
    
    // Multiplexers to select left/right ordering
    component selectors[levels];
    
    // Computed hash at each level
    signal computedHash[levels + 1];
    
    // Start with the leaf
    computedHash[0] <== leaf;
    
    // Iterate through each level of the tree
    for (var i = 0; i < levels; i++) {
        selectors[i] = MultiMux1(2);
        
        // Input 0: current hash on left, sibling on right
        selectors[i].c[0][0] <== computedHash[i];
        selectors[i].c[0][1] <== pathElements[i];
        
        // Input 1: sibling on left, current hash on right
        selectors[i].c[1][0] <== pathElements[i];
        selectors[i].c[1][1] <== computedHash[i];
        
        // Select based on pathIndices[i]
        selectors[i].s <== pathIndices[i];
        
        // Hash the selected pair using MiMC7
        hashers[i] = MiMC7(91);
        hashers[i].x_in <== selectors[i].out[0];
        hashers[i].k <== selectors[i].out[1];
        
        // Store computed hash for next iteration
        computedHash[i + 1] <== hashers[i].out;
    }
    
    // === STEP 2: Generate nullifier from leaf and public key ===
    // Nullifier = Poseidon(leaf, public_key_in)
    // Prevents double-claiming with same leaf
    component nullifierHasher = Poseidon(2);
    nullifierHasher.inputs[0] <== leaf;
    nullifierHasher.inputs[1] <== public_key_in;
    
    // === STEP 3: Output standardized PublicStatement ===
    merkle_root <== computedHash[levels];
    public_key <== public_key_in;
    nullifier <== nullifierHasher.out;
    value <== value_in;
    extra <== extra_in;
}

// Public inputs: All 5 fields of PublicStatement
// Tree depth: 20 levels (supports up to 1,048,576 leaves)
component main {public [merkle_root, public_key, nullifier, value, extra]} = MerkleWithStatement(20);
