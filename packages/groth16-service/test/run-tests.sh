#!/bin/bash

# Test Runner Script for Groth16 Service
# Runs all tests with proper configuration

set -e

echo "🧪 Running Groth16 Service Test Suite..."
echo ""

# Navigate to service directory
cd "$(dirname "$0")/.."

# Check for dependencies
if [ ! -d "node_modules" ]; then
    echo "📦 Installing dependencies..."
    pnpm install
fi

# Check environment
if [ ! -f ".env" ]; then
    echo "⚠️  No .env file found. Using defaults..."
    echo "RPC_URL=https://sepolia-rollup.arbitrum.io/rpc" > .env
    echo "ATTESTOR_ADDRESS=0x36e937ebcf56c5dec6ecb0695001becc87738177" >> .env
fi

# Run tests based on argument
case "${1:-all}" in
  "api")
    echo "Running API tests..."
    pnpm test api.test.ts
    ;;
  "validation")
    echo "Running validation tests..."
    pnpm test validation.test.ts
    ;;
  "attestor")
    echo "Running attestor tests..."
    pnpm test attestor.test.ts
    ;;
  "benchmark")
    echo "Running benchmarks..."
    pnpm test benchmark.test.ts
    ;;
  "sdk")
    echo "Running SDK tests..."
    pnpm test sdk.test.ts
    ;;
  "coverage")
    echo "Running tests with coverage..."
    pnpm test --coverage
    ;;
  "watch")
    echo "Running tests in watch mode..."
    pnpm test:watch
    ;;
  *)
    echo "Running all tests..."
    pnpm test
    ;;
esac

echo ""
echo "✅ Tests complete!"
