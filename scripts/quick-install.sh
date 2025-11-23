#!/bin/bash
# Quick Fix - Install packages for the entire monorepo
# Run this from project root

set -e

echo "🔧 Universal ZKV - Quick Package Install"
echo ""

# Ensure we're in project root
if [ ! -f "pnpm-workspace.yaml" ]; then
    echo "❌ Error: Must run from project root"
    exit 1
fi

echo "📁 Installing monorepo packages..."
echo ""

# Method 1: Try pnpm with node-linker hoisted (best for Windows)
echo "Attempting: pnpm install --node-linker=hoisted"
if pnpm install --node-linker=hoisted --no-frozen-lockfile; then
    echo ""
    echo "✅ Installation successful with pnpm!"
    echo ""
    echo "🔍 Verifying critical packages..."
    
    # Check if critical packages exist
    for pkg in next react wagmi viem lucide-react recharts; do
        if [ -d "node_modules/$pkg" ]; then
            echo "   ✅ $pkg"
        else
            echo "   ❌ $pkg (missing)"
        fi
    done
    
    echo ""
    echo "🚀 Next steps:"
    echo "   cd apps/web"
    echo "   cp .env.local.example .env.local"
    echo "   pnpm dev"
    echo ""
    exit 0
fi

# If pnpm fails, suggest alternatives
echo ""
echo "⚠️  pnpm install failed. Try these alternatives:"
echo ""
echo "Option 1: Use PowerShell (recommended for Windows):"
echo "  1. Open PowerShell as Administrator"
echo "  2. cd apps/web"
echo "  3. ./install-fix.ps1"
echo ""
echo "Option 2: Move project out of OneDrive:"
echo "  cd ~"
echo "  git clone https://github.com/draxxycodes/Universal-ZKV.git"
echo "  cd Universal-ZKV"
echo "  pnpm install"
echo ""

exit 1
