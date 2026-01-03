# UZKV Stylus Library

The core zero-knowledge proof verification logic for the Universal ZKV framework, built for Arbitrum Stylus.

## Implementation Details

This library is designed to run in two distinct environments:
1.  **Stylus (WASM)**: The production environment. It runs on the Arbitrum One/Sepolia chains inside the WASM VM.
2.  **Host (Native)**: The development environment. It runs on `x86_64` (Linux/macOS) for testing, CLI usage, and CI/CD pipelines.

### Module Structure

*   `uzkv.rs`: **The Gateway**. Contains the main dispatch logic that routes proofs to the correct sub-module based on the `ProofSystem` identifier. It handles feature-flagging between `stylus_impl` and `host_impl`.
*   `groth16.rs`: Implements Groth16 verification.
    *   **Stylus**: Uses `stylus_sdk::call` to invoke the precompile at address `0x08` (Alt-BN128 Pairing).
    *   **Host**: Uses `ark_bn254::Bn254` to perform the pairing check locally.
*   `plonk/`: Implements PLONK verification with KZG commitments.
    *   `plonk.rs`: Core logic (Gate checks, linearization).
    *   `kzg.rs`: Manages the polynomial commitment opening checks via precompiles (on Stylus).
    *   `host.rs`: (**Host-Only**) Replicates the KZG and Gate logic using `arkworks` for off-chain verification.
*   `stark/`: Implements a Generic AIR Verifier.
    *   `constraints.rs`: A dynamic evaluator that processes `AirConstraint` structs (from the VK) against the execution trace.
    *   `merkle.rs`: Custom Merkle tree verification using Keccak256.
    *   `verifier.rs`: The main STARK verification loop (FRI + Query Phase).

## Features

- **Universal Dispatch**: Single entry point for Groth16, PLONK, and STARK proofs.
- **Gas Optimized**: Uses Arbitrum's BN256 precompiles (0x06, 0x07, 0x08) for efficient on-chain verification.
- **Generic STARK Engine**: Built-in "Generic AIR Verifier" capable of verifying arbitrary polynomial constraints defined in the Verification Key.

## Supported Proof Systems

| System | Stylus (On-Chain) | Host (Off-Chain) | Architecture |
|--------|-------------------|------------------|--------------|
| **Groth16** | ✅ Precompiles | ✅ Arkworks | Pairing-based (BN254) |
| **PLONK** | ✅ Precompiles | ✅ Arkworks | Standard Plonk (KZG) |
| **STARK** | ✅ Pure Rust | ✅ Pure Rust | Generic AIR (FRI) |

### Generic STARK Support
Unlike many verifiers that hardcode specific logic (like Fibonacci), UZKV implements a data-driven **Generic AIR Engine**. The Verification Key (VK) contains a schema of constraints (coefficients, offsets, powers) which the verifier evaluates dynamically at runtime. This allows a single contract deployment to verify proofs for any STARK circuit.

## Command Line Interface (UZKV CLI)

The `uzkv-cli` tool allows you to verify proofs off-chain using the exact same logic (mathematically) as the smart contract.

### Installation

```bash
# Build locally
cargo build --bin uzkv-cli --features std --target x86_64-unknown-linux-gnu --release
```

### Usage

```bash
# Verify a Groth16 proof
./target/release/uzkv-cli -t groth16 \
  --proof ./tests/proofs/proof.bin \
  --public-inputs ./tests/proofs/public_inputs.bin \
  --vk ./tests/proofs/vk.bin

# Verify a PLONK proof (Standard KZG)
./target/release/uzkv-cli -t plonk \
  --proof ./proof.bin \
  --public-inputs ./inputs.bin \
  --vk ./vk.bin 

# Verify a STARK proof (Generic AIR)
./target/release/uzkv-cli -t stark \
  --proof ./stark_proof.bin \
  --public-inputs ./stark_inputs.bin \
  --vk ./stark_vk.bin
```

### Output

The CLI outputs a JSON object, making it easy to integrate with other tools (e.g., CI pipelines, Node.js scripts).

```json
{
  "valid": true,
  "proof_type": "groth16",
  "message": "Proof is valid"
}
```

## Development

### Running Tests

To run tests on your host machine (calls the Rust implementation of the verifiers):

```bash
cargo test --features std
```

### Building for Stylus

To build the WASM binary for deployment:

```bash
cargo stylus check
# or
cargo build --target wasm32-unknown-unknown --no-default-features
```
