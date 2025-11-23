# Fix Installation Issues - Run this in PowerShell as Administrator
# Location: apps/web/install-fix.ps1

Write-Host "🔧 Universal ZKV - Installation Fix Script" -ForegroundColor Cyan
Write-Host ""

$webDir = "C:\Users\priya\OneDrive\Documents\uzkv\apps\web"

# Check if we're in the right directory
if (-not (Test-Path $webDir)) {
    Write-Host "❌ Error: Web directory not found at $webDir" -ForegroundColor Red
    exit 1
}

Set-Location $webDir
Write-Host "📁 Working in: $webDir" -ForegroundColor Green
Write-Host ""

# Step 1: Clean up any corrupted node_modules
Write-Host "🧹 Step 1: Cleaning old installations..." -ForegroundColor Yellow
if (Test-Path "node_modules") {
    Write-Host "   Removing node_modules (this may take a moment)..."
    Remove-Item -Path "node_modules" -Recurse -Force -ErrorAction SilentlyContinue
    Start-Sleep -Seconds 2
}
if (Test-Path "package-lock.json") {
    Remove-Item -Path "package-lock.json" -Force
}
Write-Host "   ✅ Cleanup complete" -ForegroundColor Green
Write-Host ""

# Step 2: Install dependencies
Write-Host "📦 Step 2: Installing packages..." -ForegroundColor Yellow
Write-Host "   This will take 2-3 minutes. Please wait..." -ForegroundColor Gray
Write-Host ""

try {
    # Use npm with legacy peer deps to avoid conflicts
    npm install --legacy-peer-deps --loglevel=error
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host ""
        Write-Host "   ✅ Packages installed successfully!" -ForegroundColor Green
    } else {
        throw "npm install failed with exit code $LASTEXITCODE"
    }
} catch {
    Write-Host ""
    Write-Host "   ❌ Installation failed: $_" -ForegroundColor Red
    Write-Host ""
    Write-Host "🔍 Troubleshooting:" -ForegroundColor Yellow
    Write-Host "   1. Close VS Code and any terminals" -ForegroundColor Gray
    Write-Host "   2. Pause OneDrive sync temporarily" -ForegroundColor Gray
    Write-Host "   3. Run this script again as Administrator" -ForegroundColor Gray
    Write-Host ""
    Write-Host "💡 Or move project to C:\Dev to avoid OneDrive:" -ForegroundColor Yellow
    Write-Host "   cd C:\" -ForegroundColor Gray
    Write-Host "   mkdir Dev" -ForegroundColor Gray
    Write-Host "   cd Dev" -ForegroundColor Gray
    Write-Host "   git clone https://github.com/draxxycodes/Universal-ZKV.git" -ForegroundColor Gray
    exit 1
}

# Step 3: Verify installation
Write-Host ""
Write-Host "🔍 Step 3: Verifying installation..." -ForegroundColor Yellow

$requiredPackages = @("next", "react", "wagmi", "viem", "lucide-react", "recharts")
$allInstalled = $true

foreach ($pkg in $requiredPackages) {
    if (Test-Path "node_modules\$pkg") {
        Write-Host "   ✅ $pkg" -ForegroundColor Green
    } else {
        Write-Host "   ❌ $pkg (missing)" -ForegroundColor Red
        $allInstalled = $false
    }
}

Write-Host ""

if ($allInstalled) {
    Write-Host "✅ All packages installed successfully!" -ForegroundColor Green
    Write-Host ""
    Write-Host "🚀 Next steps:" -ForegroundColor Cyan
    Write-Host "   1. Create .env.local:" -ForegroundColor Gray
    Write-Host "      Copy-Item .env.local.example .env.local" -ForegroundColor White
    Write-Host ""
    Write-Host "   2. Start development server:" -ForegroundColor Gray
    Write-Host "      npm run dev" -ForegroundColor White
    Write-Host ""
    Write-Host "   3. Open in browser:" -ForegroundColor Gray
    Write-Host "      http://localhost:3000" -ForegroundColor White
    Write-Host ""
} else {
    Write-Host "⚠️  Some packages are missing. Try running the script again." -ForegroundColor Yellow
    exit 1
}

Write-Host "📚 Documentation:" -ForegroundColor Cyan
Write-Host "   - README.md - Project overview" -ForegroundColor Gray
Write-Host "   - DEPLOYMENT.md - Deployment guide" -ForegroundColor Gray
Write-Host "   - WINDOWS-INSTALL-FIX.md - Detailed troubleshooting" -ForegroundColor Gray
Write-Host ""
Write-Host "✨ Setup complete!" -ForegroundColor Green
