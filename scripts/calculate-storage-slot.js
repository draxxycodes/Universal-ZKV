#!/usr/bin/env node
/**
 * ERC-7201 Storage Namespace Calculator
 * Calculates keccak256("arbitrum.uzkv.storage.v1") - 1
 * Output format: Solidity and Rust constants
 */

const { keccak256, toUtf8Bytes } = require("ethers");

const NAMESPACE = "arbitrum.uzkv.storage.v1";

// Calculate keccak256(namespace) - 1
const hash = keccak256(toUtf8Bytes(NAMESPACE));
const hashBigInt = BigInt(hash);
const slot = hashBigInt - 1n;
const slotHex = "0x" + slot.toString(16).padStart(64, "0");

console.log(
  "╔═══════════════════════════════════════════════════════════════╗",
);
console.log("║       ERC-7201 Storage Namespace Calculation                 ║");
console.log(
  "╚═══════════════════════════════════════════════════════════════╝",
);
console.log("");
console.log(`Namespace: "${NAMESPACE}"`);
console.log(`keccak256: ${hash}`);
console.log(`Slot (hash - 1): ${slotHex}`);
console.log("");
console.log("═══════════════════════════════════════════════════════════════");
console.log("Solidity Constant:");
console.log("═══════════════════════════════════════════════════════════════");
console.log(`bytes32 constant STORAGE_SLOT = ${slotHex};`);
console.log("");
console.log("═══════════════════════════════════════════════════════════════");
console.log("Rust Constant:");
console.log("═══════════════════════════════════════════════════════════════");
console.log(`const STORAGE_SLOT: [u8; 32] = [`);
const bytes = slotHex.slice(2).match(/.{2}/g);
for (let i = 0; i < bytes.length; i += 8) {
  const chunk = bytes
    .slice(i, i + 8)
    .map((b) => `0x${b}`)
    .join(", ");
  console.log(`    ${chunk},`);
}
console.log(`];`);
console.log("");
