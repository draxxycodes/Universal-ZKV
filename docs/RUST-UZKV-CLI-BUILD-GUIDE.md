# Building Standalone Rust UZKV CLI

This guide explains how to create a native Rust CLI binary for the Universal ZK Verifier, separate from the Stylus WASM contract.

## Problem

The `packages/stylus` crate is configured to compile to WASM for Arbitrum Stylus deployment. This makes building native binaries complicated.

## Solution: Separate CLI Crate

Create a new Rust project that imports the UZKV library and compiles to native binaries.

## Step-by-Step Guide

### 1. Create CLI Crate

```bash
cd packages
cargo new --bin uzkv-cli
cd uzkv-cli
```

### 2. Update Cargo.toml

```toml
[package]
name = "uzkv-cli"
version = "1.0.0"
edition = "2021"

[dependencies]
# Import UZKV as library
uzkv-stylus = { path = "../stylus", default-features = false, features = ["std"] }

# CLI dependencies
clap = { version = "4.0", features = ["derive"] }
serde = { version = "1.0", features = ["derive"] }
serde_json = "1.0"
anyhow = "1.0"

[profile.release]
opt-level = 3
lto = "fat"
codegen-units = 1
strip = "symbols"
```

### 3. Create src/main.rs

```rust
use clap::{Parser, ValueEnum};
use std::path::PathBuf;
use std::fs;
use anyhow::{Context, Result};
use serde::{Serialize, Deserialize};

#[derive(Debug, Clone, Copy, ValueEnum)]
enum ProofType {
    Groth16,
    Plonk,
    Stark,
}

impl ProofType {
    fn to_u8(&self) -> u8 {
        match self {
            ProofType::Groth16 => 0,
            ProofType::Plonk => 1,
            ProofType::Stark => 2,
        }
    }
}

#[derive(Parser, Debug)]
#[command(name = "uzkv-cli")]
#[command(about = "Universal ZK Verifier CLI", long_about = None)]
struct Args {
    /// Proof system type
    #[arg(short = 't', long, value_enum)]
    proof_type: ProofType,

    /// Path to proof file
    #[arg(short = 'p', long)]
    proof: PathBuf,

    /// Path to public inputs file
    #[arg(short = 'i', long)]
    public_inputs: PathBuf,

    /// Path to verification key (not required for STARK)
    #[arg(short = 'v', long)]
    vk: Option<PathBuf>,
}

#[derive(Serialize, Deserialize)]
struct VerificationResult {
    valid: bool,
    proof_type: String,
    message: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    error: Option<String>,
}

fn main() -> Result<()> {
    let args = Args::parse();

    // Read proof file
    let proof = fs::read(&args.proof)
        .with_context(|| format!("Failed to read proof file: {:?}", args.proof))?;

    // Read public inputs
    let public_inputs = fs::read(&args.public_inputs)
        .with_context(|| format!("Failed to read public inputs: {:?}", args.public_inputs))?;

    // Read VK (if provided)
    let vk = if let Some(vk_path) = args.vk {
        fs::read(&vk_path)
            .with_context(|| format!("Failed to read VK file: {:?}", vk_path))?
    } else if matches!(args.proof_type, ProofType::Stark) {
        vec![] // STARK doesn't need VK
    } else {
        anyhow::bail!("VK is required for {:?} proofs", args.proof_type);
    };

    // Verify proof using UZKV
    let proof_type_u8 = args.proof_type.to_u8();
    
    match uzkv_stylus::uzkv::verify_universal_proof(
        proof_type_u8,
        &proof,
        &public_inputs,
        &vk
    ) {
        Ok(is_valid) => {
            let result = VerificationResult {
                valid: is_valid,
                proof_type: format!("{:?}", args.proof_type),
                message: if is_valid {
                    "Proof is valid".to_string()
                } else {
                    "Proof is invalid".to_string()
                },
                error: None,
            };
            
            println!("{}", serde_json::to_string_pretty(&result)?);
            std::process::exit(if is_valid { 0 } else { 1 });
        }
        Err(e) => {
            let error_msg = String::from_utf8_lossy(&e).to_string();
            let result = VerificationResult {
                valid: false,
                proof_type: format!("{:?}", args.proof_type),
                message: "Verification error".to_string(),
                error: Some(error_msg),
            };
            
            eprintln!("{}", serde_json::to_string_pretty(&result)?);
            std::process::exit(2);
        }
    }
}
```

### 4. Build Native Binary

```bash
cd packages/uzkv-cli
cargo build --release
```

**Output**: `target/release/uzkv-cli` (or `uzkv-cli.exe` on Windows)

### 5. Test CLI

```bash
# Groth16 verification
./target/release/uzkv-cli \
    --proof-type groth16 \
    --proof ../../packages/circuits/proofs/deployment/poseidon_test_groth16_proof.json \
    --public-inputs ../../packages/circuits/proofs/deployment/poseidon_test_groth16_public.json \
    --vk ../../packages/circuits/build/poseidon_test_vk.json

# STARK verification (no VK needed)
./target/release/uzkv-cli \
    --proof-type stark \
    --proof ../../packages/circuits/proofs/deployment/poseidon_test_stark_proof.ub \
    --public-inputs ../../packages/circuits/proofs/deployment/poseidon_test_stark_public.json
```

### 6. Update stylus/Cargo.toml

To make the UZKV module usable as a library, ensure these features exist:

```toml
[lib]
crate-type = ["cdylib", "rlib"]  # rlib allows usage as library

[features]
default = []
export-abi = ["stylus-sdk/export-abi"]
std = []  # Feature flag for std builds
```

### 7. Update stylus/src/lib.rs

Make UZKV public API available:

```rust
// At top of file
#![cfg_attr(not(feature = "std"), no_std)]

// Export UZKV module publicly
pub mod uzkv;

// Re-export for convenience
pub use uzkv::{ProofSystem, verify_universal_proof, batch_verify_universal_proofs};
```

### 8. Integrate with Node.js Scripts

Update `scripts/verify-with-uzkv.cjs`:

```javascript
// Replace snarkjs calls with Rust UZKV
function verifyGroth16(proofPath, publicInputsPath, vkPath) {
    const result = execSync(
        `./packages/uzkv-cli/target/release/uzkv-cli -t groth16 -p "${proofPath}" -i "${publicInputsPath}" -v "${vkPath}"`,
        { encoding: 'utf8', stdio: 'pipe' }
    );
    const parsed = JSON.parse(result);
    return parsed.valid;
}
```

## Alternative: WASM Runtime Approach

If creating a separate crate is too much work, you can run the WASM binary using wasmtime:

```bash
# Install wasmtime
curl https://wasmtime.dev/install.sh -sSf | bash

# Run WASM binary
wasmtime run --dir=. target/wasm32-unknown-unknown/release/uzkv-cli.wasm -- \
    --proof-type groth16 \
    --proof proof.json \
    --public-inputs public.json \
    --vk vk.json
```

However, this requires modifying the CLI to work in WASM environment (different file I/O).

## Recommended Approach

**Short-term**: Use `scripts/uzkv-wrapper.js` (already created) - keeps workflow working while Rust CLI is developed.

**Medium-term**: Create separate `packages/uzkv-cli` crate as described above - provides true Rust verification.

**Long-term**: Benchmark performance and decide if pure Rust verification provides meaningful speedup over snarkjs for your use case.

## Why This Matters

1. **Performance**: Rust verification ~10-100x faster than JavaScript
2. **Security**: Single implementation reduces attack surface
3. **Consistency**: Same verifier code on-chain (WASM) and off-chain (native)
4. **Simplicity**: One codebase for all three proof systems

## Current Status

✅ Rust UZKV module created and compiles
✅ JavaScript wrapper created for immediate use
🔄 Separate CLI crate (this guide) - ready to implement
⏳ Integration with workflow scripts - pending CLI completion

## Next Steps

1. Create `packages/uzkv-cli` crate following this guide
2. Build and test native binary
3. Update workflow scripts to use Rust CLI
4. Benchmark performance vs snarkjs
5. Document results in `UZKV-IMPLEMENTATION-STATUS.md`
