#!/bin/bash
# Compile PublicStatement-standardized circuits
# Purpose: Compile circuits that output standardized PublicStatement format

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
CIRCUITS_ROOT="$(dirname "$SCRIPT_DIR")"
SRC_DIR="$CIRCUITS_ROOT/src"
BUILD_DIR="$CIRCUITS_ROOT/build"
PTAU_PATH="$CIRCUITS_ROOT/powers_of_tau/powersOfTau28_hez_final_16.ptau"

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${BLUE}=== Compiling PublicStatement Circuits ===${NC}"

# Create build directory
mkdir -p "$BUILD_DIR"

# Check if Powers of Tau file exists
if [ ! -f "$PTAU_PATH" ]; then
    echo -e "${YELLOW}⚠️  Powers of Tau file not found at $PTAU_PATH${NC}"
    echo "   Download with: wget https://hermez.s3-eu-west-1.amazonaws.com/powersOfTau28_hez_final_16.ptau"
    echo "   Place in: $CIRCUITS_ROOT/powers_of_tau/"
    exit 1
fi

# Define circuits to compile
CIRCUITS=(
    "poseidon_with_statement"
    "eddsa_with_statement"
    "merkle_with_statement"
)

echo -e "${BLUE}Circuits to compile: ${#CIRCUITS[@]}${NC}"

for CIRCUIT in "${CIRCUITS[@]}"; do
    echo ""
    echo -e "${GREEN}Compiling ${CIRCUIT}...${NC}"
    
    CIRCUIT_PATH="$SRC_DIR/${CIRCUIT}.circom"
    CIRCUIT_BUILD_DIR="$BUILD_DIR/${CIRCUIT}"
    
    if [ ! -f "$CIRCUIT_PATH" ]; then
        echo -e "${YELLOW}⚠️  Circuit not found: $CIRCUIT_PATH${NC}"
        continue
    fi
    
    mkdir -p "$CIRCUIT_BUILD_DIR"
    
    # Step 1: Compile circuit to R1CS
    echo "  [1/4] Compiling to R1CS..."
    circom "$CIRCUIT_PATH" \
        --r1cs \
        --wasm \
        --sym \
        --c \
        --output "$CIRCUIT_BUILD_DIR" \
        --O1
    
    # Step 2: Export R1CS info
    echo "  [2/4] Exporting R1CS info..."
    snarkjs r1cs info "$CIRCUIT_BUILD_DIR/${CIRCUIT}.r1cs"
    
    # Step 3: Export R1CS to JSON (for debugging)
    echo "  [3/4] Exporting R1CS to JSON..."
    snarkjs r1cs export json "$CIRCUIT_BUILD_DIR/${CIRCUIT}.r1cs" "$CIRCUIT_BUILD_DIR/${CIRCUIT}_r1cs.json"
    
    # Step 4: Generate Groth16 proving key
    echo "  [4/4] Generating Groth16 zkey..."
    snarkjs groth16 setup "$CIRCUIT_BUILD_DIR/${CIRCUIT}.r1cs" "$PTAU_PATH" "$CIRCUIT_BUILD_DIR/${CIRCUIT}_groth16.zkey"
    
    # Export verification key
    echo "  Exporting verification key..."
    snarkjs zkey export verificationkey "$CIRCUIT_BUILD_DIR/${CIRCUIT}_groth16.zkey" "$CIRCUIT_BUILD_DIR/${CIRCUIT}_groth16_vkey.json"
    
    echo -e "${GREEN}✅ ${CIRCUIT} compiled successfully${NC}"
    echo "   - R1CS: $CIRCUIT_BUILD_DIR/${CIRCUIT}.r1cs"
    echo "   - WASM: $CIRCUIT_BUILD_DIR/${CIRCUIT}_js/${CIRCUIT}.wasm"
    echo "   - zkey: $CIRCUIT_BUILD_DIR/${CIRCUIT}_groth16.zkey"
    echo "   - vkey: $CIRCUIT_BUILD_DIR/${CIRCUIT}_groth16_vkey.json"
done

echo ""
echo -e "${GREEN}=== Compilation Complete ===${NC}"
echo -e "${BLUE}Total circuits compiled: ${#CIRCUITS[@]}${NC}"
echo ""
echo "Next steps:"
echo "  1. Generate test inputs: pnpm run statement:inputs"
echo "  2. Generate proofs: snarkjs groth16 prove ..."
echo "  3. Verify proofs: snarkjs groth16 verify ..."
