#!/bin/bash
# Generate PLONK proofs for all circuits
# Task 2.7: PLONK Proof Generation Pipeline

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
CIRCUITS_DIR="$(dirname "$SCRIPT_DIR")"
BUILD_DIR="$CIRCUITS_DIR/build"
PTAU_DIR="$CIRCUITS_DIR/ptau"
PROOFS_DIR="$CIRCUITS_DIR/proofs/plonk"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${GREEN}=== PLONK Proof Generation Pipeline ===${NC}"
echo ""

# Check prerequisites
if ! command -v snarkjs &> /dev/null; then
    echo -e "${RED}Error: snarkjs not found${NC}"
    echo "Install with: npm install -g snarkjs"
    exit 1
fi

if ! command -v circom &> /dev/null; then
    echo -e "${RED}Error: circom not found${NC}"
    echo "Install from: https://docs.circom.io/getting-started/installation/"
    exit 1
fi

# Check for Powers of Tau file
PTAU_FILE="$PTAU_DIR/powersOfTau28_hez_final.ptau"
if [ ! -f "$PTAU_FILE" ]; then
    echo -e "${RED}Error: Powers of Tau file not found${NC}"
    echo "Expected: $PTAU_FILE"
    echo ""
    echo "Generate with:"
    echo "  cd $PTAU_DIR"
    echo "  snarkjs powersoftau new bn128 28 powersOfTau28_hez_0000.ptau"
    echo "  snarkjs powersoftau contribute powersOfTau28_hez_0000.ptau powersOfTau28_hez_0001.ptau --name='UZKV' -e='random'"
    echo "  snarkjs powersoftau prepare phase2 powersOfTau28_hez_0001.ptau powersOfTau28_hez_final.ptau"
    exit 1
fi

# Create output directories
mkdir -p "$PROOFS_DIR"
mkdir -p "$BUILD_DIR"

# List of circuits to process
CIRCUITS=("poseidon_test" "eddsa_verify" "merkle_proof")

for CIRCUIT in "${CIRCUITS[@]}"; do
    echo -e "${YELLOW}Processing circuit: $CIRCUIT${NC}"
    
    CIRCUIT_FILE="$CIRCUITS_DIR/src/${CIRCUIT}.circom"
    R1CS_FILE="$BUILD_DIR/${CIRCUIT}.r1cs"
    WASM_DIR="$BUILD_DIR/${CIRCUIT}_js"
    ZKEY_FILE="$BUILD_DIR/${CIRCUIT}_plonk.zkey"
    VK_FILE="$BUILD_DIR/${CIRCUIT}_plonk_vk.json"
    
    # Step 1: Compile circuit if not already compiled
    if [ ! -f "$R1CS_FILE" ]; then
        echo "  Compiling circuit..."
        circom "$CIRCUIT_FILE" --r1cs --wasm --sym -o "$BUILD_DIR/" || {
            echo -e "${RED}  Failed to compile $CIRCUIT${NC}"
            continue
        }
    else
        echo "  Circuit already compiled"
    fi
    
    # Step 2: Generate PLONK setup if not exists
    if [ ! -f "$ZKEY_FILE" ]; then
        echo "  Generating PLONK setup..."
        snarkjs plonk setup "$R1CS_FILE" "$PTAU_FILE" "$ZKEY_FILE" || {
            echo -e "${RED}  Failed PLONK setup for $CIRCUIT${NC}"
            continue
        }
    else
        echo "  PLONK setup already exists"
    fi
    
    # Step 3: Export verification key
    if [ ! -f "$VK_FILE" ]; then
        echo "  Exporting verification key..."
        snarkjs zkey export verificationkey "$ZKEY_FILE" "$VK_FILE" || {
            echo -e "${RED}  Failed to export VK for $CIRCUIT${NC}"
            continue
        }
    else
        echo "  Verification key already exported"
    fi
    
    # Step 4: Generate sample proofs
    echo "  Generating sample proofs..."
    
    CIRCUIT_PROOFS_DIR="$PROOFS_DIR/$CIRCUIT"
    mkdir -p "$CIRCUIT_PROOFS_DIR"
    
    # Generate 10 sample proofs per circuit
    for i in {1..10}; do
        INPUT_FILE="$CIRCUIT_PROOFS_DIR/input_$i.json"
        WITNESS_FILE="$CIRCUIT_PROOFS_DIR/witness_$i.wtns"
        PROOF_FILE="$CIRCUIT_PROOFS_DIR/proof_$i.json"
        PUBLIC_FILE="$CIRCUIT_PROOFS_DIR/public_$i.json"
        
        # Skip if proof already exists
        if [ -f "$PROOF_FILE" ]; then
            continue
        fi
        
        # Generate input based on circuit type
        case $CIRCUIT in
            "poseidon_test")
                # Random preimage values
                A=$((RANDOM % 1000))
                B=$((RANDOM % 1000))
                echo "{\"preimage\": [\"$A\", \"$B\"]}" > "$INPUT_FILE"
                ;;
            "eddsa_verify")
                # This requires actual EdDSA signature - skip for now
                echo "  Skipping EdDSA (requires signature generation)"
                continue
                ;;
            "merkle_proof")
                # This requires Merkle tree setup - skip for now
                echo "  Skipping Merkle (requires tree setup)"
                continue
                ;;
        esac
        
        # Generate witness
        node "$WASM_DIR/generate_witness.js" \
            "$WASM_DIR/${CIRCUIT}.wasm" \
            "$INPUT_FILE" \
            "$WITNESS_FILE" 2>/dev/null || {
            echo -e "${RED}    Failed to generate witness $i${NC}"
            continue
        }
        
        # Generate proof
        snarkjs plonk prove \
            "$ZKEY_FILE" \
            "$WITNESS_FILE" \
            "$PROOF_FILE" \
            "$PUBLIC_FILE" 2>/dev/null || {
            echo -e "${RED}    Failed to generate proof $i${NC}"
            continue
        }
        
        # Verify proof
        snarkjs plonk verify \
            "$VK_FILE" \
            "$PUBLIC_FILE" \
            "$PROOF_FILE" 2>/dev/null && {
            echo -e "${GREEN}    Generated and verified proof $i${NC}"
        } || {
            echo -e "${RED}    Proof $i verification failed${NC}"
        }
    done
    
    echo ""
done

echo -e "${GREEN}=== PLONK Proof Generation Complete ===${NC}"
echo ""
echo "Generated proofs saved to: $PROOFS_DIR"
echo ""
echo "Next steps:"
echo "  1. Review generated proofs in $PROOFS_DIR"
echo "  2. Test with plonk-service: cd ../plonk-service && pnpm dev"
echo "  3. Run integration tests: cd .. && pnpm test"
