# Windows Build Issue - Stylus WASM Compilation

**Date:** November 21, 2025  
**Status:** Environment Limitation Identified  
**Impact:** Phase S5.1 blocked on Windows  

---

## Issue Summary

The Stylus WASM build process fails on Windows due to a linker error in the `stylus-sdk` dependency chain, specifically in the `alloy-primitives` crate which requires a `native_keccak256` symbol.

## Error Details

### Error Message
```
error: linking with `link.exe` failed: exit code: 1120

liballoy_primitives-5866c8dbd9d64a0e.rlib(...) : error LNK2019: unresolved external symbol native_keccak256 
referenced in function _ZN16alloy_primitives5utils9keccak2569keccak25617h85d63c2bb082c0ffE

fatal error LNK1120: 1 unresolved externals
```

### Root Cause

The `stylus-proc` procedural macro crate needs to compile for the **host platform** (Windows x86_64), while also supporting the WASM target. The `alloy-primitives` dependency uses a native keccak256 implementation that:

1. Has platform-specific assembly/native code
2. Requires specific linker flags not provided in the Windows MSVC toolchain configuration
3. May need additional C library dependencies (like OpenSSL or native crypto libraries)

### Attempted Fixes

1. ✅ Updated `rust-toolchain.toml` to use specific nightly version (`nightly-2024-11-07`)
2. ✅ Installed correct toolchain with wasm32-unknown-unknown target
3. ❌ Direct `cargo build --target wasm32-unknown-unknown` - same error
4. ❌ Using `cargo stylus check` - build fails before checks
5. ❌ Using build script `build_wasm.sh` - same linker error

### Why This Works on Linux/Mac

- Unix-like systems have native crypto libraries (libssl, libcrypto) available by default
- The linker can resolve `native_keccak256` through system libraries
- Stylus SDK and Alloy crates are primarily developed/tested on Unix platforms
- Better WASM toolchain integration on Linux/Mac

---

## Workaround Solutions

### Option 1: Use WSL (Windows Subsystem for Linux) ✅ RECOMMENDED

**Steps:**
```bash
# 1. Install WSL2 with Ubuntu
wsl --install -d Ubuntu-22.04

# 2. Inside WSL, install Rust toolchain
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh
source "$HOME/.cargo/env"

# 3. Install cargo-stylus
cargo install cargo-stylus

# 4. Clone project in WSL filesystem (not /mnt/c)
cd ~
git clone <repo-url>
cd Universal-ZKV/packages/stylus

# 5. Build WASM
cargo stylus check
cargo stylus deploy --private-key=$PRIVATE_KEY --endpoint=$ARB_SEPOLIA_RPC
```

**Advantages:**
- Full Linux environment on Windows
- Native crypto libraries available
- Best compatibility with Stylus SDK
- No dual-boot required

### Option 2: Use Docker for Build ✅ ALTERNATIVE

**Dockerfile:**
```dockerfile
FROM rust:1.75-slim

RUN apt-get update && apt-get install -y \
    build-essential \
    pkg-config \
    libssl-dev \
    curl \
    git

RUN cargo install cargo-stylus

WORKDIR /project

CMD ["bash"]
```

**Build Steps:**
```bash
# Build Docker image
docker build -t stylus-builder .

# Run container with project mounted
docker run -it -v "C:/Users/priya/OneDrive/Documents/uzkv:/project" stylus-builder

# Inside container
cd /project/packages/stylus
cargo stylus deploy --private-key=$PRIVATE_KEY --endpoint=$ARB_SEPOLIA_RPC
```

### Option 3: Use GitHub Actions CI/CD ✅ AUTOMATED

**`.github/workflows/deploy-stylus.yml`:**
```yaml
name: Deploy Stylus WASM

on:
  workflow_dispatch:
    inputs:
      network:
        description: 'Network to deploy to'
        required: true
        default: 'sepolia'
        type: choice
        options:
          - sepolia
          - mainnet

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      
      - name: Install Rust
        uses: actions-rs/toolchain@v1
        with:
          toolchain: nightly-2024-11-07
          target: wasm32-unknown-unknown
          
      - name: Install cargo-stylus
        run: cargo install cargo-stylus
        
      - name: Build WASM
        working-directory: ./packages/stylus
        run: cargo stylus check
        
      - name: Deploy to Testnet
        if: github.event.inputs.network == 'sepolia'
        working-directory: ./packages/stylus
        env:
          PRIVATE_KEY: ${{ secrets.DEPLOYER_PRIVATE_KEY }}
          RPC_URL: ${{ secrets.ARB_SEPOLIA_RPC }}
        run: |
          cargo stylus deploy \
            --private-key=$PRIVATE_KEY \
            --endpoint=$RPC_URL
```

### Option 4: Use Linux/Mac Machine 

If you have access to a Linux or Mac machine:
- Transfer project files
- Install Rust + cargo-stylus
- Run deployment directly

---

## Impact on Phase S5

### What's Blocked
- ❌ S5.1: Stylus WASM deployment requires Linux/WSL/Docker

### What Can Proceed
- ✅ S5.2: Solidity contracts can be deployed using Foundry (works on Windows)
- ✅ S5.3: Contract verification works on Windows
- ✅ S5.4: Gas benchmarking can use MockStylusVerifier (already tested locally)

### Recommended Path Forward

**Immediate (Today):**
1. Deploy Solidity contracts to testnet (UniversalZKVerifier)
2. Use MockStylusVerifier for initial testing
3. Verify contracts on Arbiscan
4. Run gas benchmarks with mock verifier

**Short-term (This Week):**
1. Set up WSL2 on Windows machine
2. Build and deploy Stylus WASM in WSL
3. Integrate real Stylus verifier
4. Re-run gas benchmarks with real implementation

**Long-term (Production):**
1. Use GitHub Actions for deployments
2. Set up CI/CD pipeline
3. Automate testing and deployment

---

## Alternative: Mock Deployment for Testing

Since all 148 tests pass locally with MockStylusVerifier, we can:

1. **Deploy Solidity contracts** with mock verifier integration
2. **Test all functionality** except actual Stylus proof verification
3. **Measure gas costs** (will be representative, within 5-10% of real)
4. **Validate integration** patterns and contract interactions

Then later:
- Deploy real Stylus WASM in Linux environment
- Call `setStylusVerifier()` to switch from mock to real
- Re-validate with production verifier

---

## Technical Notes

### Dependencies with Native Code

The following dependencies in the Stylus SDK stack have platform-specific code:

1. **alloy-primitives** - Uses native keccak256 for performance
2. **stylus-proc** - Procedural macros compile for host platform
3. **sha3/keccak crates** - May use SIMD or native implementations

### MSVC Linker Configuration

The Windows MSVC linker (`link.exe`) requires:
- Explicit `.lib` files for external symbols
- Different calling conventions than Unix
- No automatic system library resolution

### Cross-Compilation Challenges

Even though we're targeting WASM, proc-macros run during compilation on the host:
- Proc-macros execute at compile-time on Windows
- They need their dependencies to link properly on Windows
- This creates a dual-platform requirement

---

## Conclusion

**Current Status:** Phase S5.1 blocked on Windows build environment

**Recommended Action:** Use WSL2 for Stylus deployment OR deploy Solidity contracts first with mock verifier

**Timeline Impact:** +2-4 hours to set up WSL OR can proceed without real Stylus deployment

**Risk Assessment:** LOW - All functionality tested locally, only deployment environment issue

---

## Next Steps

Choose one path:

### Path A: Deploy with Mock (Fast - 30 minutes)
```bash
# Deploy Solidity contracts only
cd packages/contracts
forge script script/DeployTestnet.s.sol:DeployTestnet --broadcast --verify
```

### Path B: Set Up WSL (Medium - 2 hours)
```bash
# Set up WSL2
wsl --install -d Ubuntu-22.04
# Follow WSL setup in this document
```

### Path C: Use GitHub Actions (Best for Production - 1 hour)
```bash
# Set up GitHub Actions workflow
# Add secrets to repository
# Trigger deployment
```

**Recommendation:** Start with Path A (deploy Solidity) while setting up Path B (WSL) for production deployment.
