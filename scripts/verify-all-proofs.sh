#!/bin/bash
#
# Proof Verification Script for UZKV Test Circuits
# 
# Verifies all generated proofs using snarkjs groth16 verify
# 
# Usage:
#   ./scripts/verify-all-proofs.sh [circuit_name] [max_proofs]
# 
# Examples:
#   ./scripts/verify-all-proofs.sh                     # Verify all proofs for all circuits
#   ./scripts/verify-all-proofs.sh poseidon_test       # Verify only Poseidon proofs
#   ./scripts/verify-all-proofs.sh poseidon_test 100   # Verify first 100 Poseidon proofs

# Configuration
CIRCUITS=("poseidon_test" "eddsa_verify" "merkle_proof")
BASE_DIR="$(cd "$(dirname "$0")/.." && pwd)"
BUILD_DIR="$BASE_DIR/packages/circuits/build"
PROOFS_DIR="$BASE_DIR/packages/circuits/proofs"

# VK file mapping (circuit name -> zkey base name)
declare -A VK_MAP
VK_MAP["poseidon_test"]="poseidon"
VK_MAP["eddsa_verify"]="eddsa"
VK_MAP["merkle_proof"]="merkle"

# Statistics
TOTAL_VALID=0
TOTAL_INVALID=0
TOTAL_MISSING=0
TOTAL_ERRORS=0

# Parse command line arguments
SELECTED_CIRCUIT="${1:-all}"
MAX_PROOFS="${2:-10000}"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Helper function to print colored output
print_status() {
    local color=$1
    local message=$2
    echo -e "${color}${message}${NC}"
}

# Verify a single proof
verify_proof() {
    local circuit=$1
    local proof_id=$2
    local vk_base="${VK_MAP[$circuit]}"
    
    local vk_file="$BUILD_DIR/${vk_base}_vk.json"
    local proof_file="$PROOFS_DIR/$circuit/valid/${circuit}_${proof_id}_proof.json"
    local public_file="$PROOFS_DIR/$circuit/valid/${circuit}_${proof_id}_public.json"
    
    # Check if files exist
    if [ ! -f "$vk_file" ]; then
        print_status "$RED" "  ❌ VK file not found: $vk_file"
        ((TOTAL_ERRORS++))
        return 1
    fi
    
    if [ ! -f "$proof_file" ] || [ ! -f "$public_file" ]; then
        # print_status "$YELLOW" "  ⚠️  ${circuit}_${proof_id}: Files missing"
        ((TOTAL_MISSING++))
        return 2
    fi
    
    # Run snarkjs verification
    if snarkjs groth16 verify "$vk_file" "$public_file" "$proof_file" > /dev/null 2>&1; then
        # print_status "$GREEN" "  ✅ ${circuit}_${proof_id}: VALID"
        ((TOTAL_VALID++))
        return 0
    else
        print_status "$RED" "  ❌ ${circuit}_${proof_id}: INVALID (unexpected!)"
        ((TOTAL_INVALID++))
        return 1
    fi
}

# Verify all proofs for a circuit
verify_circuit() {
    local circuit=$1
    local max=$2
    
    print_status "$BLUE" "\n============================================================"
    print_status "$BLUE" "📊 Verifying proofs for $circuit (max: $max)"
    print_status "$BLUE" "============================================================"
    
    local circuit_valid=0
    local circuit_invalid=0
    local circuit_missing=0
    local start_time=$(date +%s)
    
    # Find actual number of proofs
    local actual_count=$(find "$PROOFS_DIR/$circuit/valid" -name "${circuit}_*_proof.json" 2>/dev/null | wc -l)
    local verify_count=$((actual_count < max ? actual_count : max))
    
    echo "Found $actual_count proofs, verifying first $verify_count..."
    
    for i in $(seq 0 $((verify_count - 1))); do
        verify_proof "$circuit" "$i"
        local result=$?
        
        if [ $result -eq 0 ]; then
            ((circuit_valid++))
        elif [ $result -eq 2 ]; then
            ((circuit_missing++))
        else
            ((circuit_invalid++))
        fi
        
        # Progress indicator (every 10 proofs)
        if [ $((i % 10)) -eq 9 ]; then
            echo -n "."
        fi
    done
    
    echo "" # New line after progress dots
    
    local end_time=$(date +%s)
    local duration=$((end_time - start_time))
    
    print_status "$BLUE" "\n============================================================"
    print_status "$GREEN" "✅ Valid: $circuit_valid/$verify_count"
    if [ $circuit_invalid -gt 0 ]; then
        print_status "$RED" "❌ Invalid: $circuit_invalid/$verify_count"
    fi
    if [ $circuit_missing -gt 0 ]; then
        print_status "$YELLOW" "⚠️  Missing: $circuit_missing/$verify_count"
    fi
    print_status "$BLUE" "⏱️  Time: ${duration}s"
    print_status "$BLUE" "============================================================"
}

# Main execution
main() {
    print_status "$BLUE" "\n============================================================"
    print_status "$BLUE" "🔍 UZKV Proof Verification"
    print_status "$BLUE" "============================================================"
    print_status "$BLUE" "Base Directory: $BASE_DIR"
    print_status "$BLUE" "Build Directory: $BUILD_DIR"
    print_status "$BLUE" "Proofs Directory: $PROOFS_DIR"
    print_status "$BLUE" "============================================================"
    
    # Check if snarkjs is installed
    if ! command -v snarkjs &> /dev/null; then
        print_status "$RED" "❌ Error: snarkjs not found. Install with: npm install -g snarkjs"
        exit 1
    fi
    
    local start_time=$(date +%s)
    
    # Determine which circuits to verify
    if [ "$SELECTED_CIRCUIT" = "all" ]; then
        for circuit in "${CIRCUITS[@]}"; do
            verify_circuit "$circuit" "$MAX_PROOFS"
        done
    else
        # Check if circuit is valid
        if [[ ! " ${CIRCUITS[@]} " =~ " ${SELECTED_CIRCUIT} " ]]; then
            print_status "$RED" "❌ Unknown circuit: $SELECTED_CIRCUIT"
            print_status "$YELLOW" "Valid circuits: ${CIRCUITS[*]}"
            exit 1
        fi
        verify_circuit "$SELECTED_CIRCUIT" "$MAX_PROOFS"
    fi
    
    local end_time=$(date +%s)
    local total_duration=$((end_time - start_time))
    
    # Final summary
    print_status "$BLUE" "\n============================================================"
    print_status "$BLUE" "🎉 VERIFICATION COMPLETE"
    print_status "$BLUE" "============================================================"
    print_status "$BLUE" "📊 Overall Statistics:"
    print_status "$GREEN" "   ✅ Valid proofs: $TOTAL_VALID"
    
    if [ $TOTAL_INVALID -gt 0 ]; then
        print_status "$RED" "   ❌ Invalid proofs: $TOTAL_INVALID (UNEXPECTED!)"
    fi
    
    if [ $TOTAL_MISSING -gt 0 ]; then
        print_status "$YELLOW" "   ⚠️  Missing proofs: $TOTAL_MISSING"
    fi
    
    if [ $TOTAL_ERRORS -gt 0 ]; then
        print_status "$RED" "   ⚠️  Errors: $TOTAL_ERRORS"
    fi
    
    print_status "$BLUE" "   ⏱️  Total time: ${total_duration}s"
    print_status "$BLUE" "============================================================\n"
    
    # Write summary to file
    local summary_file="$PROOFS_DIR/verification-summary.json"
    cat > "$summary_file" << EOF
{
  "timestamp": "$(date -u +%Y-%m-%dT%H:%M:%SZ)",
  "totalValid": $TOTAL_VALID,
  "totalInvalid": $TOTAL_INVALID,
  "totalMissing": $TOTAL_MISSING,
  "totalErrors": $TOTAL_ERRORS,
  "totalDuration": $total_duration,
  "selectedCircuit": "$SELECTED_CIRCUIT",
  "maxProofs": $MAX_PROOFS
}
EOF
    
    print_status "$BLUE" "📄 Summary written to: $summary_file\n"
    
    # Exit with error if any proofs were invalid
    if [ $TOTAL_INVALID -gt 0 ] || [ $TOTAL_ERRORS -gt 0 ]; then
        exit 1
    fi
}

# Run main function
main "$@"
