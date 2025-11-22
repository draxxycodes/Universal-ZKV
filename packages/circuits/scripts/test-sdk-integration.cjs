#!/usr/bin/env node
/**
 * SDK Integration Helper for PublicStatement Circuits
 * 
 * This script provides utilities to:
 * 1. Convert circuit outputs to PublicStatement format
 * 2. Encode PublicStatement for UniversalProof
 * 3. Prepare proofs for Stylus verification
 */

const fs = require("fs");
const path = require("path");

// Mock PublicStatement encoding (matches Rust borsh format)
class PublicStatement {
  constructor({ merkle_root, public_key, nullifier, value, extra }) {
    this.merkle_root = merkle_root; // 32 bytes
    this.public_key = public_key;   // 32 bytes
    this.nullifier = nullifier;     // 32 bytes
    this.value = value;             // u128 (16 bytes)
    this.extra = extra;             // Vec<u8>
  }

  /**
   * Encode PublicStatement in borsh format
   * Format: [32 merkle_root] + [32 public_key] + [32 nullifier] + [16 value] + [4 extra_len] + [extra]
   */
  encode() {
    const extraBytes = this.extra === "0x" ? 0 : (this.extra.length - 2) / 2;
    const buffer = Buffer.alloc(116 + extraBytes);
    let offset = 0;

    // Write merkle_root (32 bytes)
    Buffer.from(this.merkle_root.replace("0x", ""), "hex").copy(buffer, offset);
    offset += 32;

    // Write public_key (32 bytes)
    Buffer.from(this.public_key.replace("0x", ""), "hex").copy(buffer, offset);
    offset += 32;

    // Write nullifier (32 bytes)
    Buffer.from(this.nullifier.replace("0x", ""), "hex").copy(buffer, offset);
    offset += 32;

    // Write value (16 bytes, u128 LE)
    const valueHex = this.value.replace("0x", "").padStart(32, "0");
    Buffer.from(valueHex, "hex").reverse().copy(buffer, offset);
    offset += 16;

    // Write extra length (u32 LE)
    buffer.writeUInt32LE(extraBytes, offset);
    offset += 4;

    // Write extra data
    if (extraBytes > 0) {
      Buffer.from(this.extra.replace("0x", ""), "hex").copy(buffer, offset);
    }

    return buffer;
  }

  /**
   * Convert to hex string
   */
  toHex() {
    return "0x" + this.encode().toString("hex");
  }
}

/**
 * Create PublicStatement from circuit metadata
 */
function createPublicStatementFromMetadata(metadataPath) {
  const metadata = JSON.parse(fs.readFileSync(metadataPath, "utf8"));
  
  return new PublicStatement({
    merkle_root: metadata.publicStatement.merkle_root,
    public_key: metadata.publicStatement.public_key,
    nullifier: metadata.publicStatement.nullifier,
    value: metadata.publicStatement.value,
    extra: metadata.publicStatement.extra || "0x",
  });
}

/**
 * Mock UniversalProof encoding
 */
class UniversalProof {
  constructor({ proofType, programId, publicInputs, proof }) {
    this.proofType = proofType;       // u8 (0=Groth16, 1=PLONK, 2=STARK)
    this.programId = programId;       // String
    this.publicInputs = publicInputs; // Buffer (PublicStatement encoded)
    this.proof = proof;               // Buffer (proof bytes)
  }

  encode() {
    // Calculate total size
    const programIdBytes = Buffer.from(this.programId, "utf8");
    const totalSize = 1 + 4 + programIdBytes.length + 4 + this.publicInputs.length + 4 + this.proof.length;
    
    const buffer = Buffer.alloc(totalSize);
    let offset = 0;

    // Write proof type (u8)
    buffer.writeUInt8(this.proofType, offset);
    offset += 1;

    // Write program ID length (u32 LE)
    buffer.writeUInt32LE(programIdBytes.length, offset);
    offset += 4;

    // Write program ID
    programIdBytes.copy(buffer, offset);
    offset += programIdBytes.length;

    // Write public inputs length (u32 LE)
    buffer.writeUInt32LE(this.publicInputs.length, offset);
    offset += 4;

    // Write public inputs
    this.publicInputs.copy(buffer, offset);
    offset += this.publicInputs.length;

    // Write proof length (u32 LE)
    buffer.writeUInt32LE(this.proof.length, offset);
    offset += 4;

    // Write proof
    this.proof.copy(buffer, offset);

    return buffer;
  }

  toHex() {
    return "0x" + this.encode().toString("hex");
  }
}

/**
 * Main: Test PublicStatement encoding
 */
async function main() {
  console.log("=== PublicStatement SDK Integration Test ===\n");

  // Load generated metadata
  const metadataPath = path.join(__dirname, "..", "inputs", "poseidon_statement_valid_metadata.json");
  
  if (!fs.existsSync(metadataPath)) {
    console.error("❌ Metadata not found. Run: node scripts/generate-statement-inputs.cjs");
    process.exit(1);
  }

  console.log("1. Creating PublicStatement from metadata...");
  const publicStatement = createPublicStatementFromMetadata(metadataPath);
  
  console.log("   ✅ PublicStatement created");
  console.log(`   - merkle_root: ${publicStatement.merkle_root}`);
  console.log(`   - public_key: ${publicStatement.public_key}`);
  console.log(`   - nullifier: ${publicStatement.nullifier}`);
  console.log(`   - value: ${publicStatement.value}`);
  console.log(`   - extra: ${publicStatement.extra}`);

  console.log("\n2. Encoding PublicStatement (borsh format)...");
  const encoded = publicStatement.encode();
  console.log(`   ✅ Encoded: ${encoded.length} bytes`);
  console.log(`   - Hex: ${publicStatement.toHex()}`);

  console.log("\n3. Creating mock UniversalProof...");
  // Mock proof data (256 bytes for Groth16)
  const mockProof = Buffer.alloc(256);
  
  const universalProof = new UniversalProof({
    proofType: 0, // Groth16
    programId: "poseidon_with_statement",
    publicInputs: encoded,
    proof: mockProof,
  });

  const universalProofEncoded = universalProof.encode();
  console.log(`   ✅ UniversalProof encoded: ${universalProofEncoded.length} bytes`);
  console.log(`   - Proof type: Groth16 (0)`);
  console.log(`   - Program ID: poseidon_with_statement`);
  console.log(`   - Public inputs: ${encoded.length} bytes`);
  console.log(`   - Proof: ${mockProof.length} bytes`);

  console.log("\n4. Saving encoded outputs...");
  const outputDir = path.join(__dirname, "..", "outputs");
  fs.mkdirSync(outputDir, { recursive: true });

  fs.writeFileSync(
    path.join(outputDir, "public_statement_encoded.hex"),
    publicStatement.toHex()
  );

  fs.writeFileSync(
    path.join(outputDir, "universal_proof_mock.hex"),
    universalProof.toHex()
  );

  console.log("   ✅ Saved to outputs/");
  console.log("      - public_statement_encoded.hex");
  console.log("      - universal_proof_mock.hex");

  console.log("\n✅ SDK Integration Test Complete!\n");
  console.log("Next steps:");
  console.log("  1. Install circom: cargo install --git https://github.com/iden3/circom.git");
  console.log("  2. Compile circuits: ./scripts/compile-statement-circuits.sh");
  console.log("  3. Generate real proofs using compiled circuits");
  console.log("  4. Replace mock proof with real Groth16 proof");
  console.log("  5. Test with Stylus contract: verifyUniversal(universalProofBytes)");
}

if (require.main === module) {
  main().catch((error) => {
    console.error("Error:", error);
    process.exit(1);
  });
}

module.exports = { PublicStatement, UniversalProof, createPublicStatementFromMetadata };
