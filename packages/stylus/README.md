# UZKV Stylus Library

The core zero-knowledge proof verification logic for the Universal ZKV framework, built for Arbitrum Stylus.

## Features

- **Universal Dispatch**: Single entry point for Groth16, PLONK, and STARK proofs.
- **Gas Optimized**: Uses Arbitrum's BN256 precompiles (0x06, 0x07, 0x08) for efficient on-chain verification.
- **Generic STARK Engine**: Built-in "Generic AIR Verifier" capable of verifying arbitrary polynomial constraints defined in the Verification Key.
- **Dual-Mode Architecture**:
  - **WASM (Stylus)**: Compiles to `wasm32-unknown-unknown` for on-chain deployment.
  - **Host (CLI)**: Compiles to `x86_64` (or native) for off-chain verification using `arkworks` and native Rust.

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
