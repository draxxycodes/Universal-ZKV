#!/bin/bash
set -e

# Load environment
source ~/.cargo/env

# Build WASM (already done, but ensures fresh build)
echo "Building WASM..."
cargo build --target wasm32-unknown-unknown --release

# Deploy to Arbitrum One
echo "Deploying to Arbitrum One..."
PRIVATE_KEY="0x89999d59fc9cd25a556132c1f4c739bd7d2648f9c348ff32f533e4916303e732"
RPC_URL="https://arb1.arbitrum.io/rpc"

# Use cargo-stylus with pre-built WASM
cargo stylus deploy \
  --wasm-file target/wasm32-unknown-unknown/release/uzkv_stylus.wasm \
  --private-key "$PRIVATE_KEY" \
  --endpoint "$RPC_URL" \
  --no-verify

echo "Deployment complete!"
