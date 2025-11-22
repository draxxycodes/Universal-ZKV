pragma circom 2.1.6;

include "circomlib/circuits/mimc.circom";
include "circomlib/circuits/mux1.circom";
include "circomlib/circuits/comparators.circom";

// Production-grade Merkle Tree Membership Proof Circuit
// Purpose: Prove that a leaf exists in a Merkle tree without revealing the leaf or path
// Use cases: Private airdrops, anonymous voting, zk-rollups, privacy-preserving NFTs
// Tree depth: 20 levels (supports up to 1,048,576 leaves)
template MerkleTreeChecker(levels) {
    // Private inputs
    signal input leaf;                    // The leaf value to prove
    signal input pathElements[levels];    // Sibling nodes along the path
    signal input pathIndices[levels];     // 0 = left sibling, 1 = right sibling
    
    // Public input
    signal input root;                    // Expected Merkle root
    
    // Output
    signal output valid;
    
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
        // Select left and right inputs based on pathIndices[i]
        // If pathIndices[i] == 0: pathElements[i] is right sibling
        //   -> hash(computedHash[i], pathElements[i])
        // If pathIndices[i] == 1: pathElements[i] is left sibling
        //   -> hash(pathElements[i], computedHash[i])
        
        selectors[i] = MultiMux1(2);
        
        // Input 0: current hash on left, sibling on right (pathIndices[i] = 0)
        selectors[i].c[0][0] <== computedHash[i];
        selectors[i].c[0][1] <== pathElements[i];
        
        // Input 1: sibling on left, current hash on right (pathIndices[i] = 1)
        selectors[i].c[1][0] <== pathElements[i];
        selectors[i].c[1][1] <== computedHash[i];
        
        // Select based on pathIndices[i]
        selectors[i].s <== pathIndices[i];
        
        // Hash the selected pair using MiMC7
        hashers[i] = MiMC7(91);
        hashers[i].x_in <== selectors[i].out[0];  // Left input
        hashers[i].k <== selectors[i].out[1];      // Right input (used as key)
        
        // Store computed hash for next iteration
        computedHash[i + 1] <== hashers[i].out;
    }
    
    // Verify that computed root matches expected root
    signal diff;
    diff <== computedHash[levels] - root;
    
    // Check if diff is zero
    component isZeroChecker = IsZero();
    isZeroChecker.in <== diff;
    
    valid <== isZeroChecker.out;
    
    // Additional constraint to ensure match
    // If valid=1, then diff must be 0
    // This is a redundant check but adds security
    0 === diff * (1 - valid);
}

// Main component: 20-level Merkle tree (1,048,576 max leaves)
// This is production-grade depth suitable for most applications
component main {public [root]} = MerkleTreeChecker(20);
