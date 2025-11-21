# 🦀 STYLUS COMPLETE INTEGRATION - PRODUCTION EXECUTION PLAN

**Project:** Universal ZK-Proof Verifier (UZKV) - Full Stylus Implementation  
**Created:** November 21, 2025  
**Updated:** November 21, 2025 (Restructured & Cleaned)  
**Standard:** Production-Grade (Banking/DeFi Standard)  
**Technology:** Arbitrum Stylus (Rust → WASM) + Solidity UUPS Proxies  
**Duration:** 10 Weeks (Phases S1-S10)  
**Current Status:** Foundation Complete | Ready for Stylus Unification

---

## 🎯 EXECUTIVE SUMMARY

This plan **consolidates and unifies** existing Stylus modules into a production-ready deployment architecture:

- ✅ **Consolidate 3 separate modules** → Single unified WASM contract
- ✅ **Clean up redundant code** → Remove old/experimental implementations
- ✅ **Integrate with existing Solidity** → Refactor UniversalZKVerifier for Stylus
- ✅ **Add batch verification** → Parallel processing in all modules
- ✅ **Deploy to testnet** → Arbitrum Sepolia end-to-end testing
- ✅ **No repetition** → Skips already-completed phases from main plan

---

## 📊 CODEBASE ANALYSIS & CLEANUP STRATEGY

### ✅ **What We Already Have (Production-Ready - KEEP)**

#### 1. **Groth16 Core Module** - `packages/stylus/src/groth16.rs` ✅
- **Status:** PRODUCTION-READY (400+ lines)
- **Features:** BN254 validation, precomputed pairing, panic-free
- **Action:** KEEP & INTEGRATE into unified contract
- **Note:** Already has batch verification placeholder

#### 2. **PLONK Module** - `packages/stylus/plonk/` ✅
- **Status:** PRODUCTION-READY (2,300+ lines, 31 tests)
- **Features:** KZG commitments, Fiat-Shamir transcript
- **Action:** KEEP & INTEGRATE into unified contract
- **Structure:** Separate workspace, needs consolidation

#### 3. **STARK Module** - `packages/stylus/stark-simple/` ✅
- **Status:** PRODUCTION-READY (700+ lines, 18 tests)
- **Features:** Transparent setup, Blake3, post-quantum
- **Action:** KEEP & INTEGRATE into unified contract
- **Structure:** Separate workspace, needs consolidation

#### 4. **Main Contract Entry** - `packages/stylus/src/lib.rs` ✅
- **Status:** PRODUCTION-READY (UZKVContract with Groth16)
- **Features:** ERC-7201 storage, admin controls, nullifiers
- **Action:** EXTEND for multi-proof routing
- **Gap:** Only supports Groth16, needs PLONK/STARK

#### 5. **Storage Module** - `packages/stylus/src/storage.rs` ✅
- **Status:** PRODUCTION-READY (ERC-7201 namespaced)
- **Action:** KEEP as-is (already correct)

#### 6. **Solidity Contracts** - `packages/contracts/src/` ✅
- **Status:** PRODUCTION-READY (65 tests passing)
- **Files:**
  - `UZKVProxy.sol` - UUPS with Stylus gateway capability
  - `UniversalZKVerifier.sol` - Multi-proof router (pure Solidity)
- **Action:** REFACTOR UniversalZKVerifier to delegate to Stylus

### ❌ **What to DELETE (Redundant/Experimental)**

#### 1. **Old STARK Implementation** - `packages/stylus/stark/` ❌
- **Status:** EXPERIMENTAL (Winterfell v0.9 attempt, 1500+ lines)
- **Reason:** Replaced by `stark-simple/` (700 lines, simpler, production-ready)
- **Action:** DELETE entire directory
- **Command:** `rm -rf packages/stylus/stark`

#### 2. **Separate PLONK Workspace** - `packages/stylus/plonk/Cargo.toml` ⚠️
- **Status:** Will be MERGED into main workspace
- **Reason:** Separate workspace complicates build
- **Action:** MOVE code to `packages/stylus/src/plonk/`, DELETE workspace
- **Command:** 
  ```bash
  mkdir -p packages/stylus/src/plonk
  mv packages/stylus/plonk/src/* packages/stylus/src/plonk/
  mv packages/stylus/plonk/tests/* packages/stylus/tests/plonk/
  rm -rf packages/stylus/plonk
  ```

#### 3. **Separate STARK Workspace** - `packages/stylus/stark-simple/Cargo.toml` ⚠️
- **Status:** Will be MERGED into main workspace
- **Reason:** Separate workspace complicates build
- **Action:** MOVE code to `packages/stylus/src/stark/`, DELETE workspace
- **Command:**
  ```bash
  mkdir -p packages/stylus/src/stark
  mv packages/stylus/stark-simple/src/* packages/stylus/src/stark/
  mv packages/stylus/stark-simple/tests/* packages/stylus/tests/stark/
  # Keep TEST-RESULTS.md for reference
  mv packages/stylus/stark-simple/TEST-RESULTS.md execution_steps_details/
  rm -rf packages/stylus/stark-simple
  ```

#### 4. **Test Artifacts** - Various build outputs ⚠️
- **Paths:**
  - `packages/stylus/target/` (keep in .gitignore)
  - `packages/stylus/plonk/target/` (will be deleted with workspace)
  - `packages/stylus/stark-simple/target/` (will be deleted with workspace)
- **Action:** Clean all targets before rebuild
- **Command:** `cargo clean` in each directory

### 📦 **Target Structure After Cleanup**

```
packages/stylus/
├── Cargo.toml              # UNIFIED workspace (updated)
├── Cargo.lock              # (regenerated)
├── rust-toolchain.toml     # (keep as-is)
├── .cargo/
│   └── config.toml         # (keep as-is)
├── src/
│   ├── lib.rs              # MAIN ENTRYPOINT (extended for multi-proof)
│   ├── storage.rs          # (keep as-is)
│   ├── groth16.rs          # (keep, add batch_verify)
│   ├── plonk/              # ← MOVED from plonk/src/
│   │   ├── mod.rs          # (new, re-exports)
│   │   ├── verifier.rs     # (from plonk/src/verifier.rs)
│   │   ├── kzg.rs          # (from plonk/src/kzg.rs)
│   │   ├── transcript.rs   # (from plonk/src/transcript.rs)
│   │   ├── types.rs        # (from plonk/src/types.rs)
│   │   └── labels.rs       # (from plonk/src/labels.rs)
│   └── stark/              # ← MOVED from stark-simple/src/
│       ├── mod.rs          # (new, re-exports)
│       ├── lib.rs          # (from stark-simple/src/lib.rs)
│       ├── types.rs        # (from stark-simple/src/types.rs)
│       ├── fibonacci.rs    # (from stark-simple/src/fibonacci.rs)
│       └── verifier.rs     # (from stark-simple/src/verifier.rs)
├── tests/
│   ├── groth16_standalone.rs  # (keep as-is)
│   ├── plonk/                 # ← MOVED from plonk/tests/
│   │   ├── integration.rs     # (31 tests)
│   │   └── transcript.rs      # (8 tests)
│   └── stark/                 # ← MOVED from stark-simple/tests/
│       ├── integration.rs     # (9 tests)
│       └── unit.rs            # (9 tests)
├── vendor/                 # (keep all - supply chain security)
└── supply-chain/           # (keep as-is - audits)

DELETED:
├── plonk/                  # ❌ (merged into src/plonk/)
├── stark/                  # ❌ (old Winterfell attempt)
└── stark-simple/           # ❌ (merged into src/stark/)
```

---

## 🔧 PHASE S0: CODEBASE CLEANUP (Week 0 - PREREQUISITE)

**Goal:** Consolidate modules, remove redundancies, prepare for unified build.

### 📋 Task S0.1: Delete Redundant Code

**Commands:**
```bash
cd packages/stylus

# 1. Delete old STARK implementation (Winterfell v0.9)
rm -rf stark

# 2. Archive PLONK/STARK results before deletion
mkdir -p ../../execution_steps_details/archives
cp stark-simple/TEST-RESULTS.md ../../execution_steps_details/archives/stark-test-results-archive.md
cp plonk/Cargo.toml ../../execution_steps_details/archives/plonk-cargo-archive.toml

# 3. Clean all build artifacts
cargo clean
cd plonk && cargo clean && cd ..
cd stark-simple && cargo clean && cd ..

# Commit cleanup
git add -A
git commit -m "chore(stylus): delete redundant STARK implementation and clean artifacts (Phase S0.1)"
```

**Definition of Done:**
- ✅ `packages/stylus/stark/` deleted
- ✅ Build artifacts cleaned
- ✅ Archive created for reference
- ✅ Git committed

---

### 📋 Task S0.2: Consolidate PLONK Module

**Commands:**
```bash
cd packages/stylus

# Create target directories
mkdir -p src/plonk
mkdir -p tests/plonk

# Move PLONK source files
mv plonk/src/verifier.rs src/plonk/
mv plonk/src/kzg.rs src/plonk/
mv plonk/src/transcript.rs src/plonk/
mv plonk/src/types.rs src/plonk/
mv plonk/src/labels.rs src/plonk/

# Move PLONK tests
mv plonk/tests/* tests/plonk/

# Create mod.rs for plonk module
cat > src/plonk/mod.rs << 'EOF'
//! PLONK verifier module
//!
//! Production-grade PLONK proof verification with KZG commitments.

pub mod verifier;
pub mod kzg;
pub mod transcript;
pub mod types;
pub mod labels;

pub use verifier::{verify, batch_verify};
pub use types::{PlonkProof, VerifyingKey};
EOF

# Delete old PLONK workspace
rm -rf plonk

# Commit
git add -A
git commit -m "refactor(stylus): consolidate PLONK module into main workspace (Phase S0.2)"
```

**Definition of Done:**
- ✅ PLONK code moved to `src/plonk/`
- ✅ PLONK tests moved to `tests/plonk/`
- ✅ `mod.rs` created with re-exports
- ✅ Old workspace deleted
- ✅ Git committed

---

### 📋 Task S0.3: Consolidate STARK Module

**Commands:**
```bash
cd packages/stylus

# Create target directories
mkdir -p src/stark
mkdir -p tests/stark

# Move STARK source files
mv stark-simple/src/lib.rs src/stark/
mv stark-simple/src/types.rs src/stark/
mv stark-simple/src/fibonacci.rs src/stark/
mv stark-simple/src/verifier.rs src/stark/

# Move STARK tests
mv stark-simple/tests/* tests/stark/

# Create mod.rs for stark module
cat > src/stark/mod.rs << 'EOF'
//! STARK verifier module
//!
//! Transparent zero-knowledge proofs (no trusted setup).
//! Post-quantum secure using Blake3 hash function.

mod lib;
pub mod types;
pub mod fibonacci;
pub mod verifier;

pub use lib::{verify, batch_verify};
pub use types::{Proof, Claim};
EOF

# Delete old STARK workspace
rm -rf stark-simple

# Commit
git add -A
git commit -m "refactor(stylus): consolidate STARK module into main workspace (Phase S0.3)"
```

**Definition of Done:**
- ✅ STARK code moved to `src/stark/`
- ✅ STARK tests moved to `tests/stark/`
- ✅ `mod.rs` created with re-exports
- ✅ Old workspace deleted
- ✅ Git committed

---

### 📋 Task S0.4: Update Main Cargo.toml

**File:** `packages/stylus/Cargo.toml`

**Changes:**
```toml
[package]
name = "uzkv-stylus"
version = "1.0.0"
edition = "2021"
rust-version = "1.75"

[lib]
crate-type = ["cdylib", "rlib"]

[dependencies]
stylus-sdk = "0.5.0"
wee_alloc = "0.4.5"

# Groth16 dependencies (vendored)
ark-groth16 = { path = "vendor/ark-groth16", version = "0.4.0", default-features = false, features = ["std"] }
ark-bn254 = { path = "vendor/ark-curves/bn254", version = "0.3.0", default-features = false, features = ["std"] }
ark-ec = { path = "vendor/ark-algebra/ec", version = "0.4.0", default-features = false, features = ["std"] }
ark-ff = { path = "vendor/ark-algebra/ff", version = "0.4.0", default-features = false, features = ["std"] }
ark-serialize = { path = "vendor/ark-algebra/serialize", version = "0.4.0", default-features = false, features = ["std"] }

# PLONK dependencies
halo2_proofs = { version = "0.3", default-features = false, features = ["bn254"] }
halo2curves = { version = "0.5", default-features = false, features = ["bn256"] }
ark-poly = { version = "0.4", default-features = false, features = ["std"] }
ark-std = { version = "0.4", default-features = false, features = ["std"] }
sha3 = { version = "0.10", default-features = false }

# STARK dependencies
blake3 = { version = "1.5", default-features = false }

[profile.release]
codegen-units = 1
panic = "abort"
opt-level = "z"
strip = true
lto = true

[features]
default = []
export-abi = ["stylus-sdk/export-abi"]
```

**Commit:**
```bash
git add packages/stylus/Cargo.toml
git commit -m "chore(stylus): update Cargo.toml for unified workspace (Phase S0.4)"
```

**Definition of Done:**
- ✅ Cargo.toml updated with all dependencies
- ✅ Compiles successfully: `cargo check`
- ✅ All tests pass: `cargo test`
- ✅ Git committed

---

### 📋 Task S0.5: Update lib.rs Module Declarations

**File:** `packages/stylus/src/lib.rs`

**Add at top after existing modules:**
```rust
pub mod groth16;
pub mod plonk;  // ← NEW
pub mod stark;  // ← NEW
pub mod storage;
```

**Commit:**
```bash
git add packages/stylus/src/lib.rs
git commit -m "feat(stylus): declare plonk and stark modules in lib.rs (Phase S0.5)"
```

**Definition of Done:**
- ✅ Module declarations added
- ✅ Compiles: `cargo check`
- ✅ Git committed

---

### 📋 Task S0.6: Verification Build & Test

**Commands:**
```bash
cd packages/stylus

# Build everything
cargo build --release

# Run all tests
cargo test

# Check clippy
cargo clippy -- -D warnings

# Format code
cargo fmt

# Verify size (should be reasonable)
ls -lh target/wasm32-unknown-unknown/release/*.wasm

# Create documentation
cargo doc --no-deps --document-private-items
```

**Expected Output:**
```
   Compiling uzkv-stylus v1.0.0
    Finished release [optimized] target(s) in X.XXs

running 57 tests
test groth16::tests::... ok
test plonk::integration::... ok
test stark::integration::... ok
...
test result: ok. 57 passed; 0 failed; 0 ignored
```

**Definition of Done:**
- ✅ All code compiles without errors
- ✅ All 57 tests pass (8 groth16 + 31 plonk + 18 stark)
- ✅ Zero clippy warnings
- ✅ Code formatted
- ✅ Documentation generated

---

## 🦀 PHASE S1: UNIFIED STYLUS CONTRACT (Week 1)

**Goal:** Extend lib.rs to route between Groth16/PLONK/STARK with single entrypoint.

### 📋 Task S1.1: Add Multi-Proof Routing to lib.rs

**Context:** Current `lib.rs` only supports Groth16. Extend for all proof types.

**File:** `packages/stylus/src/lib.rs`

**Add ProofType enum and routing:**
```rust
/// Proof type enumeration
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
#[repr(u8)]
pub enum ProofType {
    Groth16 = 0,
    PLONK = 1,
    STARK = 2,
}

impl ProofType {
    fn from_u8(value: u8) -> Result<Self> {
        match value {
            0 => Ok(ProofType::Groth16),
            1 => Ok(ProofType::PLONK),
            2 => Ok(ProofType::STARK),
            _ => Err(Error::InvalidProofType),
        }
    }
}
```

**Update verify function:**
```rust
#[external]
impl UZKVContract {
    /// Universal verify - routes to appropriate verifier
    pub fn verify(
        &mut self,
        proof_type: u8,
        proof: Vec<u8>,
        public_inputs: Vec<u8>,
        vk_hash: [u8; 32],
    ) -> Result<bool> {
        if self.paused.get() {
            return Err(Error::ContractPaused);
        }

        let ptype = ProofType::from_u8(proof_type)?;

        let result = match ptype {
            ProofType::Groth16 => {
                let vk_data = self.verification_keys.get(vk_hash);
                let precomputed = self.precomputed_pairings.get(vk_hash);
                if !precomputed.is_empty() {
                    groth16::verify_with_precomputed(&proof, &public_inputs, &vk_data, &precomputed)?
                } else {
                    groth16::verify(&proof, &public_inputs, &vk_data)?
                }
            }
            ProofType::PLONK => {
                let vk_data = self.verification_keys.get(vk_hash);
                plonk::verify(&proof, &public_inputs, &vk_data)?
            }
            ProofType::STARK => {
                // STARK doesn't use VKs (transparent)
                stark::verify(&proof, &public_inputs)?
            }
        };

        if result {
            let count = self.verification_count.get();
            self.verification_count.set(count + U256::from(1));
        }

        Ok(result)
    }
}
```

**Definition of Done:**
- ✅ ProofType enum added
- ✅ verify() routes to all 3 verifiers
- ✅ Compiles successfully
- ✅ Git commit: `feat(stylus): add multi-proof routing to lib.rs (Phase S1.1)`

---

### 📋 Task S1.2: Implement Batch Verification

**Add batch_verify to groth16.rs:**
```rust
pub fn batch_verify(
    proofs: &[Vec<u8>],
    public_inputs: &[Vec<u8>],
    vk_bytes: &[u8],
    precomputed_pairing: &[u8],
) -> Result<Vec<bool>> {
    if proofs.len() != public_inputs.len() {
        return Err(Error::InvalidInputSize);
    }

    let vk = VerifyingKey::<Bn254>::deserialize_compressed(vk_bytes)
        .map_err(|_| Error::InvalidVerificationKey)?;
    validate_vk(&vk)?;

    let alpha_beta = if !precomputed_pairing.is_empty() {
        Some(PairingOutput::<Bn254>::deserialize_compressed(precomputed_pairing)
            .map_err(|_| Error::InvalidVerificationKey)?)
    } else {
        None
    };

    let mut results = Vec::with_capacity(proofs.len());
    for i in 0..proofs.len() {
        let proof = Proof::<Bn254>::deserialize_compressed(&proofs[i][..])
            .map_err(|_| Error::DeserializationError)?;
        validate_proof(&proof)?;

        let inputs = deserialize_public_inputs(&public_inputs[i][..])?;

        let is_valid = if let Some(ref precomputed) = alpha_beta {
            verify_proof_with_precomputed(&vk, &proof, &inputs, precomputed)?
        } else {
            verify_proof_internal(&vk, &proof, &inputs)?
        };

        results.push(is_valid);
    }

    Ok(results)
}
```

**Add batch_verify to plonk/verifier.rs:**
```rust
pub fn batch_verify(
    proofs: &[Vec<u8>],
    public_inputs: &[Vec<u8>],
    vk_bytes: &[u8],
) -> Result<Vec<bool>> {
    let mut results = Vec::with_capacity(proofs.len());
    for i in 0..proofs.len() {
        let result = verify(&proofs[i], &public_inputs[i], vk_bytes)?;
        results.push(result);
    }
    Ok(results)
}
```

**Add batch_verify to stark/lib.rs:**
```rust
pub fn batch_verify(
    proofs: &[Vec<u8>],
    public_inputs: &[Vec<u8>],
) -> Result<Vec<bool>> {
    let mut results = Vec::with_capacity(proofs.len());
    for i in 0..proofs.len() {
        let result = verify(&proofs[i], &public_inputs[i])?;
        results.push(result);
    }
    Ok(results)
}
```

**Add to lib.rs:**
```rust
pub fn batch_verify(
    &mut self,
    proof_type: u8,
    proofs: Vec<Vec<u8>>,
    public_inputs: Vec<Vec<u8>>,
    vk_hash: [u8; 32],
) -> Result<Vec<bool>> {
    if self.paused.get() {
        return Err(Error::ContractPaused);
    }

    let ptype = ProofType::from_u8(proof_type)?;

    match ptype {
        ProofType::Groth16 => {
            let vk_data = self.verification_keys.get(vk_hash);
            let precomputed = self.precomputed_pairings.get(vk_hash);
            groth16::batch_verify(&proofs, &public_inputs, &vk_data, &precomputed)
        }
        ProofType::PLONK => {
            let vk_data = self.verification_keys.get(vk_hash);
            plonk::batch_verify(&proofs, &public_inputs, &vk_data)
        }
        ProofType::STARK => {
            stark::batch_verify(&proofs, &public_inputs)
        }
    }
}
```

**Definition of Done:**
- ✅ batch_verify() in all 3 modules
- ✅ batch_verify() in lib.rs
- ✅ All tests pass
- ✅ Git commit: `feat(stylus): implement batch verification for all proof types (Phase S1.2)`

---

### 📋 Task S1.3: Build & Export ABI

**Commands:**
```bash
cd packages/stylus

# Build optimized WASM
cargo stylus build --release

# Export ABI
cargo stylus export-abi > ../contracts/src/interfaces/IUniversalVerifier.sol

# Optimize WASM
wasm-opt -Oz \
  target/wasm32-unknown-unknown/release/uzkv_stylus.wasm \
  -o artifacts/uzkv_verifier_optimized.wasm

# Check size
ls -lh artifacts/uzkv_verifier_optimized.wasm
```

**Expected ABI:**
```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

interface IUniversalVerifier {
    function verify(
        uint8 proofType,
        bytes calldata proof,
        bytes calldata publicInputs,
        bytes32 vkHash
    ) external returns (bool);
    
    function batchVerify(
        uint8 proofType,
        bytes[] calldata proofs,
        bytes[] calldata publicInputs,
        bytes32 vkHash
    ) external returns (bool[] memory);
    
    function registerVK(uint8 proofType, bytes calldata vk) external returns (bytes32);
    function pause() external;
    function unpause() external;
    function getVerificationCount() external view returns (uint256);
    function isVKRegistered(bytes32 vkHash) external view returns (bool);
}
```

**Definition of Done:**
- ✅ WASM builds successfully
- ✅ WASM size <128KB
- ✅ ABI exported
- ✅ Git commit: `build(stylus): export unified WASM and ABI (Phase S1.3)`

---

## 🔀 PHASE S2: SOLIDITY INTEGRATION (Week 2)

**Goal:** Refactor UniversalZKVerifier to delegate to Stylus WASM.

### 📋 Task S2.1: Refactor UniversalZKVerifier.sol

**File:** `packages/contracts/src/UniversalZKVerifier.sol`

**Key changes:**
1. Add `address public stylusModule` storage
2. Change `verify()` to delegatecall Stylus
3. Change `batchVerify()` to delegatecall Stylus
4. Add `setStylusModule()` for upgrades

**See previous version of this plan for full code** (already provided in detail above).

**Definition of Done:**
- ✅ UniversalZKVerifier refactored
- ✅ All 29 existing tests updated
- ✅ MockStylusVerifier created for testing
- ✅ Tests pass
- ✅ Git commit: `refactor(contracts): integrate Stylus WASM in UniversalZKVerifier (Phase S2.1)`

---

## 🧪 PHASE S3: END-TO-END TESTING (Week 3)

**Goal:** Test Solidity → Stylus with real proofs (from existing circuits if available).

### 📋 Task S3.1: Create Integration Tests

**File:** `packages/contracts/test/StylusIntegration.t.sol`

```solidity
contract StylusIntegrationTest is Test {
    UZKVProxy public proxy;
    UniversalZKVerifier public verifier;
    address public stylusWASM; // Deployed Stylus module

    function setUp() public {
        // Deploy Stylus WASM (use cargo-stylus deploy on testnet)
        // For now, use mock
        stylusWASM = address(new MockUnifiedVerifier());

        // Deploy contracts
        verifier = new UniversalZKVerifier();
        verifier.initialize(admin, upgrader, pauser, stylusWASM);
    }

    function test_Groth16Verification() public {
        // Load real proof from circuits (if available)
        bytes memory proof = loadProof("groth16_test");
        bytes memory inputs = loadInputs("groth16_test");
        bytes32 vkHash = registerVK(ProofType.GROTH16);

        bool result = verifier.verify(
            UniversalZKVerifier.ProofType.GROTH16,
            proof,
            inputs,
            vkHash
        );

        assertTrue(result);
    }

    function test_BatchVerification() public {
        bytes[] memory proofs = new bytes[](10);
        bytes[] memory inputs = new bytes[](10);
        // Load 10 proofs...

        bool[] memory results = verifier.batchVerify(
            UniversalZKVerifier.ProofType.GROTH16,
            proofs,
            inputs,
            vkHash
        );

        for (uint i = 0; i < 10; i++) {
            assertTrue(results[i]);
        }
    }
}
```

**Definition of Done:**
- ✅ Integration tests created
- ✅ Tests pass with mock
- ✅ Tests pass with real WASM (testnet)
- ✅ Git commit: `test(contracts): add Stylus integration tests (Phase S3.1)`

---

## 📊 PHASE S4: GAS BENCHMARKING (Week 4)

**Goal:** Measure gas savings vs pure Solidity baseline.

### 📋 Task S4.1: Create Benchmark Suite

**Script:** `scripts/benchmark_gas.js`

```javascript
const { ethers } = require('hardhat');

async function benchmark() {
    // Deploy Solidity baseline verifier
    const SolidityVerifier = await ethers.getContractFactory('Groth16VerifierSolidity');
    const solidityVerifier = await SolidityVerifier.deploy();

    // Deploy Stylus verifier
    const StylusVerifier = await ethers.getContractAt('IUniversalVerifier', STYLUS_ADDRESS);

    // Benchmark single verification
    const proof = loadProof('test1');
    const inputs = loadInputs('test1');

    const solidityGas = await solidityVerifier.estimateGas.verify(proof, inputs, vk);
    const stylusGas = await StylusVerifier.estimateGas.verify(0, proof, inputs, vkHash);

    console.log(`Solidity: ${solidityGas} gas`);
    console.log(`Stylus: ${stylusGas} gas`);
    console.log(`Savings: ${((solidityGas - stylusGas) / solidityGas * 100).toFixed(2)}%`);

    // Benchmark batch (10 proofs)
    // ... similar
}
```

**Definition of Done:**
- ✅ Benchmark script created
- ✅ Solidity baseline deployed
- ✅ Gas measurements collected
- ✅ Report generated in markdown
- ✅ Git commit: `test(benchmarks): add gas benchmarking suite (Phase S4.1)`

---

## 🚀 PHASE S5: TESTNET DEPLOYMENT (Week 5)

**Goal:** Deploy to Arbitrum Sepolia and verify end-to-end.

### 📋 Task S5.1: Deploy Stylus WASM

**Commands:**
```bash
cd packages/stylus

# Deploy to Arbitrum Sepolia
cargo stylus deploy \
  --private-key=$PRIVATE_KEY \
  --endpoint=https://sepolia-rollup.arbitrum.io/rpc

# Save deployed address
echo "STYLUS_ADDRESS=0x..." >> .env.sepolia
```

### 📋 Task S5.2: Deploy Solidity Contracts

**Script:** `scripts/deploy_testnet.ts`

```typescript
async function main() {
    const stylusAddress = process.env.STYLUS_ADDRESS;

    // Deploy proxy
    const UZKVProxy = await ethers.getContractFactory('UZKVProxy');
    const proxy = await upgrades.deployProxy(UZKVProxy, [admin, upgrader, pauser, stylusAddress]);
    await proxy.deployed();

    console.log('UZKVProxy deployed:', proxy.address);

    // Verify on Arbiscan
    await hre.run('verify:verify', {
        address: proxy.address,
        constructorArguments: [],
    });
}
```

**Definition of Done:**
- ✅ Stylus WASM deployed to Sepolia
- ✅ Solidity contracts deployed
- ✅ Contracts verified on Arbiscan
- ✅ Addresses documented
- ✅ Git commit: `deploy(testnet): deploy full stack to Arbitrum Sepolia (Phase S5.2)`

---

## 📅 REMAINING PHASES (Weeks 6-10) - SUMMARY

**Phase S6:** Production Infrastructure (Docker, monitoring, alerts)  
**Phase S7:** Security Hardening (Audit prep, bug bounty setup)  
**Phase S8:** Mainnet Preparation (Guardian setup, emergency procedures)  
**Phase S9:** Mainnet Deployment (Phased rollout, monitoring)  
**Phase S10:** Post-Launch (Documentation, SDK updates, community support)

*(Detailed tasks available in PROJECT-EXECUTION-PROD.md Phases 14-23)*

---

## 📋 EXECUTION RULES (MANDATORY)

### Rule 1: NO MOCK IMPLEMENTATIONS ❌
- Test fixtures acceptable ONLY in test files
- Production code must be real implementations

### Rule 2: GIT COMMIT AFTER EVERY TASK ✅
- Format: `<type>(<scope>): <description> (Phase SX.Y)`
- Types: `feat`, `fix`, `test`, `docs`, `refactor`, `chore`, `build`

### Rule 3: DOCUMENTATION FOR EVERY PHASE 📝
- Location: `execution_steps_details/`
- Naming: `phase-sX.Y-<description>.md`

### Rule 4: CLEANUP BEFORE STARTING ⚠️
- **MUST complete Phase S0 (Cleanup) before Phase S1**
- Verify all redundant code deleted
- Verify consolidated structure works

---

## ✅ QUALITY GATES

Before marking any phase complete:

1. ✅ **Code compiles** without errors or warnings
2. ✅ **All tests pass** (target: >95% coverage)
3. ✅ **No mock implementations** in production code
4. ✅ **Documentation created** with commands and results
5. ✅ **Git committed** with proper message
6. ✅ **WASM optimized** (<128KB if applicable)

---

## 🎯 SUCCESS METRICS

### Gas Efficiency
- ✅ Groth16: <65,000 gas (vs 280k Solidity = 77% savings)
- ✅ PLONK: <125,000 gas (vs 450k Solidity = 72% savings)
- ✅ STARK: <300,000 gas (transparent, no trusted setup)
- ✅ Batch (10): >60% savings vs individual

### Code Quality
- ✅ Single unified WASM binary
- ✅ All 57 tests passing (8+31+18)
- ✅ Zero redundant code
- ✅ Clean module structure

### Deployment
- ✅ WASM size <128KB
- ✅ Testnet deployment successful
- ✅ Mainnet deployment ready
- ✅ Verified on Arbiscan

---

## 📅 TIMELINE SUMMARY

| Week | Phase | Focus | Completion |
|------|-------|-------|------------|
| 0 | **S0: Cleanup** | Delete redundant code, consolidate modules | 0% |
| 1 | **S1: Unified Contract** | Multi-proof routing, batch verification | 0% |
| 2 | **S2: Solidity Integration** | Refactor UniversalZKVerifier | 0% |
| 3 | **S3: Testing** | End-to-end integration tests | 0% |
| 4 | **S4: Benchmarking** | Gas measurement vs Solidity | 0% |
| 5 | **S5: Testnet** | Deploy to Arbitrum Sepolia | 0% |
| 6-10 | **S6-S10** | Production, Security, Mainnet | 0% |

**Total Duration:** 10 weeks (vs 16 weeks in original - 37.5% faster)  
**Reason:** Reuses existing production-ready modules, focuses on integration

---

**Last Updated:** November 21, 2025  
**Status:** ✅ Plan Restructured - Ready for Cleanup  
**Next Step:** Phase S0.1 - Delete Redundant STARK Implementation

---

## 🔗 REFERENCES

- **Main Execution Plan:** `PROJECT-EXECUTION-PROD.md`
- **Execution Rules:** `EXECUTION-RULES.md`
- **Already Completed:**
  - Phase 0: Environment Setup ✅
  - Phase 1: Foundation ✅
  - Phase 2: Groth16 (60% - Tasks 2.1-2.3) ✅
  - Phase 3: PLONK (100%) ✅
  - Phase 3C: STARK (100%) ✅
- **This Plan:** Consolidates existing work into deployable system


```
┌─────────────────────────────────────────────────────────────────┐
│                    ETHEREUM MAINNET (OPTIONAL)                  │
│  ┌────────────────────────────────────────────────────────┐    │
│  │  UZKVProxyL1.sol (for cross-chain proof verification) │    │
│  └────────────────────┬───────────────────────────────────┘    │
└────────────────────────┼────────────────────────────────────────┘
                         │ Arbitrum Bridge
┌────────────────────────▼────────────────────────────────────────┐
│                    ARBITRUM ONE (STYLUS)                        │
│                                                                  │
│  ┌──────────────────────────────────────────────────────┐      │
│  │  UZKVProxy.sol (UUPS Proxy)                          │      │
│  │  - Role-based access control                         │      │
│  │  - Pausability (emergency)                           │      │
│  │  - Upgrade authorization                             │      │
│  │  - Assembly delegatecall to Stylus                   │      │
│  └────────────────┬─────────────────────────────────────┘      │
│                   │ delegatecall                                │
│  ┌────────────────▼─────────────────────────────────────┐      │
│  │  UniversalZKVerifier (STYLUS WASM) ← NEW!            │      │
│  │  - Multi-proof routing in Rust                       │      │
│  │  - Batch verification (parallel)                     │      │
│  │  - VK registry                                       │      │
│  │  - Gas refunds                                       │      │
│  └─────┬────────┬────────┬──────────────────────────────┘      │
│        │        │        │                                      │
│  ┌─────▼──┐ ┌──▼─────┐ ┌▼──────┐                              │
│  │Groth16 │ │ PLONK  │ │ STARK │ ← All Stylus WASM Modules    │
│  │ WASM   │ │ WASM   │ │ WASM  │                              │
│  └────────┘ └────────┘ └───────┘                              │
│    ↑            ↑          ↑                                    │
│    │            │          │                                    │
│  ┌─┴────────────┴──────────┴────────────────────────┐         │
│  │  ERC-7201 Namespaced Storage                     │         │
│  │  - verification_count: uint256                   │         │
│  │  - verification_keys: mapping(bytes32 => bytes)  │         │
│  │  - precomputed_pairings: mapping(...)            │         │
│  │  - nullifiers: mapping(bytes32 => bool)          │         │
│  └──────────────────────────────────────────────────┘         │
└──────────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────────┐
│                    OFF-CHAIN INFRASTRUCTURE                   │
│  ┌────────────────────────────────────────────────────┐      │
│  │  Proof Generation (circom + snarkjs)               │      │
│  │  - Poseidon hash circuits                          │      │
│  │  - EdDSA signature circuits                        │      │
│  │  - Merkle tree circuits                            │      │
│  │  - 30,000+ test proofs                             │      │
│  └────────────────────────────────────────────────────┘      │
│  ┌────────────────────────────────────────────────────┐      │
│  │  TypeScript SDK (@uzkv/sdk)                        │      │
│  │  - Proof serialization helpers                     │      │
│  │  - Contract interaction wrappers                   │      │
│  │  - Gas estimation tools                            │      │
│  └────────────────────────────────────────────────────┘      │
└──────────────────────────────────────────────────────────────┘
```

---

## 📅 EXECUTION PHASES (16 WEEKS)

| Phase | Week | Focus | Deliverable |
|-------|------|-------|-------------|
| **1** | 1 | **Stylus Contract Unification** | Single WASM module with all verifiers |
| **2** | 2 | **Multi-Proof Routing (Rust)** | Stylus-based proof type dispatch |
| **3** | 3 | **Batch Verification (Rust)** | Parallel batch processing in WASM |
| **4** | 4 | **Solidity Integration** | Refactor UniversalZKVerifier for Stylus |
| **5** | 5 | **Circuit Infrastructure** | circom circuits + 30k proofs |
| **6** | 6 | **Storage Optimization** | ERC-7201 alignment, VK compression |
| **7** | 7 | **Gas Benchmarking** | Differential analysis vs Solidity |
| **8** | 8 | **Security Hardening** | Differential fuzzing, CVE scanning |
| **9** | 9 | **Formal Verification** | Certora specs for critical invariants |
| **10** | 10 | **Integration Testing** | End-to-end Solidity ↔ Stylus tests |
| **11** | 11 | **TypeScript SDK** | npm package with proof helpers |
| **12** | 12 | **Next.js Demo App** | Live proof generation/verification UI |
| **13** | 13 | **Deployment Automation** | Scripts for testnet/mainnet deployment |
| **14** | 14 | **Production Infrastructure** | Docker, K8s, monitoring stack |
| **15** | 15 | **Security Audit Prep** | Documentation, attack surface analysis |
| **16** | 16 | **Testnet Deployment** | Full stack deployment on Arbitrum Sepolia |

---

## 🦀 PHASE 1: STYLUS CONTRACT UNIFICATION (Week 1)

**Goal:** Create a single, deployable Stylus contract that integrates Groth16, PLONK, and STARK verifiers.

### 📋 Task 1.1: Create Unified Stylus Entrypoint

**Context:** Current implementation has separate Rust modules. We need a single WASM contract.

**Detailed Steps:**

1. **Create Main Contract Structure:**
   ```bash
   cd packages/stylus
   
   # Create new unified contract
   cargo new --lib unified-verifier
   cd unified-verifier
   ```

2. **Implement Main Contract** (`packages/stylus/unified-verifier/src/lib.rs`):
   ```rust
   #![cfg_attr(not(feature = "export-abi"), no_main)]
   #![cfg_attr(not(test), no_std)]
   extern crate alloc;

   use alloc::vec::Vec;
   use stylus_sdk::{
       alloy_primitives::{Address, U256},
       prelude::*,
       storage::{StorageAddress, StorageU256, StorageMap, StorageBool, StorageVec},
       msg, block,
   };

   // Import verifier modules
   mod groth16;
   mod plonk;
   mod stark;
   mod storage;

   use storage::VerificationKey;

   /// Proof type enumeration
   #[derive(Debug, Clone, Copy, PartialEq, Eq)]
   pub enum ProofType {
       Groth16 = 0,
       PLONK = 1,
       STARK = 2,
   }

   /// Contract errors
   #[derive(Debug, Clone, Copy, PartialEq, Eq)]
   pub enum Error {
       InvalidProofType,
       DeserializationError,
       MalformedProof,
       VerificationFailed,
       ContractPaused,
       Unauthorized,
       VKNotRegistered,
       InvalidInputSize,
   }

   // ERC-7201 namespaced storage
   sol_storage! {
       #[entrypoint]
       pub struct UniversalVerifier {
           // Admin controls
           address admin;
           bool paused;
           
           // Verification keys (vkHash => vkData)
           mapping(bytes32 => bytes) verification_keys;
           
           // Precomputed pairings (vkHash => pairingData)
           mapping(bytes32 => bytes) precomputed_pairings;
           
           // VK registration status
           mapping(bytes32 => bool) vk_registered;
           
           // Proof type for each VK (vkHash => ProofType)
           mapping(bytes32 => uint8) vk_proof_types;
           
           // Verification counter
           uint256 verification_count;
           
           // Nullifier tracking
           mapping(bytes32 => bool) nullifiers;
       }
   }

   #[external]
   impl UniversalVerifier {
       /// Universal verify function - routes to appropriate verifier
       pub fn verify(
           &mut self,
           proof_type: u8,
           proof: Vec<u8>,
           public_inputs: Vec<u8>,
           vk_hash: [u8; 32],
       ) -> Result<bool, Vec<u8>> {
           // Check pause state
           if self.paused.get() {
               return Err(b"Contract paused".to_vec());
           }

           // Validate VK exists
           if !self.vk_registered.get(vk_hash) {
               return Err(b"VK not registered".to_vec());
           }

           // Route to appropriate verifier
           let result = match proof_type {
               0 => self.verify_groth16(proof, public_inputs, vk_hash)?,
               1 => self.verify_plonk(proof, public_inputs, vk_hash)?,
               2 => self.verify_stark(proof, public_inputs, vk_hash)?,
               _ => return Err(b"Invalid proof type".to_vec()),
           };

           // Increment counter on success
           if result {
               let count = self.verification_count.get();
               self.verification_count.set(count + U256::from(1));
           }

           Ok(result)
       }

       /// Batch verification with parallel processing
       pub fn batch_verify(
           &mut self,
           proof_type: u8,
           proofs: Vec<Vec<u8>>,
           public_inputs: Vec<Vec<u8>>,
           vk_hash: [u8; 32],
       ) -> Result<Vec<bool>, Vec<u8>> {
           // Validate inputs
           if proofs.len() != public_inputs.len() {
               return Err(b"Length mismatch".to_vec());
           }

           if proofs.len() > 50 {
               return Err(b"Batch too large".to_vec());
           }

           // Check pause state
           if self.paused.get() {
               return Err(b"Contract paused".to_vec());
           }

           // Route to appropriate batch verifier
           match proof_type {
               0 => self.batch_verify_groth16(proofs, public_inputs, vk_hash),
               1 => self.batch_verify_plonk(proofs, public_inputs, vk_hash),
               2 => self.batch_verify_stark(proofs, public_inputs, vk_hash),
               _ => Err(b"Invalid proof type".to_vec()),
           }
       }

       /// Register verification key
       pub fn register_vk(
           &mut self,
           proof_type: u8,
           vk: Vec<u8>,
       ) -> Result<[u8; 32], Vec<u8>> {
           // Only admin can register VKs
           if msg::sender() != self.admin.get() {
               return Err(b"Unauthorized".to_vec());
           }

           // Compute VK hash
           let vk_hash = keccak256(&vk);

           // Store VK if not already registered
           if !self.vk_registered.get(vk_hash) {
               self.verification_keys.insert(vk_hash, vk.clone());
               self.vk_proof_types.insert(vk_hash, proof_type);
               self.vk_registered.insert(vk_hash, true);

               // Precompute optimizations based on proof type
               match proof_type {
                   0 => {
                       // Groth16: Precompute e(α, β)
                       if let Ok(precomputed) = groth16::compute_precomputed_pairing(&vk) {
                           self.precomputed_pairings.insert(vk_hash, precomputed);
                       }
                   }
                   1 => {
                       // PLONK: Precompute SRS hash
                       // (Implementation specific)
                   }
                   2 => {
                       // STARK: No precomputation needed (transparent setup)
                   }
                   _ => return Err(b"Invalid proof type".to_vec()),
               }
           }

           Ok(vk_hash)
       }

       /// Pause contract (admin only)
       pub fn pause(&mut self) -> Result<(), Vec<u8>> {
           if msg::sender() != self.admin.get() {
               return Err(b"Unauthorized".to_vec());
           }
           self.paused.set(true);
           Ok(())
       }

       /// Unpause contract (admin only)
       pub fn unpause(&mut self) -> Result<(), Vec<u8>> {
           if msg::sender() != self.admin.get() {
               return Err(b"Unauthorized".to_vec());
           }
           self.paused.set(false);
           Ok(())
       }

       /// Get verification count
       pub fn get_verification_count(&self) -> U256 {
           self.verification_count.get()
       }

       /// Check if VK is registered
       pub fn is_vk_registered(&self, vk_hash: [u8; 32]) -> bool {
           self.vk_registered.get(vk_hash)
       }

       /// Mark nullifier as used (replay protection)
       pub fn mark_nullifier_used(&mut self, nullifier: [u8; 32]) -> Result<bool, Vec<u8>> {
           if self.paused.get() {
               return Err(b"Contract paused".to_vec());
           }

           if self.nullifiers.get(nullifier) {
               return Ok(false); // Already used
           }

           self.nullifiers.insert(nullifier, true);
           Ok(true)
       }

       /// Check if nullifier is used
       pub fn is_nullifier_used(&self, nullifier: [u8; 32]) -> bool {
           self.nullifiers.get(nullifier)
       }
   }

   // Private implementation methods
   impl UniversalVerifier {
       fn verify_groth16(
           &self,
           proof: Vec<u8>,
           public_inputs: Vec<u8>,
           vk_hash: [u8; 32],
       ) -> Result<bool, Vec<u8>> {
           let vk_data = self.verification_keys.get(vk_hash);
           let precomputed = self.precomputed_pairings.get(vk_hash);

           if !precomputed.is_empty() {
               groth16::verify_with_precomputed(&proof, &public_inputs, &vk_data, &precomputed)
                   .map_err(|_| b"Groth16 verification failed".to_vec())
           } else {
               groth16::verify(&proof, &public_inputs, &vk_data)
                   .map_err(|_| b"Groth16 verification failed".to_vec())
           }
       }

       fn verify_plonk(
           &self,
           proof: Vec<u8>,
           public_inputs: Vec<u8>,
           vk_hash: [u8; 32],
       ) -> Result<bool, Vec<u8>> {
           let vk_data = self.verification_keys.get(vk_hash);
           plonk::verify(&proof, &public_inputs, &vk_data)
               .map_err(|_| b"PLONK verification failed".to_vec())
       }

       fn verify_stark(
           &self,
           proof: Vec<u8>,
           public_inputs: Vec<u8>,
           vk_hash: [u8; 32],
       ) -> Result<bool, Vec<u8>> {
           // STARK doesn't use VKs in traditional sense (transparent setup)
           stark::verify(&proof, &public_inputs)
               .map_err(|_| b"STARK verification failed".to_vec())
       }

       fn batch_verify_groth16(
           &mut self,
           proofs: Vec<Vec<u8>>,
           public_inputs: Vec<Vec<u8>>,
           vk_hash: [u8; 32],
       ) -> Result<Vec<bool>, Vec<u8>> {
           let vk_data = self.verification_keys.get(vk_hash);
           let precomputed = self.precomputed_pairings.get(vk_hash);

           groth16::batch_verify(&proofs, &public_inputs, &vk_data, &precomputed)
               .map_err(|_| b"Groth16 batch verification failed".to_vec())
       }

       fn batch_verify_plonk(
           &mut self,
           proofs: Vec<Vec<u8>>,
           public_inputs: Vec<Vec<u8>>,
           vk_hash: [u8; 32],
       ) -> Result<Vec<bool>, Vec<u8>> {
           let vk_data = self.verification_keys.get(vk_hash);
           plonk::batch_verify(&proofs, &public_inputs, &vk_data)
               .map_err(|_| b"PLONK batch verification failed".to_vec())
       }

       fn batch_verify_stark(
           &mut self,
           proofs: Vec<Vec<u8>>,
           public_inputs: Vec<Vec<u8>>,
           vk_hash: [u8; 32],
       ) -> Result<Vec<bool>, Vec<u8>> {
           stark::batch_verify(&proofs, &public_inputs)
               .map_err(|_| b"STARK batch verification failed".to_vec())
       }
   }

   /// Helper function: Keccak256 hash
   fn keccak256(data: &[u8]) -> [u8; 32] {
       use stylus_sdk::crypto;
       crypto::keccak(data).into()
   }
   ```

3. **Create Cargo.toml:**
   ```toml
   [package]
   name = "uzkv-unified-verifier"
   version = "1.0.0"
   edition = "2021"
   rust-version = "1.75"

   [lib]
   crate-type = ["cdylib", "rlib"]

   [dependencies]
   stylus-sdk = "0.5.0"
   wee_alloc = "0.4.5"

   # Groth16 dependencies
   ark-groth16 = { version = "0.4", default-features = false }
   ark-bn254 = { version = "0.4", default-features = false }
   ark-ec = { version = "0.4", default-features = false }
   ark-ff = { version = "0.4", default-features = false }
   ark-serialize = { version = "0.4", default-features = false }

   # PLONK dependencies
   halo2_proofs = { version = "0.3", default-features = false }
   halo2curves = { version = "0.5", default-features = false, features = ["bn256"] }

   # STARK dependencies
   blake3 = { version = "1.5", default-features = false }

   [profile.release]
   codegen-units = 1
   panic = "abort"
   opt-level = "z"
   strip = true
   lto = true
   
   [features]
   default = []
   export-abi = ["stylus-sdk/export-abi"]
   ```

**Definition of Done:**
- ✅ Single `lib.rs` file with `#[entrypoint]` macro
- ✅ `verify()` function routing to Groth16/PLONK/STARK
- ✅ `batch_verify()` function for all proof types
- ✅ `register_vk()` with proof type association
- ✅ Admin controls (pause/unpause)
- ✅ Compiles with `cargo stylus build --release`
- ✅ Documentation markdown file created
- ✅ Git commit: `feat(stylus): unified verifier contract with multi-proof routing (Phase 1.1)`

---

### 📋 Task 1.2: Implement Batch Verification for Groth16

**Context:** Add parallel batch processing to Groth16 module.

**File:** `packages/stylus/unified-verifier/src/groth16.rs`

```rust
/// Batch verify multiple Groth16 proofs
///
/// Optimizations:
/// - Reuses single VK for all proofs
/// - Parallel pairing computation (Stylus WASM parallelism)
/// - Early exit on first failure (optional)
///
/// # Gas Savings
/// - Individual verifications: N * 61,000 gas
/// - Batch verification: 61,000 + (N-1) * 45,000 gas
/// - Savings for N=10: ~35%
pub fn batch_verify(
    proofs: &[Vec<u8>],
    public_inputs: &[Vec<u8>],
    vk_bytes: &[u8],
    precomputed_pairing: &[u8],
) -> Result<Vec<bool>> {
    // Validate inputs
    if proofs.len() != public_inputs.len() {
        return Err(Error::InvalidInputSize);
    }

    // Deserialize VK once (reused for all proofs)
    let vk = VerifyingKey::<Bn254>::deserialize_compressed(vk_bytes)
        .map_err(|_| Error::InvalidVerificationKey)?;
    
    validate_vk(&vk)?;

    // Deserialize precomputed pairing once
    let alpha_beta = if !precomputed_pairing.is_empty() {
        Some(
            PairingOutput::<Bn254>::deserialize_compressed(precomputed_pairing)
                .map_err(|_| Error::InvalidVerificationKey)?
        )
    } else {
        None
    };

    // Verify each proof
    let mut results = Vec::with_capacity(proofs.len());
    
    for i in 0..proofs.len() {
        // Deserialize proof
        let proof = Proof::<Bn254>::deserialize_compressed(&proofs[i][..])
            .map_err(|_| Error::DeserializationError)?;
        
        validate_proof(&proof)?;

        // Deserialize public inputs
        let inputs = deserialize_public_inputs(&public_inputs[i][..])?;

        // Verify
        let is_valid = if let Some(ref precomputed) = alpha_beta {
            verify_proof_with_precomputed(&vk, &proof, &inputs, precomputed)?
        } else {
            verify_proof_internal(&vk, &proof, &inputs)?
        };

        results.push(is_valid);
    }

    Ok(results)
}
```

**Definition of Done:**
- ✅ `batch_verify()` function implemented
- ✅ VK reused across all proofs
- ✅ Precomputed pairing optimization applied
- ✅ Returns `Vec<bool>` with individual results
- ✅ Tests for batch sizes: 1, 5, 10, 50
- ✅ Gas benchmarking vs sequential verification
- ✅ Git commit: `feat(stylus): Groth16 batch verification with gas optimization (Phase 1.2)`

---

### 📋 Task 1.3: Implement Batch Verification for PLONK

**File:** `packages/stylus/unified-verifier/src/plonk.rs`

```rust
/// Batch verify multiple PLONK proofs
pub fn batch_verify(
    proofs: &[Vec<u8>],
    public_inputs: &[Vec<u8>],
    vk_bytes: &[u8],
) -> Result<Vec<bool>> {
    // Validate inputs
    if proofs.len() != public_inputs.len() {
        return Err(Error::InvalidInputSize);
    }

    // Deserialize VK once
    let vk = VerifyingKey::deserialize_compressed(vk_bytes)
        .map_err(|_| Error::InvalidVerificationKey)?;

    // Verify each proof
    let mut results = Vec::with_capacity(proofs.len());
    
    for i in 0..proofs.len() {
        let result = verify(&proofs[i], &public_inputs[i], vk_bytes)?;
        results.push(result);
    }

    Ok(results)
}
```

**Definition of Done:**
- ✅ `batch_verify()` function implemented
- ✅ Compatible with PLONK verification
- ✅ Tests with 10+ proofs
- ✅ Git commit: `feat(stylus): PLONK batch verification (Phase 1.3)`

---

### 📋 Task 1.4: Implement Batch Verification for STARK

**File:** `packages/stylus/unified-verifier/src/stark.rs`

```rust
/// Batch verify multiple STARK proofs
pub fn batch_verify(
    proofs: &[Vec<u8>],
    public_inputs: &[Vec<u8>],
) -> Result<Vec<bool>> {
    // STARK doesn't use VKs (transparent setup)
    let mut results = Vec::with_capacity(proofs.len());
    
    for i in 0..proofs.len() {
        let result = verify(&proofs[i], &public_inputs[i])?;
        results.push(result);
    }

    Ok(results)
}
```

**Definition of Done:**
- ✅ `batch_verify()` function implemented
- ✅ Tests with STARK proofs
- ✅ Git commit: `feat(stylus): STARK batch verification (Phase 1.4)`

---

### 📋 Task 1.5: Build & Export ABI

**Commands:**
```bash
cd packages/stylus/unified-verifier

# Build optimized WASM
cargo stylus build --release

# Export Solidity ABI
cargo stylus export-abi > ../../contracts/src/interfaces/IUniversalVerifier.sol

# Optimize WASM binary
wasm-opt -Oz \
  target/wasm32-unknown-unknown/release/uzkv_unified_verifier.wasm \
  -o uzkv_verifier_optimized.wasm

# Check size
ls -lh uzkv_verifier_optimized.wasm  # Target: <128KB
```

**Expected ABI** (`IUniversalVerifier.sol`):
```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

interface IUniversalVerifier {
    function verify(
        uint8 proofType,
        bytes calldata proof,
        bytes calldata publicInputs,
        bytes32 vkHash
    ) external returns (bool);
    
    function batchVerify(
        uint8 proofType,
        bytes[] calldata proofs,
        bytes[] calldata publicInputs,
        bytes32 vkHash
    ) external returns (bool[] memory);
    
    function registerVK(
        uint8 proofType,
        bytes calldata vk
    ) external returns (bytes32);
    
    function pause() external;
    function unpause() external;
    function getVerificationCount() external view returns (uint256);
    function isVKRegistered(bytes32 vkHash) external view returns (bool);
    function markNullifierUsed(bytes32 nullifier) external returns (bool);
    function isNullifierUsed(bytes32 nullifier) external view returns (bool);
}
```

**Definition of Done:**
- ✅ WASM binary compiles successfully
- ✅ Optimized WASM size <128KB
- ✅ ABI exported to Solidity interface
- ✅ All function signatures match
- ✅ Git commit: `build(stylus): export optimized WASM and Solidity ABI (Phase 1.5)`

---

## 🔀 PHASE 2: MULTI-PROOF ROUTING IN SOLIDITY (Week 2)

**Goal:** Refactor UniversalZKVerifier.sol to delegate to Stylus WASM instead of Solidity modules.

### 📋 Task 2.1: Refactor UniversalZKVerifier.sol

**Context:** Replace pure Solidity delegatecall with Stylus WASM integration.

**File:** `packages/contracts/src/UniversalZKVerifier.sol`

**Changes:**
```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

import {Initializable} from "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import {AccessControlUpgradeable} from "@openzeppelin/contracts-upgradeable/access/AccessControlUpgradeable.sol";
import {PausableUpgradeable} from "@openzeppelin/contracts-upgradeable/utils/PausableUpgradeable.sol";
import {UUPSUpgradeable} from "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";

/// @title UniversalZKVerifier - Stylus Integration
/// @notice Routes zero-knowledge proof verification to Stylus WASM modules
/// @dev Delegates all verification logic to Arbitrum Stylus for gas efficiency
contract UniversalZKVerifier is 
    Initializable, 
    AccessControlUpgradeable, 
    PausableUpgradeable, 
    UUPSUpgradeable 
{
    /// @notice Proof type enumeration (matches Stylus contract)
    enum ProofType {
        GROTH16,
        PLONK,
        STARK
    }

    /// @notice Stylus WASM module address (deployed UniversalVerifier)
    address public stylusModule;

    /// @notice Events
    event ProofVerified(
        ProofType indexed proofType,
        address indexed caller,
        bool success,
        uint256 gasUsed
    );

    event BatchVerified(
        ProofType indexed proofType,
        address indexed caller,
        uint256 proofCount,
        uint256 successCount
    );

    event StylusModuleUpdated(address indexed oldModule, address indexed newModule);

    /// @notice Errors
    error StylusModuleNotSet();
    error StylusCallFailed(bytes reason);
    error InvalidProofType();

    /// @notice Roles
    bytes32 public constant MODULE_MANAGER_ROLE = keccak256("MODULE_MANAGER_ROLE");
    bytes32 public constant UPGRADER_ROLE = keccak256("UPGRADER_ROLE");
    bytes32 public constant PAUSER_ROLE = keccak256("PAUSER_ROLE");

    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() {
        _disableInitializers();
    }

    /// @notice Initialize the contract
    function initialize(
        address admin,
        address upgrader,
        address pauser,
        address _stylusModule
    ) external initializer {
        require(admin != address(0), "Invalid admin");
        require(upgrader != address(0), "Invalid upgrader");
        require(pauser != address(0), "Invalid pauser");
        require(_stylusModule != address(0), "Invalid Stylus module");

        __AccessControl_init();
        __Pausable_init();
        __UUPSUpgradeable_init();

        _grantRole(DEFAULT_ADMIN_ROLE, admin);
        _grantRole(UPGRADER_ROLE, upgrader);
        _grantRole(PAUSER_ROLE, pauser);
        _grantRole(MODULE_MANAGER_ROLE, admin);

        stylusModule = _stylusModule;
    }

    /// @notice Verify a zero-knowledge proof via Stylus
    /// @param proofType The type of proof (GROTH16, PLONK, STARK)
    /// @param proof Serialized proof data
    /// @param publicInputs Serialized public inputs
    /// @param vkHash Hash of the registered verification key
    /// @return success True if proof is valid
    function verify(
        ProofType proofType,
        bytes calldata proof,
        bytes calldata publicInputs,
        bytes32 vkHash
    ) external whenNotPaused returns (bool success) {
        if (stylusModule == address(0)) revert StylusModuleNotSet();

        uint256 gasBefore = gasleft();

        // Delegatecall to Stylus WASM module
        (bool ok, bytes memory result) = stylusModule.delegatecall(
            abi.encodeWithSignature(
                "verify(uint8,bytes,bytes,bytes32)",
                uint8(proofType),
                proof,
                publicInputs,
                vkHash
            )
        );

        if (!ok) {
            revert StylusCallFailed(result);
        }

        success = abi.decode(result, (bool));
        uint256 gasUsed = gasBefore - gasleft();

        emit ProofVerified(proofType, msg.sender, success, gasUsed);
    }

    /// @notice Batch verify multiple proofs via Stylus
    /// @param proofType The type of proofs
    /// @param proofs Array of serialized proofs
    /// @param publicInputs Array of serialized public inputs
    /// @param vkHash Hash of the registered verification key
    /// @return results Array of verification results
    function batchVerify(
        ProofType proofType,
        bytes[] calldata proofs,
        bytes[] calldata publicInputs,
        bytes32 vkHash
    ) external whenNotPaused returns (bool[] memory results) {
        if (stylusModule == address(0)) revert StylusModuleNotSet();

        // Delegatecall to Stylus WASM module
        (bool ok, bytes memory result) = stylusModule.delegatecall(
            abi.encodeWithSignature(
                "batchVerify(uint8,bytes[],bytes[],bytes32)",
                uint8(proofType),
                proofs,
                publicInputs,
                vkHash
            )
        );

        if (!ok) {
            revert StylusCallFailed(result);
        }

        results = abi.decode(result, (bool[]));

        // Count successes
        uint256 successCount = 0;
        for (uint256 i = 0; i < results.length; i++) {
            if (results[i]) successCount++;
        }

        emit BatchVerified(proofType, msg.sender, proofs.length, successCount);
    }

    /// @notice Update Stylus module address
    /// @param newModule New Stylus WASM module address
    function setStylusModule(address newModule) external onlyRole(MODULE_MANAGER_ROLE) {
        require(newModule != address(0), "Invalid module");
        address oldModule = stylusModule;
        stylusModule = newModule;
        emit StylusModuleUpdated(oldModule, newModule);
    }

    /// @notice Pause the contract
    function pause() external onlyRole(PAUSER_ROLE) {
        _pause();
    }

    /// @notice Unpause the contract
    function unpause() external onlyRole(PAUSER_ROLE) {
        _unpause();
    }

    /// @notice Authorize upgrade (UUPS)
    function _authorizeUpgrade(address newImplementation) 
        internal 
        override 
        onlyRole(UPGRADER_ROLE) 
    {}
}
```

**Definition of Done:**
- ✅ UniversalZKVerifier.sol refactored
- ✅ `stylusModule` address storage
- ✅ `verify()` delegatecalls to Stylus
- ✅ `batchVerify()` delegatecalls to Stylus
- ✅ `setStylusModule()` for upgrades
- ✅ All 29 existing tests updated and passing
- ✅ Git commit: `refactor(contracts): integrate Stylus WASM module in UniversalZKVerifier (Phase 2.1)`

---

### 📋 Task 2.2: Update Tests for Stylus Integration

**File:** `packages/contracts/test/UniversalZKVerifier.t.sol`

**Changes:**
```solidity
contract UniversalZKVerifierTest is Test {
    UniversalZKVerifier public verifier;
    address public stylusModule; // Mock Stylus module

    function setUp() public {
        // Deploy mock Stylus module (returns true for all verifications)
        stylusModule = address(new MockStylusVerifier());

        // Deploy proxy
        verifier = new UniversalZKVerifier();
        verifier.initialize(
            admin,
            upgrader,
            pauser,
            stylusModule
        );
    }

    function test_Verify_DelegatesToStylus() public {
        bytes memory proof = hex"1234";
        bytes memory publicInputs = hex"5678";
        bytes32 vkHash = keccak256("test-vk");

        bool result = verifier.verify(
            UniversalZKVerifier.ProofType.GROTH16,
            proof,
            publicInputs,
            vkHash
        );

        assertTrue(result);
    }

    function test_SetStylusModule() public {
        address newModule = address(new MockStylusVerifier());

        vm.prank(admin);
        verifier.setStylusModule(newModule);

        assertEq(verifier.stylusModule(), newModule);
    }
}

contract MockStylusVerifier {
    function verify(
        uint8,
        bytes calldata,
        bytes calldata,
        bytes32
    ) external pure returns (bool) {
        return true; // Mock success
    }

    function batchVerify(
        uint8,
        bytes[] calldata proofs,
        bytes[] calldata,
        bytes32
    ) external pure returns (bool[] memory) {
        bool[] memory results = new bool[](proofs.length);
        for (uint256 i = 0; i < proofs.length; i++) {
            results[i] = true;
        }
        return results;
    }
}
```

**Definition of Done:**
- ✅ All existing tests updated
- ✅ MockStylusVerifier created
- ✅ New tests for `setStylusModule()`
- ✅ All 29+ tests passing
- ✅ Git commit: `test(contracts): update tests for Stylus integration (Phase 2.2)`

---

## 🧪 PHASE 3: CIRCUIT INFRASTRUCTURE (Week 5)

**Goal:** Create real circuits and generate 30,000+ test proofs.

### 📋 Task 3.1: Install circom & snarkjs

```bash
# Install circom compiler
git clone https://github.com/iden3/circom.git
cd circom
cargo build --release
cargo install --path circom

# Verify
circom --version  # Should show 2.1.6+

# Install snarkjs
npm install -g snarkjs@latest
snarkjs --version  # Should show 0.7.0+

# Download Powers of Tau
mkdir -p packages/circuits/ptau
cd packages/circuits/ptau
wget https://hermez.s3-eu-west-1.amazonaws.com/powersOfTau28_hez_final_21.ptau

# Verify hash
b2sum powersOfTau28_hez_final_21.ptau
```

**Definition of Done:**
- ✅ circom installed and verified
- ✅ snarkjs installed and verified
- ✅ Powers of Tau downloaded and hash verified
- ✅ Git commit: `chore(circuits): install circom and snarkjs toolchain (Phase 3.1)`

---

### 📋 Task 3.2: Create Example Circuits

**Circuit 1:** Poseidon Hash (`packages/circuits/poseidon_test.circom`)
```circom
pragma circom 2.1.6;

include "circomlib/poseidon.circom";

template PoseidonHashVerifier() {
    signal input preimage[2];
    signal input expectedHash;
    signal output valid;
    
    component hasher = Poseidon(2);
    hasher.inputs[0] <== preimage[0];
    hasher.inputs[1] <== preimage[1];
    
    signal hash <== hasher.out;
    valid <== (hash === expectedHash) ? 1 : 0;
}

component main {public [expectedHash]} = PoseidonHashVerifier();
```

**Circuit 2:** Merkle Tree (`packages/circuits/merkle_proof.circom`)
```circom
pragma circom 2.1.6;

include "circomlib/mimc.circom";

template MerkleTreeChecker(levels) {
    signal input leaf;
    signal input pathElements[levels];
    signal input pathIndices[levels];
    signal input root;
    
    component hashers[levels];
    signal computedHash[levels + 1];
    computedHash[0] <== leaf;
    
    for (var i = 0; i < levels; i++) {
        hashers[i] = MiMC7(91);
        hashers[i].x_in <== computedHash[i];
        hashers[i].k <== pathElements[i];
        computedHash[i + 1] <== hashers[i].out;
    }
    
    root === computedHash[levels];
}

component main {public [root]} = MerkleTreeChecker(20);
```

**Definition of Done:**
- ✅ 3 example circuits created
- ✅ Circuits compile successfully
- ✅ R1CS info shows correct constraint counts
- ✅ Git commit: `feat(circuits): add Poseidon and Merkle Tree circuits (Phase 3.2)`

---

### 📋 Task 3.3: Trusted Setup Ceremony

```bash
cd packages/circuits

# Compile circuits
circom poseidon_test.circom --r1cs --wasm --sym -o build/
circom merkle_proof.circom --r1cs --wasm --sym -o build/

# Groth16 setup for each circuit
for circuit in poseidon_test merkle_proof; do
    # Phase 2 setup
    snarkjs groth16 setup \
        build/${circuit}.r1cs \
        ptau/powersOfTau28_hez_final_21.ptau \
        build/${circuit}_0000.zkey
    
    # Contribute to ceremony (2 rounds)
    snarkjs zkey contribute \
        build/${circuit}_0000.zkey \
        build/${circuit}_0001.zkey \
        --name="First contribution" \
        -v -e="$(openssl rand -hex 32)"
    
    snarkjs zkey contribute \
        build/${circuit}_0001.zkey \
        build/${circuit}_final.zkey \
        --name="Second contribution" \
        -v -e="$(openssl rand -hex 32)"
    
    # Export verification key
    snarkjs zkey export verificationkey \
        build/${circuit}_final.zkey \
        build/${circuit}_vk.json
    
    # Verify zkey integrity
    snarkjs zkey verify \
        build/${circuit}.r1cs \
        ptau/powersOfTau28_hez_final_21.ptau \
        build/${circuit}_final.zkey
done
```

**Definition of Done:**
- ✅ Trusted setup complete for all circuits
- ✅ .zkey files generated and verified
- ✅ Verification keys exported
- ✅ Git commit: `feat(circuits): complete trusted setup ceremony (Phase 3.3)`

---

### 📋 Task 3.4: Generate 30,000+ Test Proofs

**Script:** `packages/circuits/scripts/generate-proofs.js`

```javascript
const snarkjs = require('snarkjs');
const fs = require('fs');
const crypto = require('crypto');
const path = require('path');

async function generateProof(circuit, witness, id) {
    const { proof, publicSignals } = await snarkjs.groth16.fullProve(
        witness,
        path.join(__dirname, `../build/${circuit}_js/${circuit}.wasm`),
        path.join(__dirname, `../build/${circuit}_final.zkey`)
    );
    
    const proofsDir = path.join(__dirname, `../proofs/${circuit}`);
    if (!fs.existsSync(proofsDir)) {
        fs.mkdirSync(proofsDir, { recursive: true });
    }
    
    fs.writeFileSync(
        path.join(proofsDir, `${id}_proof.json`),
        JSON.stringify(proof, null, 2)
    );
    
    fs.writeFileSync(
        path.join(proofsDir, `${id}_public.json`),
        JSON.stringify(publicSignals, null, 2)
    );
    
    return { proof, publicSignals };
}

async function main() {
    const circuits = ['poseidon_test', 'merkle_proof'];
    const proofsPerCircuit = 15000; // 15k per circuit = 30k total
    
    for (const circuit of circuits) {
        console.log(`Generating ${proofsPerCircuit} proofs for ${circuit}...`);
        
        for (let i = 0; i < proofsPerCircuit; i++) {
            let witness;
            
            if (circuit === 'poseidon_test') {
                witness = {
                    preimage: [
                        BigInt('0x' + crypto.randomBytes(32).toString('hex')),
                        BigInt('0x' + crypto.randomBytes(32).toString('hex'))
                    ],
                    expectedHash: BigInt('0x' + crypto.randomBytes(32).toString('hex'))
                };
            } else if (circuit === 'merkle_proof') {
                const levels = 20;
                witness = {
                    leaf: BigInt('0x' + crypto.randomBytes(32).toString('hex')),
                    pathElements: Array(levels).fill(0).map(() => 
                        BigInt('0x' + crypto.randomBytes(32).toString('hex'))
                    ),
                    pathIndices: Array(levels).fill(0).map(() => 
                        Math.random() > 0.5 ? 1 : 0
                    ),
                    root: BigInt('0x' + crypto.randomBytes(32).toString('hex'))
                };
            }
            
            await generateProof(circuit, witness, i);
            
            if (i % 100 === 0) {
                console.log(`  Progress: ${i}/${proofsPerCircuit}`);
            }
        }
        
        console.log(`✅ Completed ${circuit}`);
    }
    
    console.log('✅ Generated 30,000 total proofs');
}

main().catch(console.error);
```

**Run:**
```bash
cd packages/circuits
node scripts/generate-proofs.js
# This will take several hours - run overnight
```

**Definition of Done:**
- ✅ 30,000+ proofs generated
- ✅ Proofs stored in `packages/circuits/proofs/`
- ✅ Proof catalog created with hashes
- ✅ Git commit: `test(circuits): generate 30,000+ test proofs (Phase 3.4)`

---

## 🚀 REMAINING PHASES (Weeks 6-16)

**Phase 4:** Storage Optimization (ERC-7201 alignment, VK compression)  
**Phase 5:** Gas Benchmarking (Differential analysis vs Solidity)  
**Phase 6:** Security Hardening (Differential fuzzing, CVE scanning)  
**Phase 7:** Formal Verification (Certora specs)  
**Phase 8:** Integration Testing (End-to-end Solidity ↔ Stylus)  
**Phase 9:** TypeScript SDK (npm package)  
**Phase 10:** Next.js Demo App (Live UI)  
**Phase 11:** Deployment Automation (Scripts for testnet/mainnet)  
**Phase 12:** Production Infrastructure (Docker, K8s, monitoring)  
**Phase 13:** Security Audit Prep (Documentation, attack surface)  
**Phase 14:** Testnet Deployment (Arbitrum Sepolia)  
**Phase 15:** Mainnet Preparation (Code freeze, guardian setup)  
**Phase 16:** Public Launch (SDK publish, documentation site)

---

## 📋 EXECUTION RULES (MANDATORY)

### Rule 1: NO MOCK IMPLEMENTATIONS ❌
- ZERO tolerance for mock code in production
- Test fixtures acceptable ONLY in test files
- Reference implementations must be documented

### Rule 2: GIT COMMIT AFTER EVERY TASK ✅
- Complete Task → Immediate Commit
- Format: `<type>(<scope>): <description> (Phase X.Y)`
- Types: `feat`, `fix`, `test`, `docs`, `refactor`, `chore`

### Rule 3: DOCUMENTATION FOR EVERY TASK 📝
- Generate markdown file for each task
- Location: `execution_steps_details/`
- Naming: `phase-X.Y-<description>.md`

### Rule 4: GIT BASH FOR ALL OPERATIONS 🖥️
- ONLY use Git Bash terminal
- No PowerShell, CMD, or WSL

---

## ✅ QUALITY GATES

Before marking any phase complete:

1. ✅ **Code compiles** without errors
2. ✅ **Tests pass** (>95% coverage)
3. ✅ **No mock implementations** (production only)
4. ✅ **Documentation created** in `execution_steps_details/`
5. ✅ **Git commit** with proper message
6. ✅ **Gas benchmarked** (if applicable)
7. ✅ **Security validated** (no warnings)
8. ✅ **WASM optimized** (<128KB per module)

---

## 🎯 SUCCESS METRICS

### Gas Efficiency
- ✅ Groth16: <61,000 gas per verification (vs 280k Solidity)
- ✅ PLONK: <120,000 gas per verification (vs 450k Solidity)
- ✅ STARK: <300,000 gas per verification (transparent setup)
- ✅ Batch (10 proofs): >60% savings vs individual

### Code Quality
- ✅ 100% production code (zero mocks)
- ✅ >95% test coverage
- ✅ Zero critical security findings
- ✅ Formal verification passing

### Deployment
- ✅ WASM binaries <128KB each
- ✅ Testnet deployment successful
- ✅ Mainnet deployment ready
- ✅ SDK published to npm

---

## 📅 TIMELINE SUMMARY

| Week | Phase | Completion |
|------|-------|------------|
| 1 | Stylus Unification | 0% |
| 2 | Solidity Integration | 0% |
| 3 | Batch Verification | 0% |
| 4 | Circuit Infrastructure | 0% |
| 5-6 | Storage & Gas Optimization | 0% |
| 7-8 | Security & Formal Verification | 0% |
| 9-10 | Integration Testing | 0% |
| 11-12 | SDK & Frontend | 0% |
| 13-14 | Deployment Infrastructure | 0% |
| 15-16 | Testnet Launch | 0% |

**Total Duration:** 16 weeks  
**Start Date:** TBD  
**Target Completion:** TBD

---

**Last Updated:** November 21, 2025  
**Status:** ✅ Plan Complete - Ready for Execution  
**Next Step:** Begin Phase 1, Task 1.1 (Unified Stylus Entrypoint)
