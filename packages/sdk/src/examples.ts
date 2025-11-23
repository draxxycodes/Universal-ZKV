/**
 * Universal Proof Protocol - Usage Examples
 *
 * This file demonstrates how to use the UniversalProof types for encoding/decoding
 * proofs in a way that's compatible with the Rust Stylus verifier.
 */

import { ProofType, PublicStatement, UniversalProof } from "./types";

// ============================================================================
// Example 1: Creating a PublicStatement
// ============================================================================

console.log("Example 1: Creating a PublicStatement\n");

const statement = new PublicStatement({
  merkleRoot: new Uint8Array(32).fill(0x11), // State tree root
  publicKey: new Uint8Array(32).fill(0x22), // EdDSA public key
  nullifier: new Uint8Array(32).fill(0x33), // Anti-replay nullifier
  value: 12345n, // Amount or ID
  extra: new Uint8Array([0xde, 0xad]), // Optional metadata
});

console.log("PublicStatement created:");
console.log(
  `  Merkle Root: ${Buffer.from(statement.merkleRoot).toString("hex").slice(0, 16)}...`,
);
console.log(
  `  Public Key: ${Buffer.from(statement.publicKey).toString("hex").slice(0, 16)}...`,
);
console.log(
  `  Nullifier: ${Buffer.from(statement.nullifier).toString("hex").slice(0, 16)}...`,
);
console.log(`  Value: ${statement.value}`);
console.log(`  Extra: ${Buffer.from(statement.extra).toString("hex")}`);
console.log(`  Encoded size: ${statement.encodedSize()} bytes\n`);

// ============================================================================
// Example 2: Encoding a PublicStatement
// ============================================================================

console.log("Example 2: Encoding a PublicStatement\n");

const encodedStatement = statement.encode();
console.log(`Encoded PublicStatement (${encodedStatement.length} bytes):`);
console.log(
  `  First 32 bytes (merkle_root): ${Buffer.from(encodedStatement.slice(0, 32)).toString("hex")}`,
);
console.log(
  `  Next 32 bytes (public_key): ${Buffer.from(encodedStatement.slice(32, 64)).toString("hex")}`,
);
console.log(
  `  Next 32 bytes (nullifier): ${Buffer.from(encodedStatement.slice(64, 96)).toString("hex")}`,
);
console.log(
  `  Next 16 bytes (value u128): ${Buffer.from(encodedStatement.slice(96, 112)).toString("hex")}`,
);
console.log(
  `  Next 4 bytes (extra_len): ${Buffer.from(encodedStatement.slice(112, 116)).toString("hex")}`,
);
console.log(
  `  Extra data: ${Buffer.from(encodedStatement.slice(116)).toString("hex")}\n`,
);

// ============================================================================
// Example 3: Decoding a PublicStatement
// ============================================================================

console.log("Example 3: Decoding a PublicStatement\n");

const decodedStatement = PublicStatement.decode(encodedStatement);
console.log("Decoded PublicStatement:");
console.log(`  Value matches: ${decodedStatement.value === statement.value}`);
console.log(
  `  Extra matches: ${Buffer.from(decodedStatement.extra).toString("hex") === Buffer.from(statement.extra).toString("hex")}\n`,
);

// ============================================================================
// Example 4: Creating a Groth16 UniversalProof
// ============================================================================

console.log("Example 4: Creating a Groth16 UniversalProof\n");

const groth16Proof = new UniversalProof({
  version: 1,
  proofType: ProofType.Groth16,
  programId: 0, // Poseidon circuit
  vkHash: new Uint8Array(32).fill(0xab), // Hash of VK (from on-chain registry)
  proofBytes: new Uint8Array(128).fill(0xde), // Mock Groth16 proof (~128 bytes)
  publicInputsBytes: encodedStatement,
});

console.log("Groth16 UniversalProof created:");
console.log(`  Version: ${groth16Proof.version}`);
console.log(`  Proof Type: ${ProofType[groth16Proof.proofType]}`);
console.log(`  Program ID: ${groth16Proof.programId}`);
console.log(
  `  VK Hash: ${Buffer.from(groth16Proof.vkHash).toString("hex").slice(0, 16)}...`,
);
console.log(`  Proof size: ${groth16Proof.proofBytes.length} bytes`);
console.log(
  `  Public inputs size: ${groth16Proof.publicInputsBytes.length} bytes`,
);
console.log(`  Total encoded size: ${groth16Proof.encodedSize()} bytes\n`);

// ============================================================================
// Example 5: Encoding a UniversalProof for on-chain submission
// ============================================================================

console.log("Example 5: Encoding a UniversalProof for on-chain submission\n");

const encodedProof = groth16Proof.encode();
console.log(`Encoded UniversalProof (${encodedProof.length} bytes):`);
console.log(`  Header (46 bytes):`);
console.log(`    version: ${encodedProof[0]}`);
console.log(
  `    proof_type: ${encodedProof[1]} (${ProofType[encodedProof[1]]})`,
);
console.log(
  `    program_id: ${encodedProof[2]} ${encodedProof[3]} ${encodedProof[4]} ${encodedProof[5]}`,
);
console.log(
  `    vk_hash: ${Buffer.from(encodedProof.slice(6, 38)).toString("hex").slice(0, 16)}...`,
);

// Extract proof_len (u32 little-endian at offset 38)
const proofLen =
  encodedProof[38] |
  (encodedProof[39] << 8) |
  (encodedProof[40] << 16) |
  (encodedProof[41] << 24);
console.log(`    proof_len: ${proofLen}`);

// Extract public_inputs_len (u32 little-endian at offset 42 + proofLen)
const publicInputsOffset = 42 + proofLen;
const publicInputsLen =
  encodedProof[publicInputsOffset] |
  (encodedProof[publicInputsOffset + 1] << 8) |
  (encodedProof[publicInputsOffset + 2] << 16) |
  (encodedProof[publicInputsOffset + 3] << 24);
console.log(`    public_inputs_len: ${publicInputsLen}\n`);

// ============================================================================
// Example 6: Decoding a UniversalProof
// ============================================================================

console.log("Example 6: Decoding a UniversalProof\n");

const decodedProof = UniversalProof.decode(encodedProof);
console.log("Decoded UniversalProof:");
console.log(`  Version: ${decodedProof.version}`);
console.log(`  Proof Type: ${ProofType[decodedProof.proofType]}`);
console.log(`  Program ID: ${decodedProof.programId}`);
console.log(
  `  Matches original: ${decodedProof.proofType === groth16Proof.proofType && decodedProof.programId === groth16Proof.programId}\n`,
);

// ============================================================================
// Example 7: Using withStatement convenience constructor
// ============================================================================

console.log("Example 7: Using withStatement convenience constructor\n");

const plonkProof = UniversalProof.withStatement({
  proofType: ProofType.PLONK,
  programId: 1, // EdDSA circuit
  vkHash: new Uint8Array(32).fill(0xff),
  proofBytes: new Uint8Array(800).fill(0xbe), // Mock PLONK proof (~800 bytes)
  publicStatement: new PublicStatement({
    merkleRoot: new Uint8Array(32).fill(0x44),
    publicKey: new Uint8Array(32).fill(0x55),
    nullifier: new Uint8Array(32).fill(0x66),
    value: 999n,
  }),
});

console.log("PLONK UniversalProof created via withStatement:");
console.log(`  Proof Type: ${ProofType[plonkProof.proofType]}`);
console.log(`  Program ID: ${plonkProof.programId}`);
console.log(`  Total size: ${plonkProof.encodedSize()} bytes\n`);

// ============================================================================
// Example 8: Extracting PublicStatement from UniversalProof
// ============================================================================

console.log("Example 8: Extracting PublicStatement from UniversalProof\n");

const extractedStatement = plonkProof.decodePublicStatement();
console.log("Extracted PublicStatement:");
console.log(
  `  Merkle Root: ${Buffer.from(extractedStatement.merkleRoot).toString("hex").slice(0, 16)}...`,
);
console.log(`  Value: ${extractedStatement.value}`);
console.log(
  `  Nullifier: ${Buffer.from(extractedStatement.nullifier).toString("hex").slice(0, 16)}...\n`,
);

// ============================================================================
// Example 9: Creating a STARK proof
// ============================================================================

console.log("Example 9: Creating a STARK proof\n");

const starkProof = UniversalProof.withStatement({
  proofType: ProofType.STARK,
  programId: 2, // Fibonacci STARK
  vkHash: new Uint8Array(32).fill(0xcc),
  proofBytes: new Uint8Array(50000).fill(0xef), // Mock STARK proof (~50 KB)
  publicStatement: new PublicStatement({
    merkleRoot: new Uint8Array(32).fill(0x77),
    publicKey: new Uint8Array(32).fill(0x88),
    nullifier: new Uint8Array(32).fill(0x99),
    value: 1597n, // 17th Fibonacci number
  }),
});

console.log("STARK UniversalProof created:");
console.log(`  Proof Type: ${ProofType[starkProof.proofType]}`);
console.log(
  `  Proof size: ${starkProof.proofBytes.length.toLocaleString()} bytes`,
);
console.log(
  `  Total encoded size: ${starkProof.encodedSize().toLocaleString()} bytes\n`,
);

// ============================================================================
// Example 10: Ready for on-chain submission
// ============================================================================

console.log("Example 10: Ready for on-chain submission\n");

// This is the bytes you'd send to the Solidity proxy or directly to Stylus
const onChainBytes = groth16Proof.encode();

console.log("Submitting to on-chain verifier:");
console.log(
  `  Call: verifier.verify(0x${Buffer.from(onChainBytes).toString("hex")})`,
);
console.log(
  `  Gas estimate: ~280,000 (Groth16) / ~400,000 (PLONK) / ~540,000 (STARK)`,
);
console.log(`  Expected result: bool (true if valid)\n`);

console.log("✅ All examples completed successfully!");
console.log("📝 See docs/UNIVERSAL-PROOF-PROTOCOL.md for full specification");
