#!/usr/bin/env bash
#
# WASM Build and Optimization Script
#
# This script builds the Stylus contract for WASM target and applies
# aggressive size optimizations using wasm-opt from Binaryen.
#
# Target: < 24KB optimized binary size
# Optimization level: -Oz (optimize for size)
#
# Usage: ./scripts/build_wasm.sh

set -euo pipefail

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
STYLUS_DIR="${PROJECT_ROOT}/packages/stylus"
TARGET_DIR="${STYLUS_DIR}/target/wasm32-unknown-unknown/release"
OUTPUT_DIR="${STYLUS_DIR}/artifacts"
WASM_NAME="uzkv_stylus"
TARGET_SIZE_KB=24

echo -e "${BLUE}=== UZKV Stylus WASM Build ===${NC}"
echo ""

# Check prerequisites
echo -e "${YELLOW}[1/5] Checking prerequisites...${NC}"

if ! command -v cargo &> /dev/null; then
    echo -e "${RED}Error: cargo not found${NC}"
    exit 1
fi

if ! command -v wasm-opt &> /dev/null; then
    echo -e "${RED}Error: wasm-opt not found${NC}"
    echo "Install Binaryen: https://github.com/WebAssembly/binaryen/releases"
    exit 1
fi

echo "  ✓ cargo: $(cargo --version)"
echo "  ✓ wasm-opt: $(wasm-opt --version)"
echo ""

# Clean previous builds
echo -e "${YELLOW}[2/5] Cleaning previous builds...${NC}"
cd "${STYLUS_DIR}"
cargo clean
rm -rf "${OUTPUT_DIR}"
mkdir -p "${OUTPUT_DIR}"
echo "  ✓ Build directory cleaned"
echo ""

# Build WASM binary
echo -e "${YELLOW}[3/5] Building WASM binary (release mode)...${NC}"
RUSTFLAGS="-C link-arg=-zstack-size=65536 -C opt-level=z -C lto=fat -C codegen-units=1 -C strip=symbols" \
    cargo build --release --target wasm32-unknown-unknown --package uzkv-stylus

if [ ! -f "${TARGET_DIR}/${WASM_NAME}.wasm" ]; then
    echo -e "${RED}Error: WASM build failed${NC}"
    exit 1
fi

# Get unoptimized size
UNOPT_SIZE=$(stat -c%s "${TARGET_DIR}/${WASM_NAME}.wasm" 2>/dev/null || stat -f%z "${TARGET_DIR}/${WASM_NAME}.wasm")
UNOPT_SIZE_KB=$((UNOPT_SIZE / 1024))
echo "  ✓ Unoptimized WASM: ${UNOPT_SIZE_KB}KB (${UNOPT_SIZE} bytes)"
echo ""

# Optimize with wasm-opt
echo -e "${YELLOW}[4/5] Optimizing with wasm-opt -Oz...${NC}"
wasm-opt -Oz \
    --enable-bulk-memory \
    --enable-sign-ext \
    --enable-mutable-globals \
    --enable-nontrapping-float-to-int \
    "${TARGET_DIR}/${WASM_NAME}.wasm" \
    -o "${OUTPUT_DIR}/${WASM_NAME}_optimized.wasm"

# Get optimized size
OPT_SIZE=$(stat -c%s "${OUTPUT_DIR}/${WASM_NAME}_optimized.wasm" 2>/dev/null || stat -f%z "${OUTPUT_DIR}/${WASM_NAME}_optimized.wasm")
OPT_SIZE_KB=$((OPT_SIZE / 1024))
REDUCTION=$((100 - (OPT_SIZE * 100 / UNOPT_SIZE)))

echo "  ✓ Optimized WASM: ${OPT_SIZE_KB}KB (${OPT_SIZE} bytes)"
echo "  ✓ Size reduction: ${REDUCTION}%"
echo ""

# Validate size target
echo -e "${YELLOW}[5/5] Validating size target...${NC}"
if [ ${OPT_SIZE_KB} -lt ${TARGET_SIZE_KB} ]; then
    echo -e "  ${GREEN}✓ SUCCESS: Binary size (${OPT_SIZE_KB}KB) < target (${TARGET_SIZE_KB}KB)${NC}"
else
    echo -e "  ${YELLOW}⚠ WARNING: Binary size (${OPT_SIZE_KB}KB) >= target (${TARGET_SIZE_KB}KB)${NC}"
    echo "  Consider further optimizations:"
    echo "    - Review dependency tree (cargo tree)"
    echo "    - Enable LTO (already enabled)"
    echo "    - Strip debug symbols (already enabled)"
fi
echo ""

# Copy unoptimized binary for comparison
cp "${TARGET_DIR}/${WASM_NAME}.wasm" "${OUTPUT_DIR}/${WASM_NAME}_unoptimized.wasm"

# Generate build report
echo -e "${BLUE}=== Build Report ===${NC}"
echo "Unoptimized: ${UNOPT_SIZE_KB}KB"
echo "Optimized:   ${OPT_SIZE_KB}KB"
echo "Reduction:   ${REDUCTION}%"
echo "Target:      ${TARGET_SIZE_KB}KB"
echo ""
echo "Artifacts:"
echo "  - ${OUTPUT_DIR}/${WASM_NAME}_optimized.wasm"
echo "  - ${OUTPUT_DIR}/${WASM_NAME}_unoptimized.wasm"
echo ""

# Save build report to file
cat > "${OUTPUT_DIR}/build_report.txt" << EOF
UZKV Stylus WASM Build Report
Generated: $(date -u +"%Y-%m-%d %H:%M:%S UTC")

=== Binary Sizes ===
Unoptimized: ${UNOPT_SIZE} bytes (${UNOPT_SIZE_KB}KB)
Optimized:   ${OPT_SIZE} bytes (${OPT_SIZE_KB}KB)
Reduction:   ${REDUCTION}%
Target:      ${TARGET_SIZE_KB}KB

=== Build Configuration ===
Rust Toolchain: $(rustc --version)
Cargo Version:  $(cargo --version)
wasm-opt:       $(wasm-opt --version)

=== Rust Flags ===
- opt-level=z (optimize for size)
- lto=fat (link-time optimization)
- codegen-units=1 (maximum optimization)
- strip=symbols (remove debug symbols)
- stack-size=65536 (64KB stack)

=== wasm-opt Flags ===
- -Oz (aggressive size optimization)
- --enable-bulk-memory
- --enable-sign-ext
- --enable-mutable-globals
- --enable-nontrapping-float-to-int

=== Output Files ===
${OUTPUT_DIR}/${WASM_NAME}_optimized.wasm
${OUTPUT_DIR}/${WASM_NAME}_unoptimized.wasm
${OUTPUT_DIR}/build_report.txt
EOF

echo -e "${GREEN}✓ Build complete! See ${OUTPUT_DIR}/build_report.txt for details.${NC}"
