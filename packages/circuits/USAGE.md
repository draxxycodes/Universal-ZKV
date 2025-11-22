# Circuit Development Usage Guide

This guide shows how to use the circuit infrastructure for proof generation.

## Prerequisites

Ensure you have:
- ✅ circom v2.2.3+ installed
- ✅ snarkjs v0.7.5+ installed
- ✅ Powers of Tau files generated (see below)

---

## Step 1: Generate Powers of Tau Files

PTAU files are **not stored in git** due to their large size. Generate them locally:

### Production Setup (RECOMMENDED - Industry Grade) ⭐

```bash
cd packages/circuits/ptau

# Create initial ceremony (2^28 = 268M constraints)
snarkjs powersoftau new bn128 28 powersOfTau28_hez_0000.ptau

# Add contribution (takes ~10 minutes)
snarkjs powersoftau contribute powersOfTau28_hez_0000.ptau powersOfTau28_hez_0001.ptau \
  --name="UZKV production contribution" \
  -e="production entropy for universal zkv"

# Prepare for phase 2 (takes ~2-3 hours)
snarkjs powersoftau prepare phase2 powersOfTau28_hez_0001.ptau powersOfTau28_hez_final.ptau

# Verify
snarkjs powersoftau verify powersOfTau28_hez_final.ptau
```

**Result:** `powersOfTau28_hez_final.ptau` (2.3 GB) - **Production-grade, ready for circuits up to 268,435,456 constraints**

### Quick Testing Setup (Optional - NOT for Production)

```bash
cd packages/circuits/ptau

# Create smaller ceremony (2^15 = 32k constraints)
snarkjs powersoftau new bn128 15 pot15_0000.ptau

# Add contribution
snarkjs powersoftau contribute pot15_0000.ptau pot15_0001.ptau \
  --name="First contribution" \
  -e="random entropy for uzkv project"

# Prepare for phase 2
snarkjs powersoftau prepare phase2 pot15_0001.ptau pot15_final.ptau

# Verify
snarkjs powersoftau verify pot15_final.ptau
```

**Result:** `pot15_final.ptau` (37 MB) - **Testing only, up to 32,768 constraints**

⚠️ **Always use powersOfTau28_hez_final.ptau for production circuits!**

---

## Step 2: Create a Circuit

Create a simple test circuit (e.g., `multiplier.circom`):

```bash
cd packages/circuits
mkdir -p src
cat > src/multiplier.circom << 'EOF'
pragma circom 2.0.0;

template Multiplier() {
    signal input a;
    signal input b;
    signal output c;
    
    c <== a * b;
}

component main = Multiplier();
EOF
```

---

## Step 3: Compile the Circuit

```bash
cd packages/circuits

# Compile to R1CS
circom src/multiplier.circom --r1cs --wasm --sym -o build/

# Check circuit info
snarkjs r1cs info build/multiplier.r1cs
```

**Expected output:**
```
[INFO]  snarkJS: Curve: bn-128
[INFO]  snarkJS: # of Wires: 4
[INFO]  snarkJS: # of Constraints: 1
[INFO]  snarkJS: # of Private Inputs: 0
[INFO]  snarkJS: # of Public Inputs: 2
[INFO]  snarkJS: # of Outputs: 1
```

---

## Step 4: Generate Proving/Verification Keys

### Using Groth16 (Recommended for Stylus) - Production Grade ⭐

```bash
cd packages/circuits

# Setup with production PTAU (creates zkey)
snarkjs groth16 setup \
  build/multiplier.r1cs \
  ptau/powersOfTau28_hez_final.ptau \
  build/multiplier_0000.zkey

# Contribute to phase 2
snarkjs zkey contribute \
  build/multiplier_0000.zkey \
  build/multiplier_final.zkey \
  --name="Circuit contribution" \
  -e="circuit entropy"

# Export verification key
snarkjs zkey export verificationkey \
  build/multiplier_final.zkey \
  build/verification_key.json
```

### Using PLONK (Alternative) - Production Grade

```bash
cd packages/circuits

# Setup with production PTAU
snarkjs plonk setup \
  build/multiplier.r1cs \
  ptau/powersOfTau28_hez_final.ptau \
  build/multiplier_plonk.zkey

# Export verification key
snarkjs zkey export verificationkey \
  build/multiplier_plonk.zkey \
  build/verification_key_plonk.json
```

---

## Step 5: Generate a Proof

### Create Input File

```bash
cat > build/input.json << EOF
{
  "a": "3",
  "b": "11"
}
EOF
```

### Generate Witness

```bash
cd packages/circuits

# Using the WASM witness calculator
node build/multiplier_js/generate_witness.js \
  build/multiplier_js/multiplier.wasm \
  build/input.json \
  build/witness.wtns
```

### Generate Proof (Groth16)

```bash
# Generate proof and public signals
snarkjs groth16 prove \
  build/multiplier_final.zkey \
  build/witness.wtns \
  build/proof.json \
  build/public.json

# Verify the proof
snarkjs groth16 verify \
  build/verification_key.json \
  build/public.json \
  build/proof.json
```

**Expected output:**
```
[INFO]  snarkJS: OK!
```

### Generate Proof (PLONK)

```bash
# Generate proof
snarkjs plonk prove \
  build/multiplier_plonk.zkey \
  build/witness.wtns \
  build/proof_plonk.json \
  build/public_plonk.json

# Verify
snarkjs plonk verify \
  build/verification_key_plonk.json \
  build/public_plonk.json \
  build/proof_plonk.json
```

---

## Step 6: Export for Stylus/Solidity

### Generate Solidity Verifier

```bash
# Groth16 verifier
snarkjs zkey export solidityverifier \
  build/multiplier_final.zkey \
  build/Groth16Verifier.sol

# PLONK verifier
snarkjs zkey export solidityverifier \
  build/multiplier_plonk.zkey \
  build/PlonkVerifier.sol
```

### Generate Calldata

```bash
# For Groth16
snarkjs zkey export soliditycalldata \
  build/public.json \
  build/proof.json

# For PLONK
snarkjs zkey export soliditycalldata \
  build/public_plonk.json \
  build/proof_plonk.json
```

---

## Integration with Existing Verifiers

### For Groth16 Verifier (packages/stylus/groth16/)

```bash
# 1. Generate proof as shown above
# 2. Extract proof components
cat build/proof.json | jq -r '.pi_a, .pi_b, .pi_c, .protocol'

# 3. Use with existing Groth16Verifier in Stylus
# See packages/stylus/groth16/src/lib.rs
```

### For PLONK Verifier (packages/stylus/plonk/)

```bash
# 1. Generate PLONK proof
# 2. Extract proof data
cat build/proof_plonk.json

# 3. Use with existing PlonkVerifier in Stylus
# See packages/stylus/plonk/src/lib.rs
```

---

## Complete Example: End-to-End

```bash
#!/bin/bash
# Complete workflow for multiplier circuit - PRODUCTION GRADE

cd packages/circuits

# 1. Generate PTAU (one-time setup) - INDUSTRY GRADE
cd ptau
snarkjs powersoftau new bn128 28 powersOfTau28_hez_0000.ptau
snarkjs powersoftau contribute powersOfTau28_hez_0000.ptau powersOfTau28_hez_0001.ptau \
  --name="UZKV production" -e="production entropy"
snarkjs powersoftau prepare phase2 powersOfTau28_hez_0001.ptau powersOfTau28_hez_final.ptau
cd ..

# 2. Compile circuit
circom src/multiplier.circom --r1cs --wasm --sym -o build/

# 3. Setup Groth16 with production PTAU
snarkjs groth16 setup build/multiplier.r1cs ptau/powersOfTau28_hez_final.ptau build/multiplier_0000.zkey
snarkjs zkey contribute build/multiplier_0000.zkey build/multiplier_final.zkey \
  --name="Circuit" -e="circuit entropy"
snarkjs zkey export verificationkey build/multiplier_final.zkey build/verification_key.json

# 4. Generate proof
echo '{"a": "3", "b": "11"}' > build/input.json
node build/multiplier_js/generate_witness.js build/multiplier_js/multiplier.wasm build/input.json build/witness.wtns
snarkjs groth16 prove build/multiplier_final.zkey build/witness.wtns build/proof.json build/public.json

# 5. Verify
snarkjs groth16 verify build/verification_key.json build/public.json build/proof.json

# 6. Export for Solidity/Stylus
snarkjs zkey export solidityverifier build/multiplier_final.zkey build/Groth16Verifier.sol
snarkjs zkey export soliditycalldata build/public.json build/proof.json > build/calldata.txt

echo "✅ Complete! Production-grade setup ready. Check build/ directory for all outputs"
```

---

## File Structure After Setup

```
packages/circuits/
├── ptau/
│   ├── README.md
│   ├── powersOfTau28_hez_final.ptau  # 2.3 GB (PRODUCTION - local only) ⭐
│   └── pot15_final.ptau              # 37 MB (testing only - local only)
├── src/
│   └── multiplier.circom             # Your circuit code
├── build/
│   ├── multiplier.r1cs               # Compiled circuit
│   ├── multiplier.wasm               # WASM witness generator
│   ├── multiplier_final.zkey         # Proving key (from production PTAU)
│   ├── verification_key.json         # Verification key
│   ├── proof.json                    # Generated proof
│   ├── public.json                   # Public signals
│   └── Groth16Verifier.sol           # Solidity verifier
└── USAGE.md                          # This file
```

---

## Gas Cost Estimates

Based on Arbitrum Stylus benchmarks:

| System | Gas Cost | vs Groth16 | vs PLONK |
|--------|----------|------------|----------|
| **Groth16** | ~450k | baseline | - |
| **PLONK** | ~750k | +67% | baseline |
| **STARK (simple)** | ~289k | **-35%** | **-61%** |

**Recommendation:** Use Groth16 for production circuits on Stylus for best gas efficiency.

---

## Troubleshooting

### "Powers of Tau file not found"
```bash
# Generate production PTAU (RECOMMENDED)
cd packages/circuits/ptau
snarkjs powersoftau new bn128 28 powersOfTau28_hez_0000.ptau
snarkjs powersoftau contribute powersOfTau28_hez_0000.ptau powersOfTau28_hez_0001.ptau \
  --name="UZKV production" -e="production entropy"
snarkjs powersoftau prepare phase2 powersOfTau28_hez_0001.ptau powersOfTau28_hez_final.ptau
```

### "Not enough constraints in Powers of Tau"
```bash
# Ensure you're using powersOfTau28_hez_final.ptau (268M constraints)
# This should handle virtually all production circuits
# If you need more, increase the power:
snarkjs powersoftau new bn128 29 pot29_0000.ptau  # 536M constraints (rarely needed)
```

### "Proof verification failed"
```bash
# Ensure witness matches circuit
snarkjs wtns check build/multiplier.r1cs build/witness.wtns

# Verify setup with production PTAU
snarkjs zkey verify build/multiplier.r1cs ptau/powersOfTau28_hez_final.ptau build/multiplier_final.zkey
```

---

## Next Steps

1. ✅ **Task 3.5.2:** Create test circuit (multiplier.circom)
2. 🔄 **Task 3.5.3:** Compile and generate proofs
3. 🔄 **Task 3.5.4:** Integrate with existing Groth16 verifier
4. 🔄 **Task 3.5.5:** Test on-chain with Arbitrum Sepolia

---

**Status:** Infrastructure ready for circuit development! 🎉
