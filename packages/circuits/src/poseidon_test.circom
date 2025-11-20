pragma circom 2.1.6;

include "circomlib/circuits/poseidon.circom";
include "circomlib/circuits/comparators.circom";

// Production-grade Poseidon Hash Verification Circuit
// Purpose: Verify that a preimage hashes to an expected value
// Use cases: Privacy-preserving identity, commitment schemes, nullifiers
template PoseidonHashVerifier() {
    // Private inputs (preimage)
    signal input preimage[2];
    
    // Public inputs (expected hash for verification)
    signal input expectedHash;
    
    // Output: 1 if valid, 0 if invalid
    signal output valid;
    
    // Intermediate signals
    signal hash;
    signal diff;
    signal isZero;
    
    // Compute Poseidon hash of preimage
    component hasher = Poseidon(2);
    hasher.inputs[0] <== preimage[0];
    hasher.inputs[1] <== preimage[1];
    
    // Store hash result
    hash <== hasher.out;
    
    // Check if hash matches expectedHash
    // diff = hash - expectedHash
    diff <== hash - expectedHash;
    
    // If diff == 0, then hash == expectedHash
    // valid = (diff == 0) ? 1 : 0
    // Using constraint: diff * valid === 0
    // If diff != 0, valid must be 0
    // If diff == 0, valid can be 1
    
    component isZeroChecker = IsZero();
    isZeroChecker.in <== diff;
    
    valid <== isZeroChecker.out;
}

component main {public [expectedHash]} = PoseidonHashVerifier();
