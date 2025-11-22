#!/bin/bash

# UZKV Groth16 Service - Setup Script
# Installs dependencies and configures the verification service

set -e

echo "🚀 Setting up UZKV Groth16 Verification Service..."
echo ""

# Check for pnpm
if ! command -v pnpm &> /dev/null; then
    echo "❌ pnpm is not installed. Please install it first:"
    echo "   npm install -g pnpm"
    exit 1
fi

echo "✅ pnpm detected"

# Navigate to groth16-service
cd "$(dirname "$0")"

# Install groth16-service dependencies
echo ""
echo "📦 Installing groth16-service dependencies..."
cd packages/groth16-service
pnpm install

# Create .env if it doesn't exist
if [ ! -f .env ]; then
    echo ""
    echo "📝 Creating .env file..."
    cp .env.example .env
    echo "⚠️  Please edit packages/groth16-service/.env with your configuration"
fi

# Install SDK dependencies
echo ""
echo "📦 Installing SDK dependencies..."
cd ../sdk
pnpm install

echo ""
echo "✅ Setup complete!"
echo ""
echo "Next steps:"
echo "1. Edit packages/groth16-service/.env with your RPC_URL and other config"
echo "2. Run the service:"
echo "   cd packages/groth16-service"
echo "   pnpm dev"
echo ""
echo "3. Test the API:"
echo "   curl http://localhost:3001/health"
echo ""
echo "4. Use the SDK:"
echo "   import { createUZKVClient } from '@uzkv/sdk';"
echo ""
