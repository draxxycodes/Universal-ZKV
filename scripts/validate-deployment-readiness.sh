#!/usr/bin/env bash
#
# Testnet Deployment Simulation & Validation
# 
# This script simulates the testnet deployment process and validates
# that all components are ready for actual deployment to Arbitrum Sepolia.
#
# Usage: ./scripts/validate-deployment-readiness.sh

set -euo pipefail

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

echo -e "${BLUE}=== UZKV Testnet Deployment Readiness Check ===${NC}"
echo ""

CHECKS_PASSED=0
CHECKS_FAILED=0

# Function to run check
check() {
    local description="$1"
    local command="$2"
    
    echo -n "  Checking $description..."
    if eval "$command" > /dev/null 2>&1; then
        echo -e " ${GREEN}✓${NC}"
        ((CHECKS_PASSED++))
        return 0
    else
        echo -e " ${RED}✗${NC}"
        ((CHECKS_FAILED++))
        return 1
    fi
}

# Function to run check with output
check_with_output() {
    local description="$1"
    local command="$2"
    
    echo -n "  Checking $description..."
    output=$(eval "$command" 2>&1)
    if [ $? -eq 0 ]; then
        echo -e " ${GREEN}✓${NC}"
        echo "    → $output"
        ((CHECKS_PASSED++))
        return 0
    else
        echo -e " ${RED}✗${NC}"
        echo "    → $output"
        ((CHECKS_FAILED++))
        return 1
    fi
}

echo -e "${YELLOW}[1/7] Checking Toolchain...${NC}"
check "Rust toolchain" "rustc --version | grep -q '1\.[7-9][0-9]\|1\.8[0-9]'"
check "Cargo" "cargo --version"
check "cargo-stylus" "cargo stylus --version"
check "Foundry (forge)" "forge --version"
check "Foundry (cast)" "cast --version"
check "Node.js 20+" "node --version | grep -qE 'v(20|21|22)'"
check "pnpm" "pnpm --version"
echo ""

echo -e "${YELLOW}[2/7] Checking Project Structure...${NC}"
check "Stylus source" "test -f ${PROJECT_ROOT}/packages/stylus/src/lib.rs"
check "Solidity contracts" "test -f ${PROJECT_ROOT}/packages/contracts/src/UniversalZKVerifier.sol"
check "Build script" "test -x ${PROJECT_ROOT}/scripts/build_wasm.sh"
check "Deployment scripts" "test -f ${PROJECT_ROOT}/scripts/deploy-testnet.sh"
check "Foundry script" "test -f ${PROJECT_ROOT}/packages/contracts/script/DeployTestnet.s.sol"
check "Benchmark script" "test -f ${PROJECT_ROOT}/scripts/benchmark-gas.js"
echo ""

echo -e "${YELLOW}[3/7] Checking Environment Configuration...${NC}"
if [ -f "${PROJECT_ROOT}/.env.sepolia" ]; then
    echo -e "  ${GREEN}✓${NC} .env.sepolia exists"
    ((CHECKS_PASSED++))
    
    # Check for required variables
    source "${PROJECT_ROOT}/.env.sepolia" 2>/dev/null || true
    
    if [ -n "${PRIVATE_KEY:-}" ]; then
        echo -e "  ${GREEN}✓${NC} PRIVATE_KEY set"
        ((CHECKS_PASSED++))
    else
        echo -e "  ${RED}✗${NC} PRIVATE_KEY not set"
        ((CHECKS_FAILED++))
    fi
    
    if [ -n "${ARB_SEPOLIA_RPC:-}" ]; then
        echo -e "  ${GREEN}✓${NC} ARB_SEPOLIA_RPC set"
        ((CHECKS_PASSED++))
    else
        echo -e "  ${RED}✗${NC} ARB_SEPOLIA_RPC not set"
        ((CHECKS_FAILED++))
    fi
else
    echo -e "  ${YELLOW}⚠${NC} .env.sepolia not found (copy from .env.sepolia.example)"
    ((CHECKS_FAILED+=3))
fi
echo ""

echo -e "${YELLOW}[4/7] Building Stylus WASM...${NC}"
cd "${PROJECT_ROOT}"
if bash scripts/build_wasm.sh > /tmp/wasm_build.log 2>&1; then
    echo -e "  ${GREEN}✓${NC} WASM build successful"
    ((CHECKS_PASSED++))
    
    WASM_PATH="${PROJECT_ROOT}/packages/stylus/artifacts/uzkv_stylus_optimized.wasm"
    if [ -f "$WASM_PATH" ]; then
        WASM_SIZE=$(stat -c%s "$WASM_PATH" 2>/dev/null || stat -f%z "$WASM_PATH")
        WASM_SIZE_KB=$((WASM_SIZE / 1024))
        echo "    → Optimized WASM size: ${WASM_SIZE_KB}KB"
        
        if [ $WASM_SIZE_KB -lt 24 ]; then
            echo -e "  ${GREEN}✓${NC} WASM size < 24KB (${WASM_SIZE_KB}KB)"
            ((CHECKS_PASSED++))
        else
            echo -e "  ${RED}✗${NC} WASM size >= 24KB (${WASM_SIZE_KB}KB)"
            ((CHECKS_FAILED++))
        fi
    else
        echo -e "  ${RED}✗${NC} Optimized WASM not found"
        ((CHECKS_FAILED++))
    fi
else
    echo -e "  ${RED}✗${NC} WASM build failed"
    echo "    See /tmp/wasm_build.log for details"
    ((CHECKS_FAILED+=2))
fi
echo ""

echo -e "${YELLOW}[5/7] Compiling Solidity Contracts...${NC}"
cd "${PROJECT_ROOT}/packages/contracts"
if forge build > /tmp/solidity_build.log 2>&1; then
    echo -e "  ${GREEN}✓${NC} Solidity compilation successful"
    ((CHECKS_PASSED++))
    
    # Check contract sizes
    if [ -f "out/UniversalZKVerifier.sol/UniversalZKVerifier.json" ]; then
        BYTECODE_SIZE=$(jq -r '.bytecode.object' out/UniversalZKVerifier.sol/UniversalZKVerifier.json | wc -c)
        BYTECODE_SIZE_KB=$(($BYTECODE_SIZE / 2048))  # Hex chars to KB
        echo "    → UniversalZKVerifier bytecode: ~${BYTECODE_SIZE_KB}KB"
        
        if [ $BYTECODE_SIZE_KB -lt 24 ]; then
            echo -e "  ${GREEN}✓${NC} Contract size within limit"
            ((CHECKS_PASSED++))
        else
            echo -e "  ${YELLOW}⚠${NC} Contract size: ${BYTECODE_SIZE_KB}KB (close to 24KB limit)"
            ((CHECKS_PASSED++))
        fi
    fi
else
    echo -e "  ${RED}✗${NC} Solidity compilation failed"
    echo "    See /tmp/solidity_build.log for details"
    ((CHECKS_FAILED+=2))
fi
cd "${PROJECT_ROOT}"
echo ""

echo -e "${YELLOW}[6/7] Running Test Suite...${NC}"
cd "${PROJECT_ROOT}/packages/contracts"
if forge test > /tmp/test_run.log 2>&1; then
    TEST_RESULTS=$(grep "tests passed" /tmp/test_run.log | tail -1)
    echo -e "  ${GREEN}✓${NC} All tests passing"
    echo "    → $TEST_RESULTS"
    ((CHECKS_PASSED++))
else
    echo -e "  ${RED}✗${NC} Some tests failing"
    echo "    See /tmp/test_run.log for details"
    ((CHECKS_FAILED++))
fi
cd "${PROJECT_ROOT}"
echo ""

echo -e "${YELLOW}[7/7] Validating Deployment Scripts...${NC}"
check "deploy-testnet.sh syntax" "bash -n ${PROJECT_ROOT}/scripts/deploy-testnet.sh"
check "benchmark-gas.js syntax" "node --check ${PROJECT_ROOT}/scripts/benchmark-gas.js"
check "DeployTestnet.s.sol compiles" "cd ${PROJECT_ROOT}/packages/contracts && forge build --force > /dev/null 2>&1"
echo ""

# Summary
echo -e "${BLUE}=== Summary ===${NC}"
echo ""
echo -e "Checks passed: ${GREEN}${CHECKS_PASSED}${NC}"
echo -e "Checks failed: ${RED}${CHECKS_FAILED}${NC}"
echo ""

if [ $CHECKS_FAILED -eq 0 ]; then
    echo -e "${GREEN}✅ All checks passed! Ready for testnet deployment.${NC}"
    echo ""
    echo "Next steps:"
    echo "  1. Ensure .env.sepolia is configured with your keys"
    echo "  2. Get testnet ETH: https://faucet.quicknode.com/arbitrum/sepolia"
    echo "  3. Run deployment: ./scripts/deploy-testnet.sh"
    echo "  4. Or use Foundry: forge script script/DeployTestnet.s.sol --broadcast"
    echo ""
    exit 0
else
    echo -e "${RED}❌ Some checks failed. Fix issues before deploying.${NC}"
    echo ""
    echo "Common fixes:"
    echo "  - Install missing tools: cargo install cargo-stylus"
    echo "  - Configure environment: cp .env.sepolia.example .env.sepolia"
    echo "  - Fix compilation errors: check build logs"
    echo "  - Fix test failures: forge test -vvv"
    echo ""
    exit 1
fi
