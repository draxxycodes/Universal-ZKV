# Powers of Tau Files

**Note:** PTAU files are not stored in git due to their large size. Generate them locally using the instructions below.

## Quick Setup

Generate the required PTAU files for development:

```bash
cd packages/circuits/ptau

# Generate Powers of Tau (2^15 = 32k constraints)
snarkjs powersoftau new bn128 15 pot15_0000.ptau
snarkjs powersoftau contribute pot15_0000.ptau pot15_0001.ptau \
  --name="First contribution" -e="random entropy"
snarkjs powersoftau prepare phase2 pot15_0001.ptau pot15_final.ptau

# Verify
snarkjs powersoftau verify pot15_final.ptau
```

This creates `pot15_final.ptau` (37 MB) ready for circuits up to 32,768 constraints.

---

## Production-Ready Files

### **pot15_final.ptau** (37 MB)
- **Power:** 2^15 (32,768 constraints max)
- **Contributions:** 1 ("First contribution")
- **Phase 2 Ready:** ✅ Yes
- **Use Case:** Development & testing circuits
- **Status:** Ready to use immediately

### **pot15_0001_final.ptau** (37 MB)
- **Power:** 2^15 (32,768 constraints max)
- **Contributions:** 1 ("First contribution")
- **Phase 2 Ready:** ✅ Yes
- **Use Case:** Alternative development file
- **Status:** Ready to use immediately

### **powersOfTau28_hez_final.ptau** (2.3 GB)
- **Power:** 2^28 (268,435,456 constraints max)
- **Contributions:** 1 ("UZKV production contribution")
- **Phase 2 Ready:** ✅ Yes
- **Use Case:** Large production circuits
- **Status:** Ready for production use

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

### For Development/Testing (< 32k constraints)
```bash
# Use pot15_final.ptau
snarkjs groth16 setup circuit.r1cs pot15_final.ptau circuit_0000.zkey
```

### For Production (> 32k constraints, up to 268M)
```bash
# Use powersOfTau28_hez_final.ptau
snarkjs groth16 setup circuit.r1cs powersOfTau28_hez_final.ptau circuit_0000.zkey
```

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

| File | Size | Constraints | Status |
|------|------|-------------|--------|
| pot15_final.ptau | 37 MB | 32,768 | ✅ Ready |
| pot15_0001_final.ptau | 37 MB | 32,768 | ✅ Ready |
| powersOfTau28_hez_final.ptau | 2.3 GB | 268M+ | ✅ Ready |

**Total Production Files:** 3  
**Total Space (production):** ~2.4 GB
