# UZKV Stylus Library

The core zero-knowledge proof verification logic for the Universal ZKV framework, built for Arbitrum Stylus.

## Features

- **Universal Dispatch**: Single entry point for Groth16, PLONK, and STARK proofs.
- **Gas Optimized**: Uses Arbitrum's BN256 precompiles (0x06, 0x07, 0x08) for efficient on-chain verification.
- **Dual-Mode Architecture**:
  - **WASM (Stylus)**: Compiles to `wasm32-unknown-unknown` for on-chain deployment.
  - **Host (CLI)**: Compiles to `x86_64` (or native) for off-chain verification using `arkworks`.

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

# Check help
./target/release/uzkv-cli --help
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
