# Live Demo User Guide

## Overview
The enhanced interactive demo provides a complete, transparent view of the Universal ZK Proof workflow with detailed step-by-step progress tracking.

## How to Use

### Step 1: Select Your Proof System

Choose from three cutting-edge zero-knowledge proof systems:

#### **Groth16** (Recommended for Production)
- ⚡ **~280k gas** - Most efficient
- ✓ Smallest proof size
- ✓ Fastest verification
- ⚠️ Requires trusted setup

#### **PLONK** (Universal Setup)
- ⚡ **~400k gas** - Moderate cost
- ✓ Universal setup (no circuit-specific ceremony)
- ✓ Flexible circuits
- ✓ Good balance of features

#### **STARK** (Post-Quantum Secure)
- ⚡ **~540k gas** - Higher cost
- ✓ Transparent setup (no trust assumptions)
- ✓ Post-quantum secure
- ✓ No trusted setup required

### Step 2: Run the Complete Workflow

Click **"Run Complete Workflow"** to start the three-phase process:

## Live Progress Feed

As the workflow runs, you'll see detailed information about each step:

### Phase 1: Proof Generation

```
🟡 Starting Generation
   → Preparing to generate GROTH16 proof with random inputs
   [12:34:56 PM]

🟡 Circuit Selection
   → Selected circuits: poseidon_test, eddsa_verify, merkle_proof
   [12:34:57 PM]

🟡 Witness Computation
   → Computing witness with random inputs from corpus of 10,000+ valid proofs
   [12:34:58 PM]

✅ Proof Generation Complete
   → Generated 3 GROTH16 proofs successfully
   [12:34:59 PM]
```

**What's Happening:**
- System randomly selects from 30,000+ valid witnesses (10,000 per circuit)
- Computes cryptographic proof using selected proof system
- Ensures each proof run is unique

### Phase 2: Universal Verification (UZKV)

```
🟡 UZKV Verification Started
   → Universal ZK Verifier detecting GROTH16 proof type
   [12:35:00 PM]

🟡 Delegating to Specialized Verifier
   → Routing to GROTH16 verification module
   [12:35:01 PM]

🟡 Loading Verification Keys
   → Loaded verification keys for 3 circuits
   [12:35:02 PM]

🟡 Cryptographic Verification
   → Performing pairing check (e(A, B) = e(α, β) · e(L, γ) · e(C, δ))
   [12:35:03 PM]

✅ Verification Complete ✅
   → All 3 proofs verified successfully. Estimated gas: 280,000 gas
   [12:35:04 PM]
```

**What's Happening:**
- UZKV (Universal ZK Verifier) detects proof type automatically
- Routes to appropriate verification module (Groth16/PLONK/STARK)
- Loads verification keys for all circuits
- Performs cryptographic verification:
  - **Groth16**: Pairing check on elliptic curves
  - **PLONK**: Polynomial commitment verification with KZG
  - **STARK**: FRI (Fast Reed-Solomon Interactive Oracle Proofs)

### Phase 3: On-Chain Attestation

```
🟡 Preparing On-Chain Attestation
   → Generating commitment hash for GROTH16 proof
   [12:35:05 PM]

🟡 Connecting to Arbitrum Sepolia
   → Chain ID: 421614 | Attestor: 0x36e9...8177
   [12:35:06 PM]

🟡 Transaction Submitted
   → TX Hash: 0x1234abcd...ef567890
   [12:35:07 PM]

✅ Attestation Complete 🎉
   → Proof commitment permanently recorded on Arbitrum Sepolia
   [12:35:08 PM]
```

**What's Happening:**
- System generates commitment hash: `keccak256(proof_hash)`
- Connects to Arbitrum Sepolia testnet (Chain ID: 421614)
- Submits transaction to Attestor contract
- Records proof commitment permanently on-chain

## Results Summary

After completion, you'll see:

### Workflow Complete! ✅

| Metric | Value |
|--------|-------|
| **Proof System** | Groth16 |
| **Circuits Verified** | 3 |
| **Estimated Gas** | 280,000 |
| **Total Steps** | 12 |
| **Transaction Hash** | 0x1234abcd...ef567890 |

**[View on Arbiscan →]**

Click the "View on Arbiscan" button to see your transaction on the Arbitrum Sepolia block explorer.

### Download Results

Click **"Download Results"** to save:
- Proof type and system used
- Gas estimates
- Transaction hash
- Timestamp
- Complete workflow metadata

## Understanding the Output

### What is UZKV?

**Universal ZK Verifier (UZKV)** is our unified verification layer that:
1. **Detects** the proof type automatically
2. **Delegates** to specialized verifiers
3. **Verifies** using appropriate cryptographic methods
4. **Reports** detailed results

### Cryptographic Methods

#### Groth16: Pairing Check
```
e(A, B) = e(α, β) · e(L, γ) · e(C, δ)
```
Verifies that the proof satisfies the equation using bilinear pairings on elliptic curves.

#### PLONK: Polynomial Commitments
Uses Kate-Zaverucha-Goldberg (KZG) commitments to verify polynomial evaluations.

#### STARK: FRI Protocol
Fast Reed-Solomon Interactive Oracle Proofs with no trusted setup required.

### Network Details

- **Network**: Arbitrum Sepolia (Testnet)
- **Chain ID**: 421614
- **Attestor Contract**: `0x36e937ebcf56c5dec6ecb0695001becc87738177`
- **Explorer**: https://sepolia.arbiscan.io/

## Supported Circuits

### 1. Poseidon Hash
Zero-knowledge hash function verification
- **Use Case**: Privacy-preserving identity
- **Valid Witnesses**: 10,000+

### 2. EdDSA Signature
Signature verification without revealing keys
- **Use Case**: Anonymous authentication
- **Valid Witnesses**: 10,000+

### 3. Merkle Proof
Tree membership verification
- **Use Case**: Privacy-preserving data structures
- **Valid Witnesses**: 10,000+

## Tips for Best Experience

1. **Try Different Proof Systems**: Compare Groth16, PLONK, and STARK
2. **Watch the Progress**: Educational insights into how ZK proofs work
3. **Check Gas Costs**: Understand trade-offs between systems
4. **Explore On-Chain**: Use Arbiscan to verify attestations
5. **Download Results**: Keep records of your proof runs

## Technical Details

### Why Random Inputs?

Each workflow run selects from a corpus of 30,000+ valid proofs, ensuring:
- ✅ Unique proofs every time
- ✅ Realistic proof generation
- ✅ No hardcoded test data
- ✅ Production-ready workflow

### Gas Estimates

Gas costs are estimated based on:
- Proof size
- Verification complexity
- On-chain storage requirements

**Actual costs may vary** based on network conditions.

### Security

- ✅ All proofs are cryptographically verified
- ✅ On-chain attestations are permanent
- ✅ Transaction hashes are verifiable
- ✅ Post-quantum secure option (STARK)

## Troubleshooting

### "Attestation requires PRIVATE_KEY"
- Add `PRIVATE_KEY` to `.env.local` for on-chain attestation
- Or continue with verification only (no attestation)

### "Proof already attested"
- This proof was previously recorded on-chain
- Try running again for a fresh proof

### Verification Failed
- Check that circuits are properly built
- Ensure verification keys exist
- Try a different proof system

## Next Steps

1. **Integrate**: Use the SDK to integrate into your dApp
2. **Deploy**: Deploy to mainnet for production use
3. **Scale**: Process multiple proofs in batch
4. **Customize**: Add your own circuits

## Support

- 📖 [Full Documentation](../README.md)
- 🔧 [Quick Start Guide](../QUICK-START.md)
- 💬 [GitHub Issues](https://github.com/draxxycodes/Universal-ZKV/issues)

---

**Ready to start?** → http://localhost:3000/demo
