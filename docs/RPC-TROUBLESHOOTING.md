# RPC Connection Troubleshooting Guide

## Issue
Cannot connect to Arbitrum Sepolia RPC endpoints from WSL environment.

## Symptoms
- Connection timeouts when trying to reach RPC endpoints
- "JsonRpcProvider failed to detect network" errors
- All RPC endpoints timing out

## Root Cause
This is typically caused by:
1. **WSL Network Issues**: WSL2 uses a virtual network adapter that may have connectivity issues
2. **Firewall/Antivirus**: Blocking outbound HTTPS connections
3. **Corporate Network**: Proxy or firewall restrictions
4. **DNS Issues**: Unable to resolve RPC endpoint domains

## Solutions

### Option 1: Run from Windows PowerShell (Recommended)
Instead of WSL, run the script directly from Windows:

```powershell
cd C:\Users\priya\OneDrive\Documents\uzkv
node scripts\attest-proofs.cjs
```

### Option 2: Fix WSL Network
Try these commands in WSL:

```bash
# Reset DNS
sudo rm /etc/resolv.conf
sudo bash -c 'echo "nameserver 8.8.8.8" > /etc/resolv.conf'
sudo bash -c 'echo "nameserver 8.8.4.4" >> /etc/resolv.conf'

# Test connectivity
curl -I https://sepolia-rollup.arbitrum.io/rpc
```

### Option 3: Use Alchemy/Infura (Most Reliable)
Get a free API key and update `.env.sepolia`:

**Alchemy** (https://alchemy.com):
```bash
ARB_SEPOLIA_RPC=https://arb-sepolia.g.alchemy.com/v2/YOUR_API_KEY
```

**Infura** (https://infura.io):
```bash
ARB_SEPOLIA_RPC=https://arbitrum-sepolia.infura.io/v3/YOUR_API_KEY
```

### Option 4: Use Dry-Run Mode
Test the script without actual blockchain connection:

```bash
DRY_RUN=true node scripts/attest-proofs.cjs
```

This will simulate attestations and show you what would happen.

### Option 5: Check Network Settings

1. **Check Windows Firewall**:
   - Open Windows Defender Firewall
   - Allow Node.js through firewall

2. **Check Antivirus**:
   - Temporarily disable to test
   - Add exception for Node.js

3. **Test from Different Network**:
   - Try mobile hotspot
   - Different WiFi network

## Verification

Test RPC connectivity:
```bash
node scripts/test-rpc-connection.cjs
```

Should show at least one working endpoint.

## Alternative: Deploy from GitHub Actions

If local network issues persist, you can deploy via GitHub Actions which has reliable network connectivity. See `.github/workflows/` for CI/CD deployment.
