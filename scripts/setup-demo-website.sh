#!/bin/bash

# Setup Demo Website for Universal ZK Verifier
# This script initializes the Next.js app in apps/web

set -e

echo "╔════════════════════════════════════════════════════════════╗"
echo "║   Universal ZK Verifier - Demo Website Setup              ║"
echo "╚════════════════════════════════════════════════════════════╝"
echo ""

# Navigate to apps/web
cd "$(dirname "$0")/../apps/web"

echo "📦 Step 1: Initialize Next.js app..."
pnpm create next-app@latest . --typescript --tailwind --app --yes || {
    echo "⚠️  Directory not empty, skipping initialization..."
}

echo ""
echo "📦 Step 2: Install dependencies..."
pnpm add wagmi@2.x viem@2.x @tanstack/react-query
pnpm add zustand react-dropzone recharts
pnpm add lucide-react react-hot-toast
pnpm add -D @types/node

echo ""
echo "📦 Step 3: Install shadcn/ui components..."
pnpm dlx shadcn-ui@latest init --yes --defaults || true
pnpm dlx shadcn-ui@latest add button card tabs progress badge dialog input label select

echo ""
echo "📁 Step 4: Create directory structure..."
mkdir -p src/app/{demo,benchmarks,attestations,api/{generate,verify,attest}}
mkdir -p src/components
mkdir -p src/lib
mkdir -p public/proofs

echo ""
echo "📝 Step 5: Create environment template..."
cat > .env.local.example << EOF
# Arbitrum Sepolia
NEXT_PUBLIC_ARBITRUM_SEPOLIA_RPC=https://sepolia-rollup.arbitrum.io/rpc
NEXT_PUBLIC_ATTESTOR_ADDRESS=0x36e937ebcf56c5dec6ecb0695001becc87738177
NEXT_PUBLIC_CHAIN_ID=421614

# Optional: Private key for server-side attestation
PRIVATE_KEY=
EOF

echo ""
echo "✅ Setup complete!"
echo ""
echo "📖 Next steps:"
echo "   1. cd apps/web"
echo "   2. Copy .env.local.example to .env.local"
echo "   3. pnpm dev"
echo "   4. Open http://localhost:3000"
echo ""
echo "📚 Read: docs/WEBSITE-DEMO-PLAN.md for implementation details"
echo ""
