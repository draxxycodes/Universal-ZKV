# 🦀 Stylus Contracts Package

> Minimal Solidity interfaces for Arbitrum Stylus WASM contracts

## Overview

This package contains **only** the Solidity interface layer for the Stylus WASM verifiers. All cryptographic verification logic is implemented in Rust (see `packages/stylus`).

## Architecture

```
┌────────────────────────────────────────────────────────┐
│           PURE STYLUS VERIFICATION STACK               │
└────────────────────────────────────────────────────────┘

Solidity (Interface)          Stylus (Verification)
─────────────────────         ─────────────────────
IGroth16Verifier.sol    →     lib.rs (80 lines)
Groth16VerifierProxy.sol →    groth16.rs (600 lines)
                               ↓
                          WASM (122KB)
                               ↓
                          Arbitrum Deployment
```

**Key Principle:** Solidity provides ABI and events, Stylus does the heavy lifting.

## Files

### Interfaces (`src/interfaces/`)

- **`IGroth16Verifier.sol`** - ABI for Stylus Groth16 WASM contract
  - Generated from `cargo stylus export-abi`
  - Defines function signatures matching Rust implementation
  - No logic, just type definitions

### Proxies (`src/`)

- **`Groth16VerifierProxy.sol`** - Event emission wrapper
  - Delegates to Stylus WASM contract
  - Emits `ProofVerified`, `VKRegistered` events
  - Provides Solidity-friendly camelCase functions

### Libraries (`src/libraries/`)

- **`Storage.sol`** - ERC-7201 storage layout
  - Prevents storage collisions
  - Defines namespace slots
  - Used by both Solidity and Rust

## What Was Removed

The following Solidity files were **removed** because verification is now done in Stylus:

- ❌ `UZKVProxy.sol` - UUPS proxy (not needed with Stylus)
- ❌ `UniversalZKVerifier.sol` - Multi-proof router (Stylus handles)
- ❌ `Counter.sol` - Example template
- ❌ `MockStylusVerifier.sol` - Test mock
- ❌ All test files (`test/*.t.sol`) - Using Rust integration tests
- ❌ All scripts (`script/*.s.sol`) - Using `cargo stylus deploy`

**Total Solidity Reduction:** ~2000 lines → 288 lines (85% reduction!)

## Build

Generate Solidity ABI from Stylus contract:

```bash
cd ../stylus
cargo stylus export-abi > ../contracts/src/interfaces/IGroth16Verifier.sol
```

Build Solidity contracts (mainly for ABI export):

```bash
forge build
```

## Testing

Solidity contracts are tested as part of Stylus integration tests:

```bash
cd ../stylus
cargo test --features integration
```

End-to-end tests use the TypeScript SDK:

```bash
cd ../sdk
pnpm test
```

## Deployment

Stylus contracts are deployed using `cargo stylus`:

```bash
cd ../stylus
cargo stylus deploy \
  --endpoint https://sepolia-rollup.arbitrum.io/rpc \
  --private-key $PRIVATE_KEY
```

The Solidity proxy can be deployed separately if needed:

```bash
forge create src/Groth16VerifierProxy.sol:Groth16VerifierProxy \
  --rpc-url https://sepolia-rollup.arbitrum.io/rpc \
  --private-key $PRIVATE_KEY \
  --constructor-args <stylus-verifier-address>
```

## Gas Savings

| Operation | Pure Solidity | Stylus | Savings |
|-----------|--------------|--------|---------|
| Groth16 Verify | ~280,000 | ~61,000 | **78%** |
| Register VK | ~150,000 | ~45,000 | **70%** |

## Directory Structure

```
contracts/
├── src/
│   ├── interfaces/
│   │   └── IGroth16Verifier.sol       # ABI (50 lines)
│   ├── libraries/
│   │   └── Storage.sol                # ERC-7201 (148 lines)
│   └── Groth16VerifierProxy.sol       # Wrapper (90 lines)
├── test/                              # (empty - use Rust tests)
├── script/                            # (empty - use cargo stylus)
├── foundry.toml                       # Foundry config
├── STYLUS-ARCHITECTURE.md             # Full architecture doc
└── README.md                          # This file
```

**Total Solidity:** 288 lines (interface layer only)

## Why So Little Solidity?

1. **Verification = Rust/WASM** - All crypto happens in Stylus
2. **Gas Efficiency** - Stylus is 78% cheaper than Solidity
3. **Security** - Rust prevents memory/type errors at compile time
4. **Library Support** - Uses arkworks (battle-tested crypto library)
5. **Audit Surface** - Only 288 lines of Solidity to audit

## References

- [Stylus Package](../stylus/README.md) - Main verification logic
- [Attestor Package](../attestor/README.md) - Hybrid deployment model
- [STYLUS-ARCHITECTURE.md](./STYLUS-ARCHITECTURE.md) - Detailed architecture
- [Arbitrum Stylus Docs](https://docs.arbitrum.io/stylus/stylus-gentle-introduction)

---

**Remember:** This package is just the interface. The real verification happens in `packages/stylus` 🦀
