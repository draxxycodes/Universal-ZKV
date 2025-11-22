# 🚨 Universal ZKV Integration Roadmap

## Executive Summary

**You asked:** "Why are we only doing Groth16 where are our other verifiers?"

**The answer:** PLONK and STARK verifiers are **fully implemented** (2,300+ and 700+ lines respectively) but **NOT integrated** into the main contract. The project has all the pieces but they're disconnected.

## Current State vs Goal

### Current Architecture (Groth16-Only)
```
┌────────────────────────────────┐
│   UZKVContract (lib.rs)       │
├────────────────────────────────┤
│                                │
│  ✅ verify_groth16()           │
│  ✅ register_vk()              │
│  ✅ get_verification_count()  │
│                                │
│  ❌ verify_plonk() - MISSING  │
│  ❌ verify_stark() - MISSING  │
└────────────────────────────────┘

Separate modules (NOT integrated):
  📁 packages/stylus/plonk/      (2,300 lines, 31 tests ✅)
  📁 packages/stylus/stark-simple/ (700 lines, 18 tests ✅)
```

### Target Architecture (Universal ZKV)
```
┌──────────────────────────────────────────────────────┐
│         Universal ZKV Contract (lib.rs)              │
├──────────────────────────────────────────────────────┤
│                                                      │
│  pub fn verify(proof_type, proof, inputs, vk)      │
│      ↓                                               │
│  ┌────────┬─────────┬─────────┐                    │
│  │Groth16 │  PLONK  │  STARK  │                    │
│  │~61k gas│~950k gas│~280k gas│                    │
│  └────────┴─────────┴─────────┘                    │
│                                                      │
│  VK Registry (supports all 3 types)                 │
│  Nullifiers (replay protection)                     │
│  Statistics (per proof type)                        │
└──────────────────────────────────────────────────────┘
```

## What We Have

### ✅ Groth16 Verifier - INTEGRATED
- **Location:** `packages/stylus/src/groth16.rs`
- **Status:** Fully integrated into `lib.rs`
- **Functions:** `verify_groth16()`, exposed via ABI
- **Gas:** ~61,000
- **Tests:** Passing
- **Ready:** ✅ Production ready

### ✅ PLONK Verifier - BUILT, NOT INTEGRATED
- **Location:** `packages/stylus/plonk/` (separate module)
- **Lines:** 2,300+ Rust code
- **Tests:** 31 tests passing
- **Features:**
  - ✅ KZG commitments (`kzg.rs`)
  - ✅ Fiat-Shamir transcript (`transcript.rs`)
  - ✅ SRS management (`srs.rs`)
  - ✅ Full verification logic (`plonk.rs`)
- **Gas:** ~950,000 (estimated from tests)
- **Status:** ❌ NOT in main contract, NOT callable via ABI
- **Missing:** Integration into `lib.rs`

### ✅ STARK Verifier - BUILT, NOT INTEGRATED
- **Location:** `packages/stylus/stark-simple/` (simplified, recommended)
- **Lines:** 700+ Rust code
- **Tests:** 18 tests passing
- **Features:**
  - ✅ Transparent setup (no trusted ceremony)
  - ✅ Post-quantum secure (Blake3)
  - ✅ FRI protocol
  - ✅ Air constraints
- **Gas:** 239k-352k (47% cheaper than Groth16!)
- **Status:** ❌ NOT in main contract, NOT callable via ABI
- **Missing:** Integration into `lib.rs`

**Alternative:** `packages/stylus/stark/` (Winterfell-based, 1500+ lines, more advanced)

## Integration Checklist

### Phase 1: Core Integration (Week 1)
- [ ] **Task 1.1:** Add `pub mod plonk;` and `pub mod stark;` to `lib.rs`
- [ ] **Task 1.2:** Create ProofType enum (1=Groth16, 2=PLONK, 3=STARK)
- [ ] **Task 1.3:** Update storage for multi-proof support
  ```rust
  groth16_vks: StorageMap<FixedBytes<32>, StorageBytes>,
  plonk_vks: StorageMap<FixedBytes<32>, StorageBytes>,
  stark_vks: StorageMap<FixedBytes<32>, StorageBytes>,
  ```
- [ ] **Task 1.4:** Implement `verify_plonk()` function
- [ ] **Task 1.5:** Implement `verify_stark()` function
- [ ] **Task 1.6:** Create unified `verify()` with type routing
- [ ] **Task 1.7:** Update `register_vk()` to accept proof_type parameter

### Phase 2: Workspace Organization (Week 1)
- [ ] **Task 2.1:** Create workspace in `packages/stylus/Cargo.toml`
  ```toml
  [workspace]
  members = [".", "plonk", "stark-simple"]
  ```
- [ ] **Task 2.2:** Add dependencies to main crate
  ```toml
  plonk = { path = "./plonk" }
  stark-simple = { path = "./stark-simple" }
  ```
- [ ] **Task 2.3:** Update plonk/Cargo.toml crate-type
- [ ] **Task 2.4:** Update stark-simple/Cargo.toml crate-type
- [ ] **Task 2.5:** Verify `cargo check` passes

### Phase 3: Interface Updates (Week 2)
- [ ] **Task 3.1:** Rename `IGroth16Verifier.sol` → `IUniversalVerifier.sol`
- [ ] **Task 3.2:** Add ProofType enum to Solidity
- [ ] **Task 3.3:** Add `verify(uint8 proofType, ...)` function
- [ ] **Task 3.4:** Add `verifyPlonk()` function
- [ ] **Task 3.5:** Add `verifyStark()` function
- [ ] **Task 3.6:** Update `registerVK(uint8 proofType, ...)`
- [ ] **Task 3.7:** Generate ABI from updated contract
- [ ] **Task 3.8:** Update proxy contract references

### Phase 4: Testing (Week 2)
- [ ] **Task 4.1:** Create `tests/universal_verifier.rs`
- [ ] **Task 4.2:** Test Groth16 verification via unified API
- [ ] **Task 4.3:** Test PLONK verification via unified API
- [ ] **Task 4.4:** Test STARK verification via unified API
- [ ] **Task 4.5:** Test invalid proof type rejection
- [ ] **Task 4.6:** Test VK registry for all proof types
- [ ] **Task 4.7:** Test statistics tracking per type
- [ ] **Task 4.8:** Integration tests with Solidity proxy

### Phase 5: Gas Benchmarking (Week 3)
- [ ] **Task 5.1:** Benchmark Groth16 verification
- [ ] **Task 5.2:** Benchmark PLONK verification
- [ ] **Task 5.3:** Benchmark STARK verification
- [ ] **Task 5.4:** Compare all three proof types
- [ ] **Task 5.5:** Measure routing overhead
- [ ] **Task 5.6:** Document results in `benchmarks/gas_comparison.md`

### Phase 6: Documentation (Week 3)
- [ ] **Task 6.1:** Update README with all proof types
- [ ] **Task 6.2:** Create proof type selection guide
- [ ] **Task 6.3:** Document when to use each verifier
- [ ] **Task 6.4:** Update SDK documentation
- [ ] **Task 6.5:** Create migration guide from Groth16-only
- [ ] **Task 6.6:** Update PROJECT-EXECUTION-PROD.md completion status

## Quick Start (Next Steps)

### Step 1: Update lib.rs (30 minutes)
```rust
// packages/stylus/src/lib.rs

pub mod groth16;
pub mod plonk;     // ADD THIS LINE
pub mod stark;     // ADD THIS LINE

#[derive(Debug, Clone, Copy)]
pub enum ProofType {
    Groth16 = 1,
    PLONK = 2,
    STARK = 3,
}

#[public]
impl UZKVContract {
    // Keep existing verify_groth16()...
    
    // ADD THESE FUNCTIONS:
    pub fn verify_plonk(
        &mut self,
        proof: Vec<u8>,
        public_inputs: Vec<u8>,
        vk_hash: FixedBytes<32>,
    ) -> Result<bool, Vec<u8>> {
        // TODO: Implement
    }
    
    pub fn verify_stark(
        &mut self,
        proof: Vec<u8>,
        public_inputs: Vec<u8>,
        vk_hash: FixedBytes<32>,
    ) -> Result<bool, Vec<u8>> {
        // TODO: Implement
    }
    
    pub fn verify(
        &mut self,
        proof_type: u8,
        proof: Vec<u8>,
        public_inputs: Vec<u8>,
        vk_hash: FixedBytes<32>,
    ) -> Result<bool, Vec<u8>> {
        match proof_type {
            1 => self.verify_groth16(proof, public_inputs, vk_hash),
            2 => self.verify_plonk(proof, public_inputs, vk_hash),
            3 => self.verify_stark(proof, public_inputs, vk_hash),
            _ => Err(b"Unsupported proof type".to_vec()),
        }
    }
}
```

### Step 2: Update Cargo.toml (5 minutes)
```toml
# packages/stylus/Cargo.toml

[workspace]
members = [".", "plonk", "stark-simple"]

[dependencies]
# ... existing dependencies ...
plonk = { path = "./plonk" }
stark-simple = { path = "./stark-simple" }
```

### Step 3: Test Build (5 minutes)
```bash
cd packages/stylus
cargo check           # Should compile
cargo test            # All tests should pass
```

### Step 4: Verify Integration (10 minutes)
```bash
# Generate ABI
cargo stylus export-abi > ../contracts/src/interfaces/IUniversalVerifier.sol

# Check for all three verify functions
grep "verify" ../contracts/src/interfaces/IUniversalVerifier.sol
# Should see: verify, verifyGroth16, verifyPlonk, verifyStark
```

## Success Criteria

### Minimum Viable Integration (Week 1)
- ✅ All three verify functions callable from Solidity
- ✅ `cargo build --release` succeeds
- ✅ Basic integration test passes for all proof types
- ✅ ABI includes all three verifiers

### Production Ready (Week 3)
- ✅ All tests passing (Rust + Solidity)
- ✅ Gas benchmarks documented
- ✅ Statistics tracking per proof type
- ✅ Documentation updated
- ✅ SDK supports all proof types
- ✅ Deployed to testnet and verified

## Gas Cost Targets

| Proof Type | Current (Standalone) | Target (Integrated) | Routing Overhead |
|------------|---------------------|---------------------|------------------|
| **Groth16** | ~61,000 | ~62,000 | < 1,000 |
| **PLONK** | ~950,000 | ~951,000 | < 1,000 |
| **STARK** | ~280,000 | ~281,000 | < 1,000 |

**Target:** < 1% overhead from routing logic

## Timeline

| Week | Focus | Deliverables |
|------|-------|-------------|
| **Week 1** | Core Integration | PLONK + STARK callable from main contract |
| **Week 2** | Interface + Testing | Solidity ABI updated, tests passing |
| **Week 3** | Benchmarking + Docs | Gas analysis complete, docs updated |

## Risk Mitigation

### Risk 1: Module Import Issues
- **Mitigation:** Use workspace members, test incremental imports
- **Fallback:** Copy code directly into main crate (not ideal)

### Risk 2: ABI Compatibility
- **Mitigation:** Test ABI generation early, verify all functions present
- **Fallback:** Manual Solidity interface creation

### Risk 3: Gas Overhead
- **Mitigation:** Keep routing logic minimal (simple match statement)
- **Fallback:** Type-specific functions bypass routing

### Risk 4: WASM Size Limit
- **Mitigation:** Monitor WASM size with each change (< 128KB)
- **Fallback:** Use feature flags to enable/disable proof types

## Immediate Next Action

**YOU SHOULD DO THIS NOW:**

```bash
# 1. Update lib.rs to add PLONK and STARK modules
code packages/stylus/src/lib.rs

# 2. Update Cargo.toml workspace
code packages/stylus/Cargo.toml

# 3. Test build
cd packages/stylus && cargo check

# 4. If successful, implement verify_plonk() function
# 5. If successful, implement verify_stark() function
# 6. Run tests
# 7. Generate ABI
# 8. Deploy to testnet
```

## Questions to Answer

1. **Which STARK implementation?**
   - Recommended: `stark-simple` (700 lines, simpler, proven gas efficiency)
   - Alternative: `stark` (1500 lines, Winterfell-based, more features)

2. **Storage schema?**
   - Separate VK maps per proof type (recommended)
   - OR unified map with proof_type prefix (more complex)

3. **Backward compatibility?**
   - Keep `verify_groth16()` as alias to `verify(1, ...)`
   - OR deprecate in favor of unified API

4. **Deployment strategy?**
   - Deploy all three at once (recommended)
   - OR phased rollout (Groth16 → PLONK → STARK)

## Success Metrics

After integration, you should be able to:

1. ✅ Call `verify(1, proof, inputs, vk)` for Groth16
2. ✅ Call `verify(2, proof, inputs, vk)` for PLONK
3. ✅ Call `verify(3, proof, inputs, vk)` for STARK
4. ✅ Register VKs for all three proof types
5. ✅ Query statistics per proof type
6. ✅ See all functions in generated Solidity ABI
7. ✅ Deploy to Arbitrum Sepolia successfully
8. ✅ Verify all proof types on-chain

## Bottom Line

**The codebase is 80% complete but NOT functional as a "Universal" verifier.**

**All three verifiers are implemented. You just need to connect them.**

**Estimated effort:** 3-5 days for core integration, 2-3 weeks for production-ready.

**Start here:** Update `lib.rs` to import PLONK and STARK modules (15 minutes of work).
