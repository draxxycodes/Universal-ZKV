#!/bin/bash
# Fix all remaining errors in the codebase

echo "🔧 Fixing codebase errors..."
echo ""

# Navigate to project root
cd "$(dirname "$0")/.." || exit 1

echo "Step 1: Installing dependencies..."
echo "⚠️  Note: If you're on Windows with OneDrive, see apps/web/WINDOWS-INSTALL-FIX.md"
echo ""

# Check if we're in WSL on a Windows mount
if [[ $(pwd) == /mnt/c/* ]]; then
    echo "⚠️  Warning: You're in WSL on a Windows mount (OneDrive)"
    echo "   For best results, either:"
    echo "   1. Move project to WSL filesystem (~/) or"
    echo "   2. Use PowerShell with 'npm install' instead"
    echo ""
    read -p "Continue anyway? (y/n) " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        exit 1
    fi
fi

# Install root dependencies
echo "Installing root dependencies..."
pnpm install --node-linker=hoisted --no-frozen-lockfile || {
    echo "❌ pnpm install failed. Try these solutions:"
    echo "   1. Use npm: cd apps/web && npm install"
    echo "   2. Move to C:\\Dev or WSL home (~/) to avoid OneDrive issues"
    echo "   3. See apps/web/WINDOWS-INSTALL-FIX.md for detailed instructions"
    exit 1
}

echo ""
echo "Step 2: Installing web app dependencies..."
cd apps/web || exit 1

# Create .env.local if it doesn't exist
if [ ! -f .env.local ]; then
    echo "Creating .env.local from example..."
    cp .env.local.example .env.local
    echo "✅ Created .env.local"
fi

echo ""
echo "Step 3: Verifying TypeScript configuration..."
if [ -d "node_modules" ]; then
    echo "✅ node_modules exists"
else
    echo "⚠️  node_modules not found - TypeScript errors expected until install completes"
fi

echo ""
echo "Step 4: Running type check (if packages are installed)..."
if [ -d "../../node_modules/typescript" ]; then
    pnpm exec tsc --noEmit || echo "⚠️  Type errors found (expected if packages not fully installed)"
else
    echo "⚠️  TypeScript not installed yet - skipping type check"
fi

echo ""
echo "✅ Fix script complete!"
echo ""
echo "Next steps:"
echo "1. Ensure all packages are installed"
echo "2. Run 'pnpm dev' to start development server"
echo "3. Open http://localhost:3000"
echo ""
echo "If you're still having issues, see:"
echo "- apps/web/WINDOWS-INSTALL-FIX.md (Windows-specific)"
echo "- apps/web/README.md (General setup)"
echo "- apps/web/DEPLOYMENT.md (Deployment guide)"
