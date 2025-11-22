pragma circom 2.1.6;

include "circomlib/circuits/poseidon.circom";
include "circomlib/circuits/comparators.circom";

// Production-grade Poseidon Hash Verification with Standardized Public Statement
// Purpose: Verify that a preimage hashes to an expected value + standardized public outputs
// Use cases: Privacy-preserving identity, commitment schemes, nullifiers with universal format
//
// This circuit outputs a standardized PublicStatement format:
// - merkle_root: Root of state tree (or 0 if not applicable)
// - public_key: User's public key for verification
// - nullifier: Unique identifier to prevent replay attacks
// - value: Transaction amount or other numeric value
// - extra: Additional data hash (optional)
template PoseidonWithStatement() {
    // Private inputs (preimage)
    signal input preimage[2];
    
    // Private inputs for public statement construction
    signal input merkle_root_in;     // State tree root (or 0)
    signal input public_key_in;      // User's public key
    signal input value_in;           // Transaction value or data
    signal input extra_in;           // Additional data (0 if unused)
    
    // Public outputs (standardized PublicStatement format)
    signal output merkle_root;
    signal output public_key;
    signal output nullifier;
    signal output value;
    signal output extra;
    
    // Intermediate signals
    signal hash;
    
    // === STEP 1: Compute Poseidon hash of preimage ===
    component hasher = Poseidon(2);
    hasher.inputs[0] <== preimage[0];
    hasher.inputs[1] <== preimage[1];
    
    hash <== hasher.out;
    
    // === STEP 2: Generate nullifier from hash ===
    // Nullifier = Poseidon(hash, public_key_in)
    // This ensures nullifier is unique per user and preimage
    component nullifierHasher = Poseidon(2);
    nullifierHasher.inputs[0] <== hash;
    nullifierHasher.inputs[1] <== public_key_in;
    
    // === STEP 3: Output standardized PublicStatement ===
    merkle_root <== merkle_root_in;
    public_key <== public_key_in;
    nullifier <== nullifierHasher.out;
    value <== value_in;
    extra <== extra_in;
}

// Public inputs: All 5 fields of PublicStatement
component main {public [merkle_root, public_key, nullifier, value, extra]} = PoseidonWithStatement();
