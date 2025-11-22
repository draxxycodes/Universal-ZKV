#!/usr/bin/env node
/**
 * Generate test inputs for PublicStatement-standardized circuits
 * 
 * This script generates inputs that match the PublicStatement format:
 * - merkle_root: Root of state tree (32 bytes)
 * - public_key: User's public key (32 bytes)
 * - nullifier: Unique identifier (32 bytes)
 * - value: Transaction value (u128)
 * - extra: Additional data (variable bytes)
 */

const { buildPoseidon } = require("circomlibjs");
const fs = require("fs");
const path = require("path");

// Convert field element to bytes32 hex string
function fieldToBytes32(field) {
  // Handle Uint8Array from Poseidon
  if (field instanceof Uint8Array) {
    const hex = Array.from(field)
      .map(b => b.toString(16).padStart(2, "0"))
      .join("");
    return "0x" + hex;
  }
  // Handle BigInt
  const hex = BigInt(field).toString(16).padStart(64, "0");
  return "0x" + hex;
}

// Convert u128 to 16-byte hex string
function u128ToHex(value) {
  const hex = BigInt(value).toString(16).padStart(32, "0");
  return "0x" + hex;
}

/**
 * Generate inputs for Poseidon circuit with PublicStatement
 */
async function generatePoseidonStatementInputs(poseidon, valid = true) {
  // Private: preimage
  const preimage = [
    BigInt(12345),
    BigInt(67890),
  ];
  
  // Private: PublicStatement fields
  const merkle_root_in = BigInt(0); // Not used for this circuit
  const public_key_in = BigInt("0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef");
  const value_in = BigInt(1000000); // 1 million units
  const extra_in = BigInt(0); // No extra data
  
  // Compute hash
  const hashBytes = poseidon([preimage[0], preimage[1]]);
  const hash = poseidon.F.toObject(hashBytes);
  
  // Compute nullifier = Poseidon(hash, public_key_in)
  const nullifierBytes = poseidon([hash, public_key_in]);
  const nullifier = poseidon.F.toObject(nullifierBytes);
  
  // Private inputs
  const privateInputs = {
    preimage: preimage.map(String),
    merkle_root_in: String(merkle_root_in),
    public_key_in: String(public_key_in),
    value_in: String(value_in),
    extra_in: String(extra_in),
  };
  
  // Public inputs (PublicStatement format)
  const publicInputs = {
    merkle_root: String(merkle_root_in),
    public_key: String(public_key_in),
    nullifier: String(nullifier),
    value: String(value_in),
    extra: String(extra_in),
  };
  
  // Complete circuit input
  const circuitInput = {
    ...privateInputs,
    ...publicInputs,
  };
  
  // Metadata for verification
  const metadata = {
    description: "Poseidon hash verification with PublicStatement",
    valid,
    publicStatement: {
      merkle_root: fieldToBytes32(merkle_root_in),
      public_key: fieldToBytes32(public_key_in),
      nullifier: fieldToBytes32(nullifier),
      value: u128ToHex(value_in),
      extra: "0x", // Empty
    },
  };
  
  return { circuitInput, publicInputs, metadata };
}

/**
 * Generate multiple test cases
 */
async function main() {
  console.log("Generating PublicStatement circuit inputs...");
  
  // Initialize Poseidon
  const poseidon = await buildPoseidon();
  
  // Output directory
  const outputDir = path.join(__dirname, "..", "inputs");
  fs.mkdirSync(outputDir, { recursive: true });
  
  // Generate valid test case
  console.log("Generating valid Poseidon input...");
  const validCase = await generatePoseidonStatementInputs(poseidon, true);
  
  fs.writeFileSync(
    path.join(outputDir, "poseidon_statement_valid.json"),
    JSON.stringify(validCase.circuitInput, null, 2)
  );
  
  fs.writeFileSync(
    path.join(outputDir, "poseidon_statement_valid_metadata.json"),
    JSON.stringify(validCase.metadata, null, 2)
  );
  
  console.log("✅ Generated inputs for poseidon_with_statement.circom");
  console.log(`   - Circuit input: inputs/poseidon_statement_valid.json`);
  console.log(`   - Metadata: inputs/poseidon_statement_valid_metadata.json`);
  console.log(`   - PublicStatement fields: ${Object.keys(validCase.publicInputs).length}`);
}

if (require.main === module) {
  main().catch((error) => {
    console.error("Error generating inputs:", error);
    process.exit(1);
  });
}

module.exports = { generatePoseidonStatementInputs };
