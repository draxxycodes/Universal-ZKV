pragma circom 2.1.6;

include "../../../node_modules/circomlib/circuits/eddsamimc.circom";
include "../../../node_modules/circomlib/circuits/bitify.circom";

// Production-grade EdDSA Signature Verification Circuit
// Purpose: Verify EdDSA signatures using MiMC hash
// Use cases: Anonymous authentication, credential verification, voting systems
template EdDSAVerifier() {
    // Public key coordinates (public)
    signal input Ax;
    signal input Ay;
    
    // Signature components (private)
    signal input S;
    signal input R8x;
    signal input R8y;
    
    // Message to verify (public)
    signal input M;
    
    // Output: 1 if signature is valid
    signal output valid;
    
    // EdDSA verification component
    component verifier = EdDSAMiMCVerifier();
    
    // Enable verification
    verifier.enabled <== 1;
    
    // Connect public key
    verifier.Ax <== Ax;
    verifier.Ay <== Ay;
    
    // Connect signature
    verifier.S <== S;
    verifier.R8x <== R8x;
    verifier.R8y <== R8y;
    
    // Connect message
    verifier.M <== M;
    
    // Output validation result
    // If enabled=1 and signature invalid, circuit will fail with constraint violation
    // If enabled=1 and signature valid, circuit succeeds
    valid <== 1; // If we reach here, signature is valid
}

component main {public [Ax, Ay, M]} = EdDSAVerifier();
