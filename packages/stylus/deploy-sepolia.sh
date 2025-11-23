#!/bin/bash
# Deploy UZKV Stylus Contract to Arbitrum Sepolia
# 
# This script deploys the Universal ZK Verifier to Arbitrum Sepolia testnet
# Make sure you have:
# 1. cargo-stylus installed: cargo install cargo-stylus
# 2. Private key set in environment or .env file
# 3. Some Sepolia ETH for gas

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${BLUE}=== UZKV Stylus Deployment to Arbitrum Sepolia ===${NC}\n"

# Check if WASM is built
WASM_FILE="target/wasm32-unknown-unknown/release/uzkv_stylus.wasm"
if [ ! -f "$WASM_FILE" ]; then
    echo -e "${YELLOW}WASM not found. Building...${NC}"
    cargo build --target wasm32-unknown-unknown --release
fi

# Check WASM size
WASM_SIZE=$(stat -f%z "$WASM_FILE" 2>/dev/null || stat -c%s "$WASM_FILE")
WASM_SIZE_KB=$((WASM_SIZE / 1024))
echo -e "${GREEN}✓ WASM built: ${WASM_SIZE_KB}KB${NC}"

if [ $WASM_SIZE_KB -gt 128 ]; then
    echo -e "${RED}⚠️  Warning: WASM size (${WASM_SIZE_KB}KB) exceeds 128KB limit!${NC}"
    echo -e "${YELLOW}This may require compression or splitting.${NC}"
fi

# Arbitrum Sepolia RPC
RPC_URL="https://sepolia-rollup.arbitrum.io/rpc"

# Check for private key
if [ -z "$PRIVATE_KEY" ]; then
    echo -e "${YELLOW}Enter your private key (without 0x prefix):${NC}"
    read -s PRIVATE_KEY_INPUT
    export PRIVATE_KEY="0x$PRIVATE_KEY_INPUT"
    echo ""
fi

# Validate private key format
if [[ ! $PRIVATE_KEY =~ ^0x[0-9a-fA-F]{64}$ ]]; then
    echo -e "${RED}Invalid private key format. Must be 64 hex characters (with 0x prefix).${NC}"
    exit 1
fi

# Get wallet address
echo -e "${BLUE}Deriving wallet address from private key...${NC}"
WALLET_ADDRESS=$(cast wallet address --private-key "$PRIVATE_KEY" 2>/dev/null || echo "")

if [ -z "$WALLET_ADDRESS" ]; then
    echo -e "${RED}Failed to derive wallet address. Is 'cast' installed?${NC}"
    echo "Install Foundry: curl -L https://foundry.paradigm.xyz | bash && foundryup"
    exit 1
fi

echo -e "${GREEN}✓ Deploying from: $WALLET_ADDRESS${NC}"

# Check balance
echo -e "${BLUE}Checking ETH balance...${NC}"
BALANCE=$(cast balance "$WALLET_ADDRESS" --rpc-url "$RPC_URL" 2>/dev/null || echo "0")
BALANCE_ETH=$(echo "scale=6; $BALANCE / 1000000000000000000" | bc)

if [ "$BALANCE" = "0" ]; then
    echo -e "${RED}⚠️  No ETH balance!${NC}"
    echo -e "${YELLOW}Get testnet ETH from:${NC}"
    echo "  https://faucet.quicknode.com/arbitrum/sepolia"
    echo "  https://www.alchemy.com/faucets/arbitrum-sepolia"
    exit 1
fi

echo -e "${GREEN}✓ Balance: $BALANCE_ETH ETH${NC}\n"

# Step 1: Check contract validity
echo -e "${BLUE}Step 1: Checking contract validity...${NC}"
cargo stylus check \
    --wasm-file "$WASM_FILE" \
    --endpoint "$RPC_URL" 2>&1 | tee check-output.log

if [ ${PIPESTATUS[0]} -ne 0 ]; then
    echo -e "${RED}Contract validation failed. Check check-output.log${NC}"
    exit 1
fi

echo -e "${GREEN}✓ Contract is valid${NC}\n"

# Step 2: Estimate deployment gas
echo -e "${BLUE}Step 2: Estimating deployment cost...${NC}"
cargo stylus deploy \
    --wasm-file "$WASM_FILE" \
    --endpoint "$RPC_URL" \
    --private-key "$PRIVATE_KEY" \
    --estimate-gas 2>&1 | tee estimate-output.log

if [ ${PIPESTATUS[0]} -ne 0 ]; then
    echo -e "${YELLOW}Gas estimation failed, but continuing...${NC}\n"
fi

# Step 3: Deploy
echo -e "${BLUE}Step 3: Deploying contract...${NC}"
echo -e "${YELLOW}This will use real gas. Press Ctrl+C to cancel or Enter to continue...${NC}"
read -r

cargo stylus deploy \
    --wasm-file "$WASM_FILE" \
    --endpoint "$RPC_URL" \
    --private-key "$PRIVATE_KEY" 2>&1 | tee deploy-output.log

if [ ${PIPESTATUS[0]} -ne 0 ]; then
    echo -e "${RED}Deployment failed. Check deploy-output.log${NC}"
    exit 1
fi

# Extract contract address from output
CONTRACT_ADDRESS=$(grep -oP 'deployed code at address \K0x[a-fA-F0-9]{40}' deploy-output.log | head -1)

if [ -z "$CONTRACT_ADDRESS" ]; then
    echo -e "${YELLOW}Could not extract contract address from output.${NC}"
    echo -e "${YELLOW}Check deploy-output.log for details.${NC}"
    exit 1
fi

echo -e "\n${GREEN}=== Deployment Successful! ===${NC}"
echo -e "${GREEN}Contract Address: $CONTRACT_ADDRESS${NC}"
echo -e "${BLUE}Arbitrum Sepolia Explorer:${NC}"
echo -e "  https://sepolia.arbiscan.io/address/$CONTRACT_ADDRESS"

# Save deployment info
DEPLOYMENT_FILE="deployment-info.json"
cat > "$DEPLOYMENT_FILE" <<EOF
{
  "network": "arbitrum-sepolia",
  "contractAddress": "$CONTRACT_ADDRESS",
  "deployer": "$WALLET_ADDRESS",
  "timestamp": "$(date -u +%Y-%m-%dT%H:%M:%SZ)",
  "wasmSize": "${WASM_SIZE_KB}KB",
  "rpcUrl": "$RPC_URL",
  "explorerUrl": "https://sepolia.arbiscan.io/address/$CONTRACT_ADDRESS"
}
EOF

echo -e "\n${GREEN}✓ Deployment info saved to: $DEPLOYMENT_FILE${NC}"

# Step 4: Verify deployment
echo -e "\n${BLUE}Step 4: Verifying deployment...${NC}"

# Try to call a view function (if any exist)
echo -e "${BLUE}Testing contract is callable...${NC}"
# Add your verification calls here based on your contract's ABI

echo -e "\n${GREEN}=== Next Steps ===${NC}"
echo -e "1. ${BLUE}Register verification keys:${NC}"
echo -e "   Call register_vk_universal() for each proof system"
echo -e ""
echo -e "2. ${BLUE}Submit a test proof:${NC}"
echo -e "   Call verify_universal() with a test UniversalProof"
echo -e ""
echo -e "3. ${BLUE}Monitor events:${NC}"
echo -e "   cast logs --address $CONTRACT_ADDRESS --rpc-url $RPC_URL"
echo -e ""
echo -e "4. ${BLUE}Update your frontend/SDK:${NC}"
echo -e "   export const UZKV_CONTRACT = \"$CONTRACT_ADDRESS\";"
echo -e ""

echo -e "${GREEN}Deployment complete! 🎉${NC}\n"
