#!/usr/bin/env bash
#
# Testnet Deployment Script for Arbitrum Sepolia
# Deploys Stylus WASM and Solidity contracts
#
# Usage: ./scripts/deploy-testnet.sh
# Prerequisites: 
#   - PRIVATE_KEY in .env.sepolia
#   - ARB_SEPOLIA_RPC in .env.sepolia
#   - Sufficient Sepolia ETH in deployer account

set -euo pipefail

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
ENV_FILE="${PROJECT_ROOT}/.env.sepolia"
DEPLOYMENT_LOG="${PROJECT_ROOT}/deployments/sepolia-deployment.json"

echo -e "${BLUE}=== UZKV Testnet Deployment ===${NC}"
echo ""

# Check prerequisites
echo -e "${YELLOW}[1/6] Checking prerequisites...${NC}"

if [ ! -f "${ENV_FILE}" ]; then
    echo -e "${RED}Error: .env.sepolia not found${NC}"
    echo "Create ${ENV_FILE} with:"
    echo "  PRIVATE_KEY=0x..."
    echo "  ARB_SEPOLIA_RPC=https://sepolia-rollup.arbitrum.io/rpc"
    echo "  ARBISCAN_API_KEY=..." 
    exit 1
fi

# Load environment
source "${ENV_FILE}"

if [ -z "${PRIVATE_KEY:-}" ]; then
    echo -e "${RED}Error: PRIVATE_KEY not set in .env.sepolia${NC}"
    exit 1
fi

if [ -z "${ARB_SEPOLIA_RPC:-}" ]; then
    echo -e "${RED}Error: ARB_SEPOLIA_RPC not set in .env.sepolia${NC}"
    exit 1
fi

echo "  ✓ Environment loaded"
echo "  ✓ RPC endpoint: ${ARB_SEPOLIA_RPC}"
echo ""

# Create deployment directory
mkdir -p "$(dirname "${DEPLOYMENT_LOG}")"

# Build Stylus WASM
echo -e "${YELLOW}[2/6] Building Stylus WASM...${NC}"
cd "${PROJECT_ROOT}"
bash scripts/build_wasm.sh

WASM_PATH="${PROJECT_ROOT}/packages/stylus/artifacts/uzkv_stylus_optimized.wasm"
if [ ! -f "${WASM_PATH}" ]; then
    echo -e "${RED}Error: Optimized WASM not found at ${WASM_PATH}${NC}"
    exit 1
fi

WASM_SIZE_KB=$(($(stat -c%s "${WASM_PATH}" 2>/dev/null || stat -f%z "${WASM_PATH}") / 1024))
echo "  ✓ WASM built: ${WASM_SIZE_KB}KB"
echo ""

# Check cargo stylus CLI
echo -e "${YELLOW}[3/6] Checking cargo-stylus CLI...${NC}"
if ! command -v cargo-stylus &> /dev/null; then
    echo -e "${RED}Error: cargo-stylus not found${NC}"
    echo "Install: cargo install --force cargo-stylus"
    exit 1
fi
echo "  ✓ cargo-stylus: $(cargo-stylus --version)"
echo ""

# Deploy Stylus WASM
echo -e "${YELLOW}[4/6] Deploying Stylus WASM to Arbitrum Sepolia...${NC}"
cd "${PROJECT_ROOT}/packages/stylus"

DEPLOY_OUTPUT=$(cargo stylus deploy \
    --private-key="${PRIVATE_KEY}" \
    --endpoint="${ARB_SEPOLIA_RPC}" \
    2>&1 || echo "DEPLOY_FAILED")

if [[ "${DEPLOY_OUTPUT}" == *"DEPLOY_FAILED"* ]] || [[ "${DEPLOY_OUTPUT}" == *"error"* ]]; then
    echo -e "${RED}Error: Stylus deployment failed${NC}"
    echo "${DEPLOY_OUTPUT}"
    exit 1
fi

# Extract deployed address
STYLUS_ADDRESS=$(echo "${DEPLOY_OUTPUT}" | grep -oP '0x[a-fA-F0-9]{40}' | head -1)

if [ -z "${STYLUS_ADDRESS}" ]; then
    echo -e "${RED}Error: Could not extract Stylus address from deployment output${NC}"
    echo "${DEPLOY_OUTPUT}"
    exit 1
fi

echo "  ✓ Stylus contract deployed: ${STYLUS_ADDRESS}"
echo ""

# Deploy Solidity contracts
echo -e "${YELLOW}[5/6] Deploying Solidity contracts...${NC}"
cd "${PROJECT_ROOT}/packages/contracts"

# Get deployer address
DEPLOYER_ADDRESS=$(cast wallet address --private-key "${PRIVATE_KEY}")
echo "  Deployer: ${DEPLOYER_ADDRESS}"

# Deploy UniversalZKVerifier
VERIFIER_ADDRESS=$(forge create \
    --rpc-url "${ARB_SEPOLIA_RPC}" \
    --private-key "${PRIVATE_KEY}" \
    --legacy \
    src/UniversalZKVerifier.sol:UniversalZKVerifier \
    --json | jq -r '.deployedTo')

echo "  ✓ UniversalZKVerifier deployed: ${VERIFIER_ADDRESS}"

# Configure Stylus integration
echo "  Configuring Stylus integration..."
cast send "${VERIFIER_ADDRESS}" \
    "setStylusVerifier(address)" \
    "${STYLUS_ADDRESS}" \
    --rpc-url "${ARB_SEPOLIA_RPC}" \
    --private-key "${PRIVATE_KEY}" \
    --legacy

echo "  ✓ Stylus verifier configured"
echo ""

# Save deployment info
echo -e "${YELLOW}[6/6] Saving deployment info...${NC}"
cat > "${DEPLOYMENT_LOG}" << EOF
{
  "network": "arbitrum-sepolia",
  "deployedAt": "$(date -u +"%Y-%m-%dT%H:%M:%SZ")",
  "deployer": "${DEPLOYER_ADDRESS}",
  "contracts": {
    "stylusVerifier": "${STYLUS_ADDRESS}",
    "universalZKVerifier": "${VERIFIER_ADDRESS}"
  },
  "rpcEndpoint": "${ARB_SEPOLIA_RPC}",
  "wasmSize": "${WASM_SIZE_KB}KB",
  "explorer": {
    "stylusVerifier": "https://sepolia.arbiscan.io/address/${STYLUS_ADDRESS}",
    "universalZKVerifier": "https://sepolia.arbiscan.io/address/${VERIFIER_ADDRESS}"
  }
}
EOF

echo "  ✓ Deployment info saved: ${DEPLOYMENT_LOG}"
echo ""

# Display summary
echo -e "${GREEN}=== Deployment Complete! ===${NC}"
echo ""
echo "Network:              Arbitrum Sepolia"
echo "Deployer:             ${DEPLOYER_ADDRESS}"
echo "Stylus Verifier:      ${STYLUS_ADDRESS}"
echo "UniversalZKVerifier:  ${VERIFIER_ADDRESS}"
echo ""
echo "View on Arbiscan:"
echo "  Stylus:    https://sepolia.arbiscan.io/address/${STYLUS_ADDRESS}"
echo "  Solidity:  https://sepolia.arbiscan.io/address/${VERIFIER_ADDRESS}"
echo ""
echo "Next steps:"
echo "  1. Run gas benchmarking: node scripts/benchmark-gas.js"
echo "  2. Verify contracts on Arbiscan"
echo "  3. Run integration tests against testnet"
echo ""
