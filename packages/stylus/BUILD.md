# WASM Build Instructions

This directory contains the UZKV Stylus WASM contract. Due to Windows linker limitations, the WASM build must be performed on Linux/WSL/Docker.

## 🐧 Quick Start (Linux/WSL)

```bash
# Navigate to stylus package
cd packages/stylus

# Run build script
chmod +x build-wasm.sh
./build-wasm.sh
```

## 🐳 Quick Start (Docker on Windows)

```bash
# Navigate to stylus package
cd packages/stylus

# Build Docker image
docker build -t uzkv-stylus-builder .

# Run build in container
docker run --rm -v ${PWD}:/workspace uzkv-stylus-builder bash -c "cd /workspace && ./build-wasm.sh"

# Artifacts will be in ./artifacts/
```

## 📦 Build Artifacts

After successful build, you'll find:

```
artifacts/
├── uzkv_verifier_unoptimized.wasm   # Pre-optimization (~500KB)
├── uzkv_verifier_optimized.wasm     # Production-ready (<128KB)
├── IUniversalVerifier.sol            # Solidity interface (manual)
├── IUniversalVerifier_generated.sol  # Generated ABI
└── build-info.json                   # Build metadata
```

## 🛠️ Manual Build Steps

### Prerequisites

1. **Rust Toolchain:**

   ```bash
   rustup install nightly-2024-02-01
   rustup target add wasm32-unknown-unknown --toolchain nightly-2024-02-01
   ```

2. **cargo-stylus:**

   ```bash
   cargo install cargo-stylus
   ```

3. **wasm-opt (for optimization):**

   ```bash
   # Ubuntu/Debian
   sudo apt install binaryen

   # macOS
   brew install binaryen
   ```

### Build Commands

```bash
# 1. Build WASM
cargo stylus build --release

# 2. Optimize WASM
wasm-opt -Oz \
  target/wasm32-unknown-unknown/release/uzkv_stylus.wasm \
  -o artifacts/uzkv_verifier_optimized.wasm

# 3. Export ABI
cargo stylus export-abi > artifacts/IUniversalVerifier_generated.sol

# 4. Verify WASM (requires Arbitrum RPC)
cargo stylus check --wasm-file artifacts/uzkv_verifier_optimized.wasm \
  --endpoint https://sepolia-rollup.arbitrum.io/rpc
```

## 🚀 Deployment

### Deploy to Arbitrum Sepolia

```bash
cargo stylus deploy \
  --private-key $PRIVATE_KEY \
  --endpoint https://sepolia-rollup.arbitrum.io/rpc \
  --wasm-file artifacts/uzkv_verifier_optimized.wasm
```

### Verify on Arbiscan

```bash
cargo stylus verify \
  --deployment-tx <TX_HASH> \
  --endpoint https://sepolia-rollup.arbitrum.io/rpc
```

## 📊 Size Targets

- **Unoptimized:** ~500KB (initial build)
- **Optimized:** <128KB (production target)
- **Current:** Check `artifacts/build-info.json` after build

## ⚙️ Optimization Flags

The build script uses these `wasm-opt` flags:

- `-Oz` - Optimize for size aggressively
- `--enable-bulk-memory` - Enable bulk memory operations
- `--enable-sign-ext` - Enable sign extension operations

## 🐛 Troubleshooting

### Windows Build Error

**Error:** `unresolved external symbol native_keccak256`

**Solution:** Use Docker or WSL2 (Linux subsystem)

### WASM Too Large

**Error:** WASM size exceeds 128KB

**Solutions:**

1. Review dependencies in `Cargo.toml`
2. Disable unused features
3. Use more aggressive optimization
4. Consider splitting into multiple contracts

### Missing cargo-stylus

**Error:** `cargo: 'stylus' is not a cargo command`

**Solution:**

```bash
cargo install cargo-stylus
```

## 📝 Contract Interface

The contract exposes these main functions:

```solidity
// Universal verification
function verify(uint8 proofType, bytes proof, bytes publicInputs, bytes32 vkHash) returns (bool)
function batchVerify(uint8 proofType, bytes[] proofs, bytes[] publicInputs, bytes32 vkHash) returns (bool[])

// VK registration
function registerVkTyped(uint8 proofType, bytes vk) returns (bytes32)

// Legacy Groth16
function verifyGroth16(bytes proof, bytes publicInputs, bytes32 vkHash) returns (bool)
function registerVk(bytes vk) returns (bytes32)

// Admin
function pause()
function unpause()
function markNullifierUsed(bytes32 nullifier) returns (bool)

// Queries
function getVerificationCount() view returns (uint256)
function isVkRegistered(bytes32 vkHash) view returns (bool)
function isPaused() view returns (bool)
function isNullifierUsed(bytes32 nullifier) view returns (bool)
```

## 🔗 Resources

- [Arbitrum Stylus Docs](https://docs.arbitrum.io/stylus/stylus-gentle-introduction)
- [cargo-stylus CLI](https://github.com/OffchainLabs/cargo-stylus)
- [Stylus SDK](https://github.com/OffchainLabs/stylus-sdk-rs)
- [WASM Optimization](https://rustwasm.github.io/book/reference/code-size.html)

---

**Last Updated:** November 21, 2025  
**Status:** Build script ready, awaiting Linux environment for execution
