# 🦀 Universal ZK-Proof Verifier (UZKV)

## Research-Grade Universal ZK Verification on Arbitrum Stylus

<div align="center">

[![Build](https://img.shields.io/badge/build-passing-brightgreen)](https://github.com/draxxycodes/Universal-ZKV)
[![Rust](https://img.shields.io/badge/rust-1.84%2B-orange)](https://www.rust-lang.org/)
[![License](https://img.shields.io/badge/license-MIT-blue)](./LICENSE)
[![Stylus](https://img.shields.io/badge/arbitrum-stylus-8A2BE2)](https://arbitrum.io/stylus)

**A formally-structured universal ZK verification framework supporting heterogeneous proof systems**

[Quick Start](#-quick-start) • [Architecture](#-architecture) • [Documentation](#-documentation) • [Contributing](#-contributing)

</div>

---

## 🎯 Overview

Universal-ZKV is a **research-grade** zero-knowledge proof verification framework that provides:

- **Unified Verification Interface** — Single contract verifying Groth16, PLONK, and STARK proofs
- **Formal Verifier Algebra** — Type-safe abstractions for heterogeneous proof systems
- **Self-Describing Proofs** — Protocol-level proof format with embedded metadata
- **Cost-Aware Routing** — Pre-verification gas estimation and optimal path selection
- **Security Formalization** — Dispatch boundary validation with formal threat model

### Proof System Support

| System | Gas Cost | Setup | Security | Post-Quantum | Status |
|--------|----------|-------|----------|--------------|--------|
| **Groth16** | ~280k | Trusted | 128-bit | ❌ | ✅ Production |
| **PLONK** | ~400k | Universal | 128-bit | ❌ | ✅ Production |
| **STARK** | ~540k | Transparent | 100-128 bit | ✅ | ✅ Production |

---

## 🏗 Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                    UNIVERSAL ZKV ARCHITECTURE                       │
└─────────────────────────────────────────────────────────────────────┘

                        ┌──────────────────────┐
                        │   UniversalProof     │
                        │   Descriptor (UPD)   │ ← Self-describing 75-byte header
                        │   [types.rs]         │
                        └──────────┬───────────┘
                                   │
                        ┌──────────▼───────────┐
                        │  DispatchValidator   │ ← Security boundary checks
                        │  [security.rs]       │
                        └──────────┬───────────┘
                                   │
                        ┌──────────▼───────────┐
                        │  VerificationCost    │ ← Gas estimation & routing
                        │  [cost_model.rs]     │
                        └──────────┬───────────┘
                                   │
            ┌──────────────────────┼──────────────────────┐
            │                      │                      │
     ┌──────▼──────┐        ┌──────▼──────┐        ┌──────▼──────┐
     │  Groth16    │        │    PLONK    │        │    STARK    │
     │  Verifier   │        │   Verifier  │        │   Verifier  │
     │  [610 LOC]  │        │  [587 LOC]  │        │  [221 LOC]  │
     └─────────────┘        └─────────────┘        └─────────────┘
          ~280k                  ~400k                  ~540k
```

### Core Components

| Component | File | LOC | Purpose |
|-----------|------|-----|---------|
| **Verifier Algebra** | `verifier_traits.rs` | 380 | Formal interface for heterogeneous verification |
| **Universal Proof Descriptor** | `types.rs` | 428 | Self-describing proof format (UPD v2) |
| **Cost Model** | `cost_model.rs` | 320 | Gas estimation and path selection |
| **Security** | `security.rs` | 450 | Dispatch validation and threat model |
| **Groth16** | `groth16.rs` | 610 | BN254 pairing-based verification |
| **PLONK** | `plonk/` | 587 | KZG polynomial commitment verification |
| **STARK** | `stark/` | 221 | FRI-based transparent verification |

---

## 🔬 Research-Grade Features

### 1. Verifier Algebra (`verifier_traits.rs`)

Formal interface standardizing heterogeneous ZK verification:

```rust
pub trait ZkVerifier {
    const PROOF_SYSTEM_ID: u8;
    const NAME: &'static str;
    
    fn security_model() -> SecurityModel;
    fn gas_cost_model() -> GasCost;
    fn recursion_support() -> RecursionSupport;
    
    fn verify(proof: &[u8], public_inputs: &[u8], vk: &[u8]) -> VerifyResult;
}
```

**Key Types:**
- `SecurityModel` — Setup type, crypto assumptions, post-quantum status
- `GasCost` — Base + per-input + per-byte cost model
- `RecursionSupport` — Cross-system verification capabilities

### 2. Universal Proof Descriptor (`types.rs`)

Self-describing 75-byte proof header enabling safe dispatch and cost prediction:

```
┌─────────────────────────────────────────────────────────────┐
│ UPD v2 Binary Layout (75 bytes)                             │
├─────────────────────────────────────────────────────────────┤
│ upd_version      │ 1 byte  │ Format version (2)             │
│ proof_system_id  │ 1 byte  │ 0=Groth16, 1=PLONK, 2=STARK    │
│ curve_id         │ 1 byte  │ BN254, BLS12-381, Pasta, etc.  │
│ hash_function_id │ 1 byte  │ Poseidon, SHA256, Blake3, etc. │
│ recursion_depth  │ 1 byte  │ 0=base, 1+=recursive           │
│ public_inputs    │ 2 bytes │ Number of public inputs        │
│ proof_length     │ 4 bytes │ Proof size in bytes            │
│ vk_commitment    │ 32 bytes│ Keccak256 of verification key  │
│ circuit_id       │ 32 bytes│ Application-specific identifier│
└─────────────────────────────────────────────────────────────┘
```

### 3. Cost-Aware Verification (`cost_model.rs`)

Pre-verification gas estimation and optimal path selection:

```rust
// Estimate gas before verification
let cost = VerificationCost::from_descriptor(&descriptor);
println!("Estimated gas: {}", cost.estimated_total);

// Select cheapest verification path
let options = vec![groth16_cost, plonk_cost, stark_cost];
let cheapest = select_cheapest(&options); // Returns index

// Budget-aware routing with safety margin
if should_verify(&cost, gas_limit, 10) { // 10% margin
    verifier.verify(proof, inputs, vk);
}
```

### 4. Security Formalization (`security.rs`)

Formal threat model with dispatch boundary validation:

| Threat | Attack Vector | Mitigation |
|--------|---------------|------------|
| Proof Type Confusion | Submit Groth16 as PLONK | VK binding check |
| Curve Mismatch | BLS12-381 on BN254 verifier | Curve ID validation |
| VK Substitution | Swap VK for invalid proofs | VK commitment binding |
| Recursion Bomb | Unbounded recursive depth | Depth limit (max 16) |
| Input Overflow | Excessive public inputs | Size limit validation |

```rust
let validator = DispatchValidator::new();
validator.validate_all(&descriptor, &registered_vk, &security_model)?;
```

---

## 📁 Repository Structure

```
packages/
├── stylus/                          # ← CORE VERIFIER (Rust/WASM)
│   ├── src/
│   │   ├── lib.rs                   # Entry point, exports
│   │   ├── verifier_traits.rs       # Verifier Algebra (380 LOC)
│   │   ├── types.rs                 # UPD v2 format (983 LOC)
│   │   ├── cost_model.rs            # Gas estimation (320 LOC)
│   │   ├── security.rs              # Dispatch validation (450 LOC)
│   │   ├── groth16.rs               # Groth16 verifier (610 LOC)
│   │   ├── plonk/                   # PLONK verifier (587 LOC)
│   │   └── stark/                   # STARK verifier (221 LOC)
│   └── Cargo.toml
│
├── circuits/                        # Circom circuits
│   ├── poseidon_test.circom
│   ├── eddsa_verify.circom
│   └── merkle_proof.circom
│
└── sdk/                             # TypeScript SDK
    └── src/index.ts
```

---

## 🚀 Quick Start

### Prerequisites

- Rust nightly-2024-12-01+
- Node.js 18+
- pnpm

### Build

```bash
# Clone repository
git clone https://github.com/draxxycodes/Universal-ZKV
cd Universal-ZKV

# Build Stylus contract
cd packages/stylus
cargo build --release --target wasm32-unknown-unknown

# Verify build
cargo check  # Should pass with only warnings
```

### Usage Example

```rust
use uzkv_stylus::{
    // Verifier Algebra
    ZkVerifier, Groth16Verifier, SecurityModel, GasCost,
    
    // Universal Proof Descriptor
    UniversalProofDescriptor, CurveId, HashFunctionId,
    
    // Cost-Aware Verification
    VerificationCost, select_cheapest, should_verify,
    
    // Security
    DispatchValidator, RegisteredVK, SecurityError,
};

// Create a proof descriptor
let descriptor = UniversalProofDescriptor::groth16(4, vk_hash, circuit_id);

// Estimate gas
let cost = VerificationCost::from_descriptor(&descriptor);
println!("Estimated: {} gas", cost.estimated_total);

// Validate security
let validator = DispatchValidator::new();
validator.validate_all(&descriptor, &vk, &Groth16Verifier::security_model())?;

// Verify proof
let result = Groth16Verifier::verify(&proof, &public_inputs, &vk);
```

---

## 📊 Performance

| Operation | Groth16 | PLONK | STARK |
|-----------|---------|-------|-------|
| Base Gas | 250k | 350k | 200k |
| Per Input | 40k | 10k | 5k |
| Per Byte | 0 | 0 | 10 |
| Typical Total | ~330k | ~390k | ~700k |

**Batch Discount:** 5% per additional proof (max 30%)

---

## 🧪 Testing

```bash
cd packages/stylus

# Run all tests
cargo test

# Specific modules
cargo test groth16
cargo test plonk
cargo test stark
cargo test cost_model
cargo test security
```

---

## 🔒 Security

### Threat Model

The security module implements a formal threat model covering:

1. **Proof-VK Binding** — Proofs only verify against intended VK
2. **Type Safety** — Proof system ID must match registered VK
3. **Curve Compatibility** — Proof curve must match verifier
4. **Bounded Inputs** — Public inputs within verifier limits

### Validation Modes

| Mode | Max Recursion | Post-Quantum | Use Case |
|------|---------------|--------------|----------|
| Default | 8 | Optional | Standard verification |
| Strict | 4 | Required | High-value operations |

---

## � Roadmap

- [x] **Phase 0-1:** Verifier Algebra + PLONK/STARK enhancements
- [x] **Phase 2:** Universal Proof Descriptor (UPD v2)
- [x] **Phase 3:** Cost-Aware Verification
- [x] **Phase 4:** Security Formalization
- [ ] **Phase 5:** SDK TypeScript updates
- [ ] **Phase 6:** Mainnet deployment

---

## 📄 License

MIT License — see [LICENSE](./LICENSE) for details.

---

## 🙏 Acknowledgments

- **Arbitrum** — Stylus runtime
- **arkworks** — Cryptographic primitives
- **snarkjs** — Proof generation
- **circom** — Circuit compiler

---

<div align="center">

**Built for the zero-knowledge proof research community**

[GitHub](https://github.com/draxxycodes/Universal-ZKV) • [Issues](https://github.com/draxxycodes/Universal-ZKV/issues)

</div>
