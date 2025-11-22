# UZKV Groth16 Service - Setup Script (Windows)
# Installs dependencies and configures the verification service

Write-Host "🚀 Setting up UZKV Groth16 Verification Service..." -ForegroundColor Cyan
Write-Host ""

# Check for pnpm
if (-not (Get-Command pnpm -ErrorAction SilentlyContinue)) {
    Write-Host "❌ pnpm is not installed. Please install it first:" -ForegroundColor Red
    Write-Host "   npm install -g pnpm" -ForegroundColor Yellow
    exit 1
}

Write-Host "✅ pnpm detected" -ForegroundColor Green

# Get script directory
$scriptPath = Split-Path -Parent $MyInvocation.MyCommand.Path
$rootPath = Split-Path -Parent $scriptPath

# Install groth16-service dependencies
Write-Host ""
Write-Host "📦 Installing groth16-service dependencies..." -ForegroundColor Cyan
Set-Location "$rootPath\packages\groth16-service"
pnpm install

# Create .env if it doesn't exist
if (-not (Test-Path .env)) {
    Write-Host ""
    Write-Host "📝 Creating .env file..." -ForegroundColor Cyan
    Copy-Item .env.example .env
    Write-Host "⚠️  Please edit packages/groth16-service/.env with your configuration" -ForegroundColor Yellow
}

# Install SDK dependencies
Write-Host ""
Write-Host "📦 Installing SDK dependencies..." -ForegroundColor Cyan
Set-Location "$rootPath\packages\sdk"
pnpm install

Write-Host ""
Write-Host "✅ Setup complete!" -ForegroundColor Green
Write-Host ""
Write-Host "Next steps:" -ForegroundColor Cyan
Write-Host "1. Edit packages/groth16-service/.env with your RPC_URL and other config"
Write-Host "2. Run the service:"
Write-Host "   cd packages\groth16-service"
Write-Host "   pnpm dev"
Write-Host ""
Write-Host "3. Test the API:"
Write-Host "   curl http://localhost:3001/health"
Write-Host ""
Write-Host "4. Use the SDK:"
Write-Host "   import { createUZKVClient } from '@uzkv/sdk';"
Write-Host ""
