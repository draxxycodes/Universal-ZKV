#!/usr/bin/env bash
#
# Direct Stylus Contract Deployment Script
# Deploys the Universal ZK Verifier (Rust/Stylus) directly to Arbitrum Sepolia
#
# Usage: ./scripts/deploy-stylus.sh
# Prerequisites:
#   - PRIVATE_KEY in .env
#   - ARB_SEPOLIA_RPC in .env

set -euo pipefail

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
ENV_FILE="${PROJECT_ROOT}/.env"
DEPLOYMENT_LOG="${PROJECT_ROOT}/deployments/stylus-deployment.json"

echo -e "${GREEN}=== Universal ZK Verifier (Stylus) Deployment ===${NC}"

# 1. Load Environment
if [ -f "${ENV_FILE}" ]; then
    source "${ENV_FILE}"
else
    echo -e "${YELLOW}Warning: .env file not found at ${ENV_FILE}${NC}"
fi

if [ -z "${PRIVATE_KEY:-}" ]; then
    echo -e "${RED}Error: PRIVATE_KEY is not set${NC}"
    echo "Please set PRIVATE_KEY in .env or environment"
    exit 1
fi

if [ -z "${ARB_SEPOLIA_RPC:-}" ]; then
    # Fallback to public RPC if not set
    ARB_SEPOLIA_RPC="https://sepolia-rollup.arbitrum.io/rpc"
    echo -e "${YELLOW}Warning: ARB_SEPOLIA_RPC not set, using public endpoint: ${ARB_SEPOLIA_RPC}${NC}"
fi

# 2. Build WASM
echo -e "\n${YELLOW}[1/3] Building Stylus WASM...${NC}"
cd "${PROJECT_ROOT}/packages/stylus"

# Ensure target exists
rustup target add wasm32-unknown-unknown

# Build release
cargo build --release --target wasm32-unknown-unknown

# Optimize (optional but recommended)
# We assume cargo-stylus handles optimization during deployment mostly,
# but let's try to verify the size.
WASM_PATH="${PROJECT_ROOT}/packages/stylus/target/wasm32-unknown-unknown/release/uzkv_stylus.wasm"
if [ ! -f "${WASM_PATH}" ]; then
    echo -e "${RED}Error: WASM build failed${NC}"
    exit 1
fi

# 3. Deploy
echo -e "\n${YELLOW}[2/3] Deploying to Arbitrum Sepolia...${NC}"

# Run deployment and capture output
DEPLOY_OUTPUT=$(cargo stylus deploy \
    --private-key "${PRIVATE_KEY}" \
    --endpoint "${ARB_SEPOLIA_RPC}" \
    --no-verify 2>&1) # no-verify skips source verification for now to speed up

echo "${DEPLOY_OUTPUT}"

# Extract address (naive regex, looking for 0x...)
# Output usually contains: "deployed at address: 0x..."
CONTRACT_ADDRESS=$(echo "${DEPLOY_OUTPUT}" | grep -oP 'deployed at address: \K0x[a-fA-F0-9]{40}')

if [ -z "${CONTRACT_ADDRESS}" ]; then
    # Start looking for alternative output format
    CONTRACT_ADDRESS=$(echo "${DEPLOY_OUTPUT}" | grep -oP 'Contract address: \K0x[a-fA-F0-9]{40}')
fi

if [ -z "${CONTRACT_ADDRESS}" ]; then
    echo -e "\n${RED}Deployment failed or address could not be parsed.${NC}"
    exit 1
fi

echo -e "\n${GREEN}Success! Deployed at: ${CONTRACT_ADDRESS}${NC}"

# 4. Save Deployment Info
echo -e "\n${YELLOW}[3/3] Saving deployment info...${NC}"
mkdir -p "$(dirname "${DEPLOYMENT_LOG}")"

cat > "${DEPLOYMENT_LOG}" << EOF
{
  "network": "arbitrum-sepolia",
  "deployedAt": "$(date -u +"%Y-%m-%dT%H:%M:%SZ")",
  "contractAddress": "${CONTRACT_ADDRESS}",
  "rpcUrl": "${ARB_SEPOLIA_RPC}"
}
EOF

echo "Saved to ${DEPLOYMENT_LOG}"
echo -e "\n${GREEN}Deployment Workflow Complete!${NC}"
