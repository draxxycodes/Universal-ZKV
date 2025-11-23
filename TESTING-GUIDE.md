# Universal ZK Verifier - Complete Testing Guide

## 🎯 **Testing All 3 Proof Systems in One Workflow**

This guide demonstrates how to test the Universal Verifier with **all three proof systems** (Groth16, PLONK, STARK) using the circuits (Poseidon, EdDSA, Merkle).

---

## ✅ **Quick Test - Verify All Systems**

### Run the Universal Verifier E2E Test

```bash
cd packages/stylus
cargo test universal_verifier_e2e --release -- --nocapture
```

**Expected Output:**

```
🌟 UNIVERSAL VERIFIER - COMPLETE WORKFLOW TEST
============================================================
📝 Step 1: Identity Verification (Groth16 + EdDSA)
✅ User identity verified

📝 Step 2: Whitelist Verification (Groth16 + Merkle)
✅ Whitelist membership verified

📝 Step 3: State Transition (PLONK + Poseidon)
✅ State transition verified

📝 Step 4: Computational Integrity (STARK + Fibonacci)
✅ Computation integrity verified

📝 Step 5: Transaction Finalization (PLONK + EdDSA)
✅ Transaction finalized

============================================================
🎉 UNIVERSAL VERIFIER WORKFLOW: SUCCESS
============================================================

📊 Summary:
   Total verifications: 5
   Groth16 proofs: 2 (identity + whitelist)
   PLONK proofs: 2 (state + transaction)
   STARK proofs: 1 (computation)
   Total gas estimate: ~2,115k
   All proof systems operational ✅
```

---

## 📚 **Complete Testing Workflow**

### 1. Generate Proofs for All Circuits

#### **Poseidon Circuit** (Groth16 + PLONK)

```bash
cd packages/circuits

# Compile circuit
circom src/poseidon_test.circom --r1cs --wasm --sym -o build/

# Groth16 setup
snarkjs groth16 setup build/poseidon_test.r1cs \
    ptau/powersOfTau28_hez_final_12.ptau \
    build/poseidon_0000.zkey

snarkjs zkey contribute build/poseidon_0000.zkey \
    build/poseidon_final.zkey --name="Contribution" -v

# Generate proof
echo '{"in":["12345"]}' > input.json
node build/poseidon_test_js/generate_witness.js \
    build/poseidon_test_js/poseidon_test.wasm \
    input.json witness.wtns

snarkjs groth16 prove build/poseidon_final.zkey witness.wtns proof.json public.json
```

#### **EdDSA Circuit** (Groth16 + PLONK)

```bash
# Compile EdDSA circuit
circom src/eddsa_verify.circom --r1cs --wasm --sym -o build/

# Follow same setup process as Poseidon
# Generate signature verification proof
```

#### **Merkle Circuit** (Groth16 + PLONK)

```bash
# Compile Merkle proof circuit
circom src/merkle_proof.circom --r1cs --wasm --sym -o build/

# Generate Merkle tree membership proof
# Proves a leaf is in the tree without revealing the leaf
```

### 2. Test Each Proof System

#### **Test Groth16**

```bash
cd packages/stylus
cargo test groth16 --release -- --nocapture
```

#### **Test PLONK**

```bash
cargo test plonk --release -- --nocapture
```

#### **Test STARK**

```bash
cargo test stark --release -- --nocapture
```

### 3. Test Complete Integration

```bash
# Run all tests
cargo test --release -- --nocapture

# Run specific universal verifier test
cargo test test_universal_verifier_complete_workflow --release -- --nocapture
```

---

## 🏗️ **Real-World Use Case Example**

### DeFi Protocol with Multiple Proof Requirements

```
┌─────────────────────────────────────────────────────────┐
│              DeFi Protocol Transaction Flow             │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  1. User Identity Verification (Groth16 + EdDSA)       │
│     └─> Verify signature without revealing private key │
│                                                         │
│  2. Whitelist Check (Groth16 + Merkle)                 │
│     └─> Prove membership without revealing identity    │
│                                                         │
│  3. State Transition (PLONK + Poseidon)                │
│     └─> Verify state update with hash commitment       │
│                                                         │
│  4. Computation Integrity (STARK + Fibonacci)          │
│     └─> Prove correct execution (post-quantum secure)  │
│                                                         │
│  5. Transaction Finalization (PLONK + EdDSA)           │
│     └─> Aggregate signatures and complete              │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

**Run this scenario:**

```bash
cargo test test_universal_verifier_complete_workflow --release -- --nocapture
```

---

## 📊 **Gas Cost Comparison**

| Proof System | Circuit   | Gas Cost | Proof Size | Setup Type  |
| ------------ | --------- | -------- | ---------- | ----------- |
| **Groth16**  | Poseidon  | ~280k    | 256 bytes  | Trusted     |
| **Groth16**  | EdDSA     | ~290k    | 256 bytes  | Trusted     |
| **Groth16**  | Merkle    | ~285k    | 256 bytes  | Trusted     |
| **PLONK**    | Poseidon  | ~400k    | 512 bytes  | Universal   |
| **PLONK**    | EdDSA     | ~410k    | 512 bytes  | Universal   |
| **PLONK**    | Merkle    | ~405k    | 512 bytes  | Universal   |
| **STARK**    | Fibonacci | ~540k    | 1024 bytes | Transparent |

**Total for complete workflow:** ~2,115k gas

---

## 🔬 **Testing Checklist**

- [ ] All circuits compiled successfully
- [ ] Groth16 proofs generated (Poseidon, EdDSA, Merkle)
- [ ] PLONK proofs generated (120+ test cases available)
- [ ] STARK proof generated (Fibonacci sequence)
- [ ] Universal verifier test passes
- [ ] Complete workflow test passes
- [ ] Gas benchmarks documented
- [ ] All 3 systems operational

---

## 🚀 **Next Steps After Testing**

### 1. Deploy to Arbitrum Sepolia

```bash
cd packages/stylus
cargo stylus deploy \
    --private-key $PRIVATE_KEY \
    --endpoint https://sepolia-rollup.arbitrum.io/rpc
```

### 2. Verify On-Chain

```bash
# Test with real proofs on testnet
cast send <CONTRACT_ADDRESS> "verifyGroth16(bytes,bytes)" \
    "<proof_hex>" "<public_inputs_hex>" \
    --rpc-url https://sepolia-rollup.arbitrum.io/rpc \
    --private-key $PRIVATE_KEY
```

### 3. Monitor Performance

```bash
# Run gas benchmarks
cd benchmarks
npm run benchmark-gas
```

---

## 💡 **Tips**

1. **Start with Groth16** - Fastest and most gas-efficient
2. **Use PLONK** when you need circuit flexibility
3. **Choose STARK** for post-quantum security or when you can't do trusted setup
4. **Combine all three** for maximum security and flexibility

---

## 📖 **Additional Resources**

- **Deployment Guide:** `DEPLOYMENT-EXECUTION-PLAN.md`
- **Circuit Documentation:** `packages/circuits/README.md`
- **PLONK Service:** `packages/plonk-service/README.md`
- **Stylus Verifier:** `packages/stylus/README.md`

---

**Questions?** Open an issue on GitHub or check the docs above.
