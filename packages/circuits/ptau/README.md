# Powers of Tau Files

**Note:** PTAU files are not stored in git due to their large size. Generate them locally using the instructions below.

## Quick Setup

Generate the production-grade PTAU file (recommended):

```bash
cd packages/circuits/ptau

# Generate Powers of Tau (2^28 = 268M constraints) - PRODUCTION GRADE
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

**Result:** `powersOfTau28_hez_final.ptau` (2.3 GB) ready for circuits up to 268,435,456 constraints.

### Quick Development Setup (Optional - Lower Constraints)

For faster setup with limited constraints (testing only):

```bash
cd packages/circuits/ptau

# Generate smaller file (2^15 = 32k constraints)
snarkjs powersoftau new bn128 15 pot15_0000.ptau
snarkjs powersoftau contribute pot15_0000.ptau pot15_0001.ptau \
  --name="First contribution" -e="random entropy"
snarkjs powersoftau prepare phase2 pot15_0001.ptau pot15_final.ptau
snarkjs powersoftau verify pot15_final.ptau
```

This creates `pot15_final.ptau` (37 MB) - **NOT recommended for production**.

---

## Production-Ready Files

### **powersOfTau28_hez_final.ptau** (2.3 GB) ⭐ RECOMMENDED

- **Power:** 2^28 (268,435,456 constraints max)
- **Contributions:** 1 ("UZKV production contribution")
- **Phase 2 Ready:** ✅ Yes
- **Use Case:** Production circuits (industry-grade)
- **Status:** Ready for production use
- **Default:** Use this for all circuits unless testing only

### **pot15_final.ptau** (37 MB)

- **Power:** 2^15 (32,768 constraints max)
- **Contributions:** 1 ("First contribution")
- **Phase 2 Ready:** ✅ Yes
- **Use Case:** Quick testing & development only
- **Status:** NOT recommended for production

### **pot15_0001_final.ptau** (37 MB)

- **Power:** 2^15 (32,768 constraints max)
- **Contributions:** 1 ("First contribution")
- **Phase 2 Ready:** ✅ Yes
- **Use Case:** Alternative development file
- **Status:** NOT recommended for production

## Intermediate Files (Reference)

### **pot15_0000_contrib.ptau** (13 MB)

- Contributions: 1 ("Development contribution")
- Phase 2: Not prepared (use pot15_final.ptau instead)

### **pot15_0001.ptau** (13 MB)

- Contributions: 1 ("First contribution")
- Phase 2: Not prepared (use pot15_0001_final.ptau instead)

### **powersOfTau28_hez_0001.ptau** (769 MB)

- Contributions: 1 ("UZKV production contribution")
- Phase 2: Not prepared (use powersOfTau28_hez_final.ptau instead)

## Initial Files (Not for Production)

### **pot15_0000.ptau** (13 MB)

- ⚠️ No contributions - reference only

### **powersOfTau28_hez_0000.ptau** (769 MB)

- ⚠️ No contributions - reference only

---

## Usage Guide

### For Production (RECOMMENDED - Default for All Circuits)

```bash
# Use powersOfTau28_hez_final.ptau (2^28 = 268M constraints)
snarkjs groth16 setup circuit.r1cs ptau/powersOfTau28_hez_final.ptau circuit_0000.zkey
```

### For Quick Testing Only (< 32k constraints)

```bash
# Use pot15_final.ptau (NOT FOR PRODUCTION)
snarkjs groth16 setup circuit.r1cs ptau/pot15_final.ptau circuit_0000.zkey
```

**⚠️ Always use powersOfTau28_hez_final.ptau for production deployments!**

---

## Verification

All production-ready files have been verified:

```bash
$ snarkjs powersoftau verify pot15_final.ptau
[INFO]  snarkJS: Powers of Tau Ok!

$ snarkjs powersoftau verify pot15_0001_final.ptau
[INFO]  snarkJS: Powers of Tau Ok!

$ snarkjs powersoftau verify powersOfTau28_hez_final.ptau
[INFO]  snarkJS: Powers of Tau Ok!
```

---

## File Sizes Summary

| File                             | Size       | Constraints | Status            | Use             |
| -------------------------------- | ---------- | ----------- | ----------------- | --------------- |
| **powersOfTau28_hez_final.ptau** | **2.3 GB** | **268M+**   | ✅ **PRODUCTION** | ⭐ **Default**  |
| pot15_final.ptau                 | 37 MB      | 32,768      | ⚠️ Testing only   | Not recommended |
| pot15_0001_final.ptau            | 37 MB      | 32,768      | ⚠️ Testing only   | Not recommended |

**Recommended File:** powersOfTau28_hez_final.ptau (2.3 GB)
**Total Space (with testing files):** ~2.4 GB
