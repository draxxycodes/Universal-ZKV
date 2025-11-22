# Task 3.5.1: circom & snarkjs Installation

**Date:** November 20, 2025  
**Status:** ✅ Complete  
**Phase:** 3.5 - Production Circuit Infrastructure  
**Commit:** ae1b319

---

## What We Did

Successfully installed and configured the complete proof generation infrastructure:

1. ✅ **circom Compiler Installation** - v2.2.3 (Rust-based)
2. ✅ **snarkjs Installation** - v0.7.5 (already installed)
3. ✅ **Powers of Tau Generation** - Created pot15_final.ptau (2^15 constraints = 32,768 max)
4. ✅ **Directory Structure** - packages/circuits/ptau/

---

## How We Did It

### 1. circom Compiler Installation

```bash
# Clone circom repository
git clone https://github.com/iden3/circom.git /tmp/circom-build
cd /tmp/circom-build

# Build from source (Rust-based)
cargo build --release
# Compilation took ~1 minute, produced ~114 dependencies

# Install globally
cargo install --path circom

# Verify installation
circom --version
# Output: circom compiler 2.2.3
```

**Build Details:**
- Compilation target: x86_64-pc-windows-msvc
- Build type: Release (optimized)
- Warnings: 6 (non-critical - unused fields, lifetime syntaxes)
- Installation path: C:\Users\priya\.cargo\bin\circom.exe

### 2. snarkjs Verification

```bash
snarkjs --version
# Output: snarkjs@0.7.5
```

**Already installed** via npm globally - no action required.

### 3. Powers of Tau Generation

Since the official Hermez ceremony files had download issues (Access Denied, connection resets), we generated our own Powers of Tau ceremony for development:

```bash
# Create directory structure
mkdir -p packages/circuits/ptau
cd packages/circuits/ptau

# Generate initial Powers of Tau (2^15 = 32k constraints)
snarkjs powersoftau new bn128 15 pot15_0000.ptau -v

# Add contribution with entropy
snarkjs powersoftau contribute pot15_0000.ptau pot15_0001.ptau \
  --name="First contribution" \
  -e="random entropy for uzkv project"

# Prepare for phase 2 (circuit-specific setup)
snarkjs powersoftau prepare phase2 pot15_0001.ptau pot15_final.ptau -v

# Verify the final file
snarkjs powersoftau verify pot15_final.ptau
```

**Verification Output:**
```
[INFO]  snarkJS: Powers Of tau file OK!
[INFO]  snarkJS: Contribution #1: First contribution
[INFO]  snarkJS: Powers of Tau Ok!
```

**File Sizes:**
- pot15_0000.ptau: 13 MB (initial)
- pot15_0001.ptau: 13 MB (after contribution)
- pot15_final.ptau: 37 MB (ready for phase 2)

---

## Verification

### 1. Tool Versions

```bash
$ circom --version
circom compiler 2.2.3

$ snarkjs --version
snarkjs@0.7.5
```

### 2. Powers of Tau Validation

```bash
$ snarkjs powersoftau verify pot15_final.ptau
[INFO]  snarkJS: Powers Of tau file OK!
[INFO]  snarkJS: Powers of Tau Ok!
```

**Hash Information:**
- First Contribution Hash: `eca6f514 b89180fc fc6bf9f8 81a5670c...`
- Next Challenge Hash: `0e468771 db8a717b d2e43e1a 09068d46...`
- Response Hash: `de584cba 05afc7a9 8ccc8dce 2d9dcace...`

### 3. Directory Structure

```
packages/circuits/ptau/
├── pot15_0000.ptau        # 13 MB - Initial ceremony
├── pot15_0001.ptau        # 13 MB - After contribution
├── pot15_final.ptau       # 37 MB - Ready for circuits ✅
└── powersOfTau28_hez_0000.ptau  # 769 MB - Hermez initial (unused)
```

---

## Technical Notes

### circom Installation Details

**Compilation Process:**
- Total dependencies: 114 packages
- Build time: ~63 seconds
- Key dependencies:
  - lalrpop v0.19.12 (parser generator)
  - handlebars v4.5.0 (templating)
  - pest v2.8.3 (parsing expression grammar)
  - wast v39.0.0 (WASM text format)

**Internal Modules:**
- `circom_algebra` - Field arithmetic
- `program_structure` - AST definitions
- `constraint_writers` - R1CS output
- `constraint_list` - Constraint management
- `type_analysis` - Type checking
- `code_producers` - Code generation
- `compiler` - Main compilation logic
- `parser` - circom language parser

### Powers of Tau Ceremony

**Curve:** bn128 (Barreto-Naehrig 128-bit security)  
**Power:** 15 (2^15 = 32,768 constraints max)  
**Phase 1:** Generic setup (curve-dependent)  
**Phase 2:** Circuit-specific (requires pot15_final.ptau)

**Why 2^15 instead of 2^28?**
- Development/testing: 32k constraints sufficient for test circuits
- File size: 37 MB vs 2+ GB for larger ceremonies
- Download issues: Hermez S3 bucket Access Denied
- Production: Can upgrade to larger ceremony when needed

**FFT Processing:**
The prepare phase2 command performed extensive FFT (Fast Fourier Transform) operations:
- alphaTauG1: FFT levels 10-15 (mixing and joining phases)
- betaTauG1: FFT levels 0-15 (complete transformation)
- Processing: 16 parallel workers per level
- Total operations: ~500,000+ FFT computations

---

## Production Considerations

### Current Setup (Development)
- ✅ 2^15 constraints (32,768 max)
- ✅ Sufficient for:
  - Simple Groth16 circuits
  - Basic PLONK circuits
  - Test/development workflows

### Future Upgrade Path

**For production circuits requiring more constraints:**

1. **Download pre-trusted ceremony:**
   ```bash
   # Try alternative sources
   curl -L -o powersOfTau28_hez_final_21.ptau \
     https://hermez.s3-eu-west-1.amazonaws.com/powersOfTau28_hez_final_21.ptau
   
   # Or use Polygon Hermez GitHub releases
   # Or use SnarkJS ceremony files from GitHub
   ```

2. **Or generate larger ceremony:**
   ```bash
   # 2^21 = 2,097,152 constraints (production-grade)
   snarkjs powersoftau new bn128 21 pot21_0000.ptau
   snarkjs powersoftau contribute pot21_0000.ptau pot21_0001.ptau \
     --name="Production contribution"
   snarkjs powersoftau prepare phase2 pot21_0001.ptau pot21_final.ptau
   ```

**Constraint Requirements:**
- Groth16 verifier: ~1,000-2,000 constraints
- PLONK verifier: ~5,000-10,000 constraints
- STARK verifier: ~50,000-100,000 constraints
- Complex circuits: 100,000+ constraints

---

## Next Steps

1. **Task 3.5.2:** Create test circuit (`multiplier.circom`)
2. **Task 3.5.3:** Compile circuit to R1CS format
3. **Task 3.5.4:** Generate Groth16 proof with real circuit
4. **Task 3.5.5:** Verify proof generation pipeline
5. **Task 3.5.6:** Integrate with existing Groth16 verifier

---

## Files Created

```
packages/circuits/ptau/
├── pot15_0000.ptau        # Initial Powers of Tau
├── pot15_0001.ptau        # After contribution
└── pot15_final.ptau       # Ready for circuit setup ✅
```

**Total space:** 63 MB (development files)

---

## Commands Used

```bash
# circom installation
git clone https://github.com/iden3/circom.git /tmp/circom-build
cd /tmp/circom-build && cargo build --release
cargo install --path circom

# Powers of Tau ceremony
cd packages/circuits/ptau
snarkjs powersoftau new bn128 15 pot15_0000.ptau -v
snarkjs powersoftau contribute pot15_0000.ptau pot15_0001.ptau \
  --name="First contribution" -e="random entropy for uzkv project"
snarkjs powersoftau prepare phase2 pot15_0001.ptau pot15_final.ptau -v
snarkjs powersoftau verify pot15_final.ptau
```

---

## Success Criteria

- ✅ circom compiler v2.2.3+ installed and functional
- ✅ snarkjs v0.7.0+ available (v0.7.5 confirmed)
- ✅ Powers of Tau file generated and verified
- ✅ pot15_final.ptau ready for circuit compilation
- ✅ Directory structure created (packages/circuits/ptau/)
- ✅ All tools verified with version checks

---

**Status:** ✅ COMPLETE - Ready for circuit development (Task 3.5.2)
