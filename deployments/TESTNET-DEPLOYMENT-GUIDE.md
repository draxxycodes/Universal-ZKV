# Phase S5: Testnet Deployment Guide

**Network:** Arbitrum Sepolia  
**Status:** Ready for Deployment  
**Prerequisites:** ✅ All Phase S0-S4 complete  

---

## 🎯 Deployment Overview

This guide walks through deploying the complete UZKV stack to Arbitrum Sepolia testnet:

1. **Stylus WASM Deployment** - Deploy optimized WASM verifier
2. **Solidity Contract Deployment** - Deploy UniversalZKVerifier with proxy
3. **Contract Verification** - Verify all contracts on Arbiscan
4. **Live Validation** - Run gas benchmarking on testnet

---

## 📋 Prerequisites

### Required Tools

- ✅ Rust toolchain (1.75+)
- ✅ cargo-stylus CLI
- ✅ Foundry (forge, cast)
- ✅ Node.js (20+) with pnpm
- ✅ Git

### Required Accounts & Keys

1. **Deployer Wallet**
   - Private key with testnet ETH
   - Get Sepolia ETH from faucet: https://faucet.quicknode.com/arbitrum/sepolia

2. **RPC Endpoint**
   - Arbitrum Sepolia RPC: `https://sepolia-rollup.arbitrum.io/rpc`
   - Alternative: Alchemy, Infura, QuickNode

3. **API Keys** (optional)
   - Arbiscan API key for contract verification

### Environment Setup

```bash
# Copy environment template
cp .env.sepolia.example .env.sepolia

# Edit .env.sepolia with your credentials
# Required:
#   - PRIVATE_KEY=0x... (deployer private key)
#   - ARB_SEPOLIA_RPC=https://sepolia-rollup.arbitrum.io/rpc
# Optional:
#   - ARBISCAN_API_KEY=... (for verification)
```

---

## 🚀 Deployment Steps

### Step 1: Pre-Deployment Checks

```bash
# Verify you're in project root
cd /path/to/uzkv

# Check Rust toolchain
rustc --version  # Should be 1.75+
cargo --version

# Check cargo-stylus
cargo stylus --version

# Check Foundry
forge --version
cast --version

# Verify environment loaded
source .env.sepolia
echo $PRIVATE_KEY  # Should show 0x...
echo $ARB_SEPOLIA_RPC  # Should show RPC URL

# Get deployer address
DEPLOYER=$(cast wallet address --private-key $PRIVATE_KEY)
echo "Deployer: $DEPLOYER"

# Check balance (need ~0.1 ETH for deployment)
cast balance $DEPLOYER --rpc-url $ARB_SEPOLIA_RPC
```

### Step 2: Build Stylus WASM

```bash
# Build optimized WASM binary
./scripts/build_wasm.sh

# Expected output:
# ✓ Unoptimized WASM: ~XX KB
# ✓ Optimized WASM: ~YY KB (< 24KB target)
# ✓ Artifacts: packages/stylus/artifacts/uzkv_stylus_optimized.wasm

# Verify WASM size
ls -lh packages/stylus/artifacts/uzkv_stylus_optimized.wasm
```

### Step 3: Deploy Stylus WASM

```bash
cd packages/stylus

# Deploy to Arbitrum Sepolia
cargo stylus deploy \
  --private-key=$PRIVATE_KEY \
  --endpoint=$ARB_SEPOLIA_RPC \
  --no-verify

# Expected output:
# ✅ Deployed to: 0x... (Stylus contract address)
# ✅ Transaction: 0x...

# Save the Stylus address
export STYLUS_ADDRESS="0x..."  # Replace with actual address
echo "STYLUS_ADDRESS=$STYLUS_ADDRESS" >> ../../.env.sepolia

# Verify deployment
cast code $STYLUS_ADDRESS --rpc-url $ARB_SEPOLIA_RPC
# Should show non-zero bytecode

cd ../..
```

### Step 4: Deploy Solidity Contracts

**Option A: Using Foundry Script (Recommended)**

```bash
cd packages/contracts

# Set Stylus address in environment
export STYLUS_VERIFIER_ADDRESS=$STYLUS_ADDRESS

# Deploy via Foundry script
forge script script/DeployTestnet.s.sol:DeployTestnet \
  --rpc-url $ARB_SEPOLIA_RPC \
  --private-key $PRIVATE_KEY \
  --broadcast \
  --verify \
  --etherscan-api-key $ARBISCAN_API_KEY

# Expected output:
# [1/1] Deploying UniversalZKVerifier...
# ✓ UniversalZKVerifier: 0x...
# ✓ Stylus configured: 0x...
# ✓ Deployment info saved: deployments/sepolia-foundry-deployment.json

# Save addresses
export VERIFIER_ADDRESS=$(jq -r '.universalZKVerifier' deployments/sepolia-foundry-deployment.json)
echo "VERIFIER_ADDRESS=$VERIFIER_ADDRESS" >> ../../.env.sepolia

cd ../..
```

**Option B: Using Bash Script**

```bash
# Run automated deployment script
./scripts/deploy-testnet.sh

# Expected output:
# [1/6] Checking prerequisites...
# [2/6] Building Stylus WASM...
# [3/6] Checking cargo-stylus CLI...
# [4/6] Deploying Stylus WASM...
# [5/6] Deploying Solidity contracts...
# [6/6] Saving deployment info...
# ✅ Deployment complete!

# Deployment info saved to: deployments/sepolia-deployment.json
```

### Step 5: Verify Contracts on Arbiscan

**Manual Verification (if auto-verify failed):**

```bash
cd packages/contracts

# Verify UniversalZKVerifier
forge verify-contract \
  $VERIFIER_ADDRESS \
  src/UniversalZKVerifier.sol:UniversalZKVerifier \
  --chain-id 421614 \
  --etherscan-api-key $ARBISCAN_API_KEY \
  --watch

# Expected output:
# ✅ Contract verified successfully
# 📄 View on Arbiscan: https://sepolia.arbiscan.io/address/0x...#code

cd ../..
```

**Verify Stylus Contract:**

Stylus contracts are verified automatically during deployment. To check:

```bash
# View Stylus contract on Arbiscan
open "https://sepolia.arbiscan.io/address/$STYLUS_ADDRESS"

# Should show WASM bytecode and deployment info
```

### Step 6: Configure Integration

```bash
# If Stylus wasn't set during deployment, configure it now
cast send $VERIFIER_ADDRESS \
  "setStylusVerifier(address)" \
  $STYLUS_ADDRESS \
  --rpc-url $ARB_SEPOLIA_RPC \
  --private-key $PRIVATE_KEY

# Verify Stylus is configured
cast call $VERIFIER_ADDRESS \
  "stylusVerifier()(address)" \
  --rpc-url $ARB_SEPOLIA_RPC

# Should return: $STYLUS_ADDRESS
```

### Step 7: Run Live Gas Benchmarking

```bash
# Execute live testnet benchmarking
node scripts/benchmark-gas.js

# Expected output:
# 🚀 Starting Gas Benchmarking...
# 📋 Configuration:
#   Network: arbitrum-sepolia
#   Stylus Verifier: 0x...
#   Universal Verifier: 0x...
# 
# 📊 Benchmark 1: Single Proof Verification
# ──────────────────────────────────────────────
#   GROTH16: XX,XXX gas
#   PLONK: XX,XXX gas
#   STARK: XX,XXX gas
# 
# 📊 Benchmark 2: Batch Verification
# ──────────────────────────────────────────────
#   Batch 10: XXX,XXX gas (XX,XXX per proof)
#   Batch 50: X,XXX,XXX gas (XX,XXX per proof)
# 
# ✅ Benchmarking complete!
# 📄 Report saved: benchmarks/gas-report.md
```

---

## ✅ Verification Checklist

### Deployment Verification

- [ ] Stylus WASM deployed successfully
- [ ] Stylus contract visible on Arbiscan
- [ ] UniversalZKVerifier deployed successfully
- [ ] Proxy deployed successfully
- [ ] Stylus integration configured
- [ ] All addresses documented in deployment JSON

### Contract Verification

- [ ] UniversalZKVerifier verified on Arbiscan
- [ ] Source code visible and matches local
- [ ] Stylus WASM visible on Arbiscan
- [ ] No verification errors

### Functional Verification

- [ ] Can call `stylusVerifier()` view function
- [ ] Can register VK (as admin)
- [ ] Can verify single proof (mock data)
- [ ] Can batch verify (mock data)
- [ ] Gas costs match local tests (±10%)

### Documentation

- [ ] All addresses saved in `.env.sepolia`
- [ ] Deployment JSON generated
- [ ] Live gas report generated
- [ ] Arbiscan links documented

---

## 📊 Expected Gas Costs

### Deployment Costs

| Operation | Estimated Gas | Cost @ 0.1 gwei |
|-----------|--------------|-----------------|
| Stylus WASM Deployment | ~5,000,000 | ~0.0005 ETH |
| UniversalZKVerifier | ~2,100,000 | ~0.00021 ETH |
| Proxy Deployment | ~260,000 | ~0.000026 ETH |
| Initialize | ~125,000 | ~0.0000125 ETH |
| Set Stylus Verifier | ~26,000 | ~0.0000026 ETH |
| **Total** | **~7,511,000** | **~0.00075 ETH** |

*Note: Arbitrum Sepolia typically has very low gas prices (~0.1 gwei)*

### Operation Costs

| Operation | Expected Gas | Deviation |
|-----------|--------------|-----------|
| Single Verification | ~87,000 | ±5% |
| Batch 10 | ~170,000 | ±5% |
| Batch 50 | ~530,000 | ±5% |
| VK Registration | ~75,000 | ±5% |

---

## 🔧 Troubleshooting

### Issue: Insufficient Funds

**Error:** `insufficient funds for gas * price + value`

**Solution:**
```bash
# Get testnet ETH from faucet
# Visit: https://faucet.quicknode.com/arbitrum/sepolia
# Or: https://faucet.triangleplatform.com/arbitrum/sepolia

# Verify balance
cast balance $DEPLOYER --rpc-url $ARB_SEPOLIA_RPC
```

### Issue: cargo-stylus Not Found

**Error:** `command not found: cargo-stylus`

**Solution:**
```bash
# Install cargo-stylus
cargo install --force cargo-stylus

# Verify installation
cargo stylus --version
```

### Issue: RPC Connection Failed

**Error:** `error sending request for url`

**Solution:**
```bash
# Test RPC connectivity
cast block-number --rpc-url $ARB_SEPOLIA_RPC

# Try alternative RPC
export ARB_SEPOLIA_RPC="https://arbitrum-sepolia.publicnode.com"

# Or use Alchemy/Infura
export ARB_SEPOLIA_RPC="https://arb-sepolia.g.alchemy.com/v2/YOUR_KEY"
```

### Issue: Verification Failed

**Error:** `Failed to verify contract`

**Solution:**
```bash
# Wait 1-2 minutes for Arbiscan to index
sleep 120

# Retry verification
forge verify-contract \
  $VERIFIER_ADDRESS \
  src/UniversalZKVerifier.sol:UniversalZKVerifier \
  --chain-id 421614 \
  --etherscan-api-key $ARBISCAN_API_KEY \
  --watch

# If still failing, verify manually on Arbiscan UI
```

### Issue: Gas Costs Don't Match

**Observation:** Live testnet gas differs from local tests by >10%

**Analysis:**
- Network congestion may affect gas
- RPC provider may report differently
- Transaction batching effects

**Solution:**
```bash
# Re-run benchmarks multiple times
for i in {1..3}; do
  echo "Run $i:"
  node scripts/benchmark-gas.js
  sleep 60
done

# Compare results and take average
```

---

## 📝 Post-Deployment Tasks

### 1. Document Deployment

```bash
# Create deployment summary
cat > deployments/SEPOLIA-DEPLOYMENT.md << EOF
# Arbitrum Sepolia Deployment

**Date:** $(date)
**Deployer:** $DEPLOYER
**Network:** Arbitrum Sepolia (Chain ID: 421614)

## Deployed Contracts

### Stylus WASM Verifier
- Address: $STYLUS_ADDRESS
- Explorer: https://sepolia.arbiscan.io/address/$STYLUS_ADDRESS
- Size: $(ls -lh packages/stylus/artifacts/uzkv_stylus_optimized.wasm | awk '{print $5}')

### UniversalZKVerifier
- Address: $VERIFIER_ADDRESS  
- Explorer: https://sepolia.arbiscan.io/address/$VERIFIER_ADDRESS
- Verified: ✅ Yes

## Gas Benchmarking

See: benchmarks/gas-report.md

## Next Steps

- [ ] Community testing
- [ ] Bug bounty program
- [ ] Security audit preparation
- [ ] Mainnet deployment planning
EOF

git add deployments/SEPOLIA-DEPLOYMENT.md
git commit -m "docs: add Sepolia deployment documentation"
```

### 2. Share with Community

```bash
# Tweet deployment
echo "🚀 UZKV deployed to Arbitrum Sepolia!

✅ Stylus WASM Verifier: $STYLUS_ADDRESS
✅ Universal ZK Verifier: $VERIFIER_ADDRESS

Try it out:
- Verify Groth16 proofs: ~87k gas
- Batch verification: 88% savings
- All proof types supported

Explorer: https://sepolia.arbiscan.io/address/$VERIFIER_ADDRESS

#Arbitrum #zkProofs #Stylus"
```

### 3. Create GitHub Release

```bash
# Tag release
git tag -a v0.2.0-testnet -m "Testnet deployment: Arbitrum Sepolia"
git push origin v0.2.0-testnet

# Create release notes
# Visit: https://github.com/draxxycodes/Universal-ZKV/releases/new
# - Tag: v0.2.0-testnet
# - Title: "UZKV v0.2.0 - Arbitrum Sepolia Testnet"
# - Description: Include deployment addresses and benchmarks
```

---

## 🎯 Success Criteria

Phase S5 is complete when:

- ✅ Stylus WASM deployed and verified
- ✅ Solidity contracts deployed and verified
- ✅ All contracts visible on Arbiscan
- ✅ Live gas benchmarks match local tests (±10%)
- ✅ Integration configured correctly
- ✅ Deployment documented
- ✅ Community announcement made

---

## 📚 Additional Resources

- **Arbitrum Sepolia Faucet:** https://faucet.quicknode.com/arbitrum/sepolia
- **Arbiscan Sepolia:** https://sepolia.arbiscan.io
- **Arbitrum Docs:** https://docs.arbitrum.io
- **Stylus Docs:** https://docs.arbitrum.io/stylus/stylus-gentle-introduction
- **cargo-stylus:** https://github.com/OffchainLabs/cargo-stylus

---

**Last Updated:** November 21, 2025  
**Status:** Ready for Deployment  
**Next Phase:** S6 - Security Audit
