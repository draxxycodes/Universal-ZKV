#!/bin/bash

echo "🔍 Validating development environment..."
echo ""

# Check Node.js
if command -v node &> /dev/null; then
    echo "✅ Node.js: $(node --version)"
else
    echo "❌ Node.js not found"
    exit 1
fi

# Check pnpm
if command -v pnpm &> /dev/null; then
    echo "✅ pnpm: $(pnpm --version)"
else
    echo "❌ pnpm not found"
    exit 1
fi

# Check Rust
if command -v rustc &> /dev/null; then
    echo "✅ Rust: $(rustc --version)"
else
    echo "❌ Rust not found"
    exit 1
fi

# Check Cargo
if command -v cargo &> /dev/null; then
    echo "✅ Cargo: $(cargo --version)"
else
    echo "❌ Cargo not found"
    exit 1
fi

# Check Foundry
if command -v forge &> /dev/null; then
    echo "✅ Foundry: $(forge --version | head -n1)"
else
    echo "❌ Foundry not found"
    exit 1
fi

# Check cargo-stylus
if command -v cargo-stylus &> /dev/null; then
    echo "✅ cargo-stylus: $(cargo stylus --version)"
else
    echo "❌ cargo-stylus not found"
    exit 1
fi

# Check wasm-opt
if command -v wasm-opt &> /dev/null; then
    echo "✅ wasm-opt: $(wasm-opt --version)"
else
    echo "❌ wasm-opt not found"
    exit 1
fi

# Check Git
if command -v git &> /dev/null; then
    echo "✅ Git: $(git --version)"
else
    echo "❌ Git not found"
    exit 1
fi

echo ""
echo "🎉 All required tools are installed!"
echo "✨ Ready to start development"
