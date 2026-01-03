# 🦀 Universal ZK-Proof Verifier (UZKV)

## 🏆 Winner: Arbitrum Launchpad 2025 (First Place)
*> "Because apparently, verifying zero-knowledge proofs on-chain shouldn't cost more than the GDP of a small nation."*

---

<div align="center">

[![Build](https://img.shields.io/badge/build-passing-brightgreen)](https://github.com/draxxycodes/Universal-ZKV)
[![Rust](https://img.shields.io/badge/rust-1.84%2B-orange)](https://www.rust-lang.org/)
[![License](https://img.shields.io/badge/license-Proprietary-red)](./LICENSE)
[![Stylus](https://img.shields.io/badge/arbitrum-stylus-8A2BE2)](https://arbitrum.io/stylus)

**A formally-structured universal ZK verification framework supporting heterogeneous proof systems.**

[Quick Start](#-quick-start) • [Architecture](#-architecture) • [SDK Usage](#-sdk-usage) • [Security](#-security)

</div>

---

## 🎯 Overview

Universal-ZKV is a **research-grade** zero-knowledge proof verification engine built for **Arbitrum Stylus**. It allows you to verify proofs from **any** major system (Groth16, PLONK, STARK) through a single, unified smart contract interface.

By leveraging Stylus (WASM), we achieve **10x gas savings** compared to Solidity implementations, enabling complex verifiers (like STARKs) that were previously too expensive for EVM.

### Proof System Support

| System | Gas Cost | Setup | Security | Status |
|--------|----------|-------|----------|--------|
| **Groth16** | ~200k | Trusted | 128-bit | ✅ **Production** (Precompiles / Arkworks) |
| **PLONK** | ~320k | Universal | 128-bit | ✅ **Production** (KZG / Arkworks) |
| **STARK** | ~500k | Transparent | Post-Quantum | ✅ **Production** (Generic AIR Engine) |

---

## 🏗 Architecture

```mermaid
graph TD
    User[User / SDK] -->|UniversalProof| Contract[UZKV Contract (Stylus)]
    
    subgraph "Universal ZKV Engine"
        Contract --> Dispatch[Unified Dispatcher]
        
        Dispatch --> Security[Security Validator]
        Security -->|Binding Check| Registry[VK Registry]
        
        Dispatch --> Cost[Cost Model]
        Cost -->|Gas Check| Verifiers
        
        subgraph "Verifiers"
            Verifiers -->|Route| G16[Groth16 Verifier]
            Verifiers -->|Route| PLONK[PLONK Verifier]
            Verifiers -->|Route| STARK[STARK Verifier]
        end
    end
```

### Core Components

1.  **Unified Dispatcher**: A single entry point (`verifyUniversalProof`) that routes proofs based on type and version.
2.  **Dispatch Validator**: A formal security layer that enforces **Triple Binding** `(ProofType, ProgramID, VKHash)` to prevent cross-protocol attacks.
3.  **Cost-Aware Routing**: Calculates exact gas costs *before* verification begins, rejecting transactions that would run out of gas.
4.  **EVM Precompiles**: Uses raw `ECADD`, `ECMUL`, and `ECPAIRING` precompiles for maximum performance in Groth16 and PLONK.

---

## 🚀 Quick Start

### Prerequisites
- Rust (nightly-2025-01-01+)
- `cargo-stylus` (`cargo install --force cargo-stylus`)

### 1. Deploy to Arbitrum Sepolia
We provide a one-click deployment script:

```bash
# Set your private key
export PRIVATE_KEY=0x...
export ARB_SEPOLIA_RPC=...

# Deploy!
./scripts/deploy-stylus.sh
```

### 2. Verify Deployment
Run the End-to-End integration tests:

```bash
export DEPLOYED_ADDRESS=$(jq -r .contractAddress deployments/stylus-deployment.json)
cd packages/sdk
npm test src/e2e.test.ts
```

---

## 💻 SDK & CLI Usage

### Command Line Interface (CLI)

Verify proofs off-chain using the Rust-based CLI:

```bash
# Build
cargo build --bin uzkv-cli --features std --release

# Verify
./target/release/uzkv-cli -t groth16 -p proof.bin -i inputs.bin -v vk.bin
```

### SDK Usage

Interact with the system using our Type-Safe SDK:

```typescript
import { createContractClient, ProofType } from "@uzkv/sdk";

const client = createContractClient({
  contractAddress: "0x...",
  rpcUrl: "https://sepolia-rollup.arbitrum.io/rpc",
  privateKey: "0x..."
});

// 1. Estimate Cost
const gas = await client.estimateVerificationCost(ProofType.Groth16, 2);
console.log(`Estimated Gas: ${gas}`);

// 2. Verify Proof
const valid = await client.verifyUniversalProof({
  version: 1,
  proofType: ProofType.Groth16,
  programId: 1,
  vkHash: "0x...",
  proofBytes: "0x...",
  publicInputsBytes: "0x..."
});
```

---

## 🔒 Security Model

We enforce a **Triple Binding Invariant** to ensure cryptographic safety in a multi-protocol environment:

> **Invariant**: A proof $\pi$ is valid if and only if it verifies against a Verification Key $VK$ that is explicitly registered for the tuple $(ProofType, ProgramID, VKHash)$.

### Attack Mitigations

| Threat | Attack Vector | UZKV Mitigation |
|--------|---------------|-----------------|
| **Type Confusion** | Submit PLONK proof to Groth16 verifier | `ProofType` is strictly enforced by the dispatcher. |
| **VK Substitution** | Use a valid VK from a different circuit | `ProgramID` namespaces all Verification Keys. |
| **Recursion Bomb** | Infinite recursion depth | Formal depth limit (max 8) checked at entry. |
| **Gas Griefing** | Submit computationally heavy invalid proofs | Cost model validates budget *before* complex math. |

---

## 🗺 Roadmap

- [x] **Phase 1:** Groth16 Core (Precompiled)
- [x] **Phase 2:** PLONK Verifier (KZG + EIP-1108)
- [x] **Phase 3:** Cost-Aware Gas Model
- [x] **Phase 4:** Security Formalization & Dispatch
- [x] **Phase 5:** STARK Verifier (FRI + Merkle)
- [x] **Phase 6:** SDK & Contract Clients
- [x] **Phase 7:** Deployment Tooling
- [ ] **Phase 8:** Mainnet Audit & Launch

---

## 📄 License

**Proprietary / All Rights Reserved.**
This software is currently **UNLICENSED** for public use. Copyright 2025 `draxxycodes`.

---

<div align="center">

**Built with ❤️ for the Arbitrum Community**
[GitHub](https://github.com/draxxycodes/Universal-ZKV)

</div>
