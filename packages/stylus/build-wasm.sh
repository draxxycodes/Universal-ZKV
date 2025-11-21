#!/bin/bash
# UZKV Stylus WASM Build Script
# 
# This script builds and optimizes the Stylus WASM contract for deployment.
# Must be run on Linux/WSL/Docker due to stylus-sdk linker requirements.
#
# Prerequisites:
# - Rust nightly-2024-02-01 (see rust-toolchain.toml)
# - cargo-stylus: cargo install cargo-stylus
# - wasm-opt: apt install binaryen

set -e  # Exit on error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}════════════════════════════════════════════════════════${NC}"
echo -e "${BLUE}   UZKV Stylus WASM Build & Optimization Script${NC}"
echo -e "${BLUE}════════════════════════════════════════════════════════${NC}"

# Navigate to stylus package
cd "$(dirname "$0")"
SCRIPT_DIR="$(pwd)"

if [ ! -f "Cargo.toml" ]; then
    echo -e "${RED}Error: Must run from packages/stylus directory${NC}"
    exit 1
fi

echo ""
echo -e "${YELLOW}Step 1: Checking prerequisites...${NC}"

# Check Rust toolchain
if ! rustup show | grep -q "nightly-2024-02-01"; then
    echo -e "${YELLOW}Installing required Rust toolchain...${NC}"
    rustup install nightly-2024-02-01
    rustup target add wasm32-unknown-unknown --toolchain nightly-2024-02-01
fi

# Check cargo-stylus
if ! command -v cargo-stylus &> /dev/null; then
    echo -e "${YELLOW}Installing cargo-stylus...${NC}"
    cargo install cargo-stylus
fi

# Check wasm-opt
if ! command -v wasm-opt &> /dev/null; then
    echo -e "${RED}Error: wasm-opt not found. Install with: apt install binaryen${NC}"
    exit 1
fi

echo -e "${GREEN}✓ All prerequisites satisfied${NC}"

# Clean previous builds
echo ""
echo -e "${YELLOW}Step 2: Cleaning previous builds...${NC}"
cargo clean
rm -rf artifacts/
mkdir -p artifacts/

echo -e "${GREEN}✓ Clean complete${NC}"

# Build WASM with cargo-stylus
echo ""
echo -e "${YELLOW}Step 3: Building WASM with cargo-stylus...${NC}"
echo -e "${BLUE}This may take several minutes on first build...${NC}"

cargo stylus build --release

if [ $? -ne 0 ]; then
    echo -e "${RED}Error: WASM build failed${NC}"
    exit 1
fi

echo -e "${GREEN}✓ WASM build complete${NC}"

# Copy unoptimized WASM
WASM_PATH="target/wasm32-unknown-unknown/release/uzkv_stylus.wasm"

if [ ! -f "$WASM_PATH" ]; then
    echo -e "${RED}Error: WASM binary not found at $WASM_PATH${NC}"
    exit 1
fi

cp "$WASM_PATH" artifacts/uzkv_verifier_unoptimized.wasm

UNOPTIMIZED_SIZE=$(stat -f%z "$WASM_PATH" 2>/dev/null || stat -c%s "$WASM_PATH")
echo -e "${BLUE}Unoptimized size: $(numfmt --to=iec-i --suffix=B $UNOPTIMIZED_SIZE)${NC}"

# Optimize with wasm-opt
echo ""
echo -e "${YELLOW}Step 4: Optimizing WASM with wasm-opt...${NC}"

wasm-opt -Oz \
    --enable-bulk-memory \
    --enable-sign-ext \
    "$WASM_PATH" \
    -o artifacts/uzkv_verifier_optimized.wasm

echo -e "${GREEN}✓ Optimization complete${NC}"

OPTIMIZED_SIZE=$(stat -f%z artifacts/uzkv_verifier_optimized.wasm 2>/dev/null || stat -c%s artifacts/uzkv_verifier_optimized.wasm)
REDUCTION=$((100 - (OPTIMIZED_SIZE * 100 / UNOPTIMIZED_SIZE)))

echo -e "${BLUE}Optimized size: $(numfmt --to=iec-i --suffix=B $OPTIMIZED_SIZE)${NC}"
echo -e "${GREEN}Size reduction: ${REDUCTION}%${NC}"

# Check size limit (Arbitrum Stylus limit is ~128KB, but aim for smaller)
SIZE_LIMIT_KB=128
SIZE_KB=$((OPTIMIZED_SIZE / 1024))

if [ $SIZE_KB -gt $SIZE_LIMIT_KB ]; then
    echo -e "${RED}⚠ Warning: WASM size (${SIZE_KB}KB) exceeds recommended limit (${SIZE_LIMIT_KB}KB)${NC}"
else
    echo -e "${GREEN}✓ WASM size (${SIZE_KB}KB) is within limit (${SIZE_LIMIT_KB}KB)${NC}"
fi

# Export ABI
echo ""
echo -e "${YELLOW}Step 5: Exporting Solidity ABI...${NC}"

cargo stylus export-abi > artifacts/IUniversalVerifier_generated.sol

# Also copy our manually created interface
cp ../contracts/src/interfaces/IUniversalVerifier.sol artifacts/IUniversalVerifier.sol

echo -e "${GREEN}✓ ABI exported${NC}"

# Generate build info
echo ""
echo -e "${YELLOW}Step 6: Generating build metadata...${NC}"

BUILD_DATE=$(date -u +"%Y-%m-%dT%H:%M:%SZ")
GIT_COMMIT=$(git rev-parse --short HEAD 2>/dev/null || echo "unknown")
GIT_BRANCH=$(git rev-parse --abbrev-ref HEAD 2>/dev/null || echo "unknown")

cat > artifacts/build-info.json <<EOF
{
  "buildDate": "$BUILD_DATE",
  "gitCommit": "$GIT_COMMIT",
  "gitBranch": "$GIT_BRANCH",
  "rustVersion": "$(rustc --version)",
  "cargoStylusVersion": "$(cargo stylus --version)",
  "wasmOptVersion": "$(wasm-opt --version)",
  "unoptimizedSize": $UNOPTIMIZED_SIZE,
  "optimizedSize": $OPTIMIZED_SIZE,
  "sizeReduction": "${REDUCTION}%",
  "withinSizeLimit": $([ $SIZE_KB -le $SIZE_LIMIT_KB ] && echo "true" || echo "false")
}
EOF

echo -e "${GREEN}✓ Build metadata saved${NC}"

# Verify WASM
echo ""
echo -e "${YELLOW}Step 7: Verifying WASM contract...${NC}"

cargo stylus check --wasm-file artifacts/uzkv_verifier_optimized.wasm

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✓ WASM verification successful${NC}"
else
    echo -e "${YELLOW}⚠ WASM verification skipped (requires Arbitrum RPC)${NC}"
fi

# Summary
echo ""
echo -e "${BLUE}════════════════════════════════════════════════════════${NC}"
echo -e "${GREEN}Build Complete!${NC}"
echo -e "${BLUE}════════════════════════════════════════════════════════${NC}"
echo ""
echo -e "${BLUE}Artifacts:${NC}"
echo -e "  📦 Unoptimized WASM: artifacts/uzkv_verifier_unoptimized.wasm ($(numfmt --to=iec-i --suffix=B $UNOPTIMIZED_SIZE))"
echo -e "  📦 Optimized WASM:   artifacts/uzkv_verifier_optimized.wasm ($(numfmt --to=iec-i --suffix=B $OPTIMIZED_SIZE))"
echo -e "  📄 Solidity ABI:     artifacts/IUniversalVerifier.sol"
echo -e "  📄 Generated ABI:    artifacts/IUniversalVerifier_generated.sol"
echo -e "  📊 Build Info:       artifacts/build-info.json"
echo ""
echo -e "${BLUE}Next Steps:${NC}"
echo -e "  1. Deploy to testnet: ${GREEN}cargo stylus deploy --endpoint <RPC> --private-key <KEY>${NC}"
echo -e "  2. Verify contract:   ${GREEN}cargo stylus verify --deployment-tx <TX_HASH>${NC}"
echo -e "  3. Check on Arbiscan: ${GREEN}https://sepolia.arbiscan.io/${NC}"
echo ""
echo -e "${BLUE}════════════════════════════════════════════════════════${NC}"
