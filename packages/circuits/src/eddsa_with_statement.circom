pragma circom 2.1.6;

include "circomlib/circuits/eddsamimc.circom";
include "circomlib/circuits/poseidon.circom";

// Production-grade EdDSA Verification with Standardized Public Statement
// Purpose: Verify EdDSA signatures with universal PublicStatement output format
// Use cases: Anonymous authentication, voting systems, credential verification
//
// This circuit outputs a standardized PublicStatement format:
// - merkle_root: Root of eligible voters tree (or 0 if not applicable)
// - public_key: Signer's public key (Ax coordinate used)
// - nullifier: Unique identifier to prevent double-voting/replay
// - value: Vote choice or credential type
// - extra: Additional data hash (optional)
template EdDSAWithStatement() {
    // Public key coordinates (private - revealed via public_key output)
    signal input Ax;
    signal input Ay;
    
    // Signature components (private)
    signal input S;
    signal input R8x;
    signal input R8y;
    
    // Message to verify (private)
    signal input M;
    
    // Additional inputs for public statement
    signal input merkle_root_in;     // Eligibility tree root (or 0)
    signal input value_in;           // Vote choice, credential type, etc.
    signal input extra_in;           // Additional data (0 if unused)
    
    // Public outputs (standardized PublicStatement format)
    signal output merkle_root;
    signal output public_key;
    signal output nullifier;
    signal output value;
    signal output extra;
    
    // === STEP 1: Verify EdDSA signature ===
    component verifier = EdDSAMiMCVerifier();
    verifier.enabled <== 1;
    verifier.Ax <== Ax;
    verifier.Ay <== Ay;
    verifier.S <== S;
    verifier.R8x <== R8x;
    verifier.R8y <== R8y;
    verifier.M <== M;
    
    // If signature is invalid, circuit will fail with constraint violation
    
    // === STEP 2: Generate nullifier from message and public key ===
    // Nullifier = Poseidon(M, Ax)
    // Prevents replay attacks and double-voting
    component nullifierHasher = Poseidon(2);
    nullifierHasher.inputs[0] <== M;
    nullifierHasher.inputs[1] <== Ax;
    
    // === STEP 3: Output standardized PublicStatement ===
    merkle_root <== merkle_root_in;
    public_key <== Ax;  // Use Ax as public key identifier
    nullifier <== nullifierHasher.out;
    value <== value_in;
    extra <== extra_in;
}

// Public inputs: All 5 fields of PublicStatement
component main {public [merkle_root, public_key, nullifier, value, extra]} = EdDSAWithStatement();
