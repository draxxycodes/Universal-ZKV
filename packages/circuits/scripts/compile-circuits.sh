#!/bin/bash

# Circuit Compilation Script
# Compiles all circuits and displays constraint information

set -e  # Exit on error

CIRCUITS_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
SRC_DIR="$CIRCUITS_DIR/src"
BUILD_DIR="$CIRCUITS_DIR/build"

echo "🔨 Compiling Production-Grade Circuits"
echo "========================================"
echo ""

# Ensure build directory exists
mkdir -p "$BUILD_DIR"

# List of circuits to compile
CIRCUITS=("poseidon_test" "eddsa_verify" "merkle_proof")

# Compile each circuit
for circuit in "${CIRCUITS[@]}"; do
    echo "📦 Compiling $circuit..."
    echo "----------------------------------------"
    
    # Check if source file exists
    if [ ! -f "$SRC_DIR/${circuit}.circom" ]; then
        echo "❌ Error: $SRC_DIR/${circuit}.circom not found"
        exit 1
    fi
    
    # Compile circuit
    circom "$SRC_DIR/${circuit}.circom" \
        --r1cs \
        --wasm \
        --sym \
        --c \
        -o "$BUILD_DIR/" \
        -l node_modules
    
    if [ $? -eq 0 ]; then
        echo "✅ Compilation successful"
        echo ""
        
        # Display circuit information
        echo "📊 Circuit Information:"
        snarkjs r1cs info "$BUILD_DIR/${circuit}.r1cs"
        echo ""
        
        # Print circuit statistics
        echo "📈 Circuit Statistics:"
        snarkjs r1cs print "$BUILD_DIR/${circuit}.r1cs" "$BUILD_DIR/${circuit}.sym" | head -20
        echo ""
        
        # Check file sizes
        echo "💾 File Sizes:"
        ls -lh "$BUILD_DIR/${circuit}.r1cs" | awk '{print "  R1CS: " $5}'
        ls -lh "$BUILD_DIR/${circuit}.sym" | awk '{print "  Symbols: " $5}'
        du -sh "$BUILD_DIR/${circuit}_js" | awk '{print "  WASM: " $1}'
        echo ""
        
    else
        echo "❌ Compilation failed for $circuit"
        exit 1
    fi
    
    echo "========================================"
    echo ""
done

echo "🎉 All circuits compiled successfully!"
echo ""
echo "📁 Build artifacts location: $BUILD_DIR"
echo ""
echo "Next steps:"
echo "  1. Review constraint counts above"
echo "  2. Proceed to Task 3.5.3 (Trusted Setup)"
echo "  3. Generate zkey files for each circuit"
echo ""
echo "Example command to view circuit constraints:"
echo "  snarkjs r1cs info $BUILD_DIR/poseidon_test.r1cs"
echo ""
