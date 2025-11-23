# Stylus Contract Deployment Guide

## 🎯 Deployment Checklist

- [ ] WASM built and optimized (<128KB)
- [ ] ABI exported
- [ ] Solidity interface created
- [ ] Testnet funds available (0.1 ETH recommended)
- [ ] Private key secured
- [ ] RPC endpoint configured

## 🔧 Prerequisites

```bash
# 1. Install cargo-stylus
cargo install cargo-stylus

# 2. Get testnet ETH from faucet
# Arbitrum Sepolia: https://faucet.quicknode.com/arbitrum/sepolia

# 3. Set up environment variables
export PRIVATE_KEY="0x..."
export ARBITRUM_SEPOLIA_RPC="https://sepolia-rollup.arbitrum.io/rpc"
```

## 📋 Deployment Steps

### Step 1: Build WASM

```bash
cd packages/stylus

# Build optimized WASM
./build-wasm.sh

# Verify size
ls -lh artifacts/uzkv_verifier_optimized.wasm
```

**Expected:** <128KB

### Step 2: Estimate Deployment Cost

```bash
cargo stylus deploy \
  --private-key $PRIVATE_KEY \
  --endpoint $ARBITRUM_SEPOLIA_RPC \
  --wasm-file artifacts/uzkv_verifier_optimized.wasm \
  --estimate-gas
```

**Expected Cost:** ~0.01 - 0.05 ETH on Sepolia

### Step 3: Deploy to Arbitrum Sepolia

```bash
cargo stylus deploy \
  --private-key $PRIVATE_KEY \
  --endpoint $ARBITRUM_SEPOLIA_RPC \
  --wasm-file artifacts/uzkv_verifier_optimized.wasm \
  --no-verify

# Save the contract address from output
STYLUS_ADDRESS="0x..."
```

**Output:**

```
deployed code at address: 0x1234567890abcdef1234567890abcdef12345678
deployment tx hash: 0xabcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890
```

### Step 4: Verify on Arbiscan

```bash
cargo stylus verify \
  --deployment-tx <TX_HASH> \
  --endpoint $ARBITRUM_SEPOLIA_RPC
```

**Or verify manually:**

1. Go to https://sepolia.arbiscan.io/address/<STYLUS_ADDRESS>
2. Click "Contract" tab
3. Click "Verify and Publish"
4. Upload `artifacts/IUniversalVerifier.sol`

### Step 5: Test Deployment

```bash
# Check if contract is deployed
cast code $STYLUS_ADDRESS --rpc-url $ARBITRUM_SEPOLIA_RPC

# Call isPaused (should return false)
cast call $STYLUS_ADDRESS "isPaused()(bool)" --rpc-url $ARBITRUM_SEPOLIA_RPC

# Call getVerificationCount (should return 0)
cast call $STYLUS_ADDRESS "getVerificationCount()(uint256)" --rpc-url $ARBITRUM_SEPOLIA_RPC
```

### Step 6: Update .env Files

```bash
# Save deployment address
echo "STYLUS_VERIFIER_ADDRESS=$STYLUS_ADDRESS" >> .env.sepolia
echo "DEPLOYMENT_TX_HASH=<TX_HASH>" >> .env.sepolia
echo "DEPLOYMENT_DATE=$(date -u +%Y-%m-%d)" >> .env.sepolia
```

## 🧪 Post-Deployment Testing

### Test 1: Register a Verification Key

```bash
# Generate a dummy VK (32 bytes for testing)
VK="0x$(openssl rand -hex 32)"

# Register VK (Groth16)
cast send $STYLUS_ADDRESS \
  "registerVk(bytes)(bytes32)" \
  $VK \
  --private-key $PRIVATE_KEY \
  --rpc-url $ARBITRUM_SEPOLIA_RPC

# Get VK hash
VK_HASH=$(cast keccak $VK)

# Check if registered
cast call $STYLUS_ADDRESS \
  "isVkRegistered(bytes32)(bool)" \
  $VK_HASH \
  --rpc-url $ARBITRUM_SEPOLIA_RPC
```

### Test 2: Pause/Unpause

```bash
# Pause contract
cast send $STYLUS_ADDRESS \
  "pause()" \
  --private-key $PRIVATE_KEY \
  --rpc-url $ARBITRUM_SEPOLIA_RPC

# Check paused
cast call $STYLUS_ADDRESS "isPaused()(bool)" --rpc-url $ARBITRUM_SEPOLIA_RPC
# Should return: true

# Unpause
cast send $STYLUS_ADDRESS \
  "unpause()" \
  --private-key $PRIVATE_KEY \
  --rpc-url $ARBITRUM_SEPOLIA_RPC
```

### Test 3: Verification Count

```bash
# Get current count
cast call $STYLUS_ADDRESS "getVerificationCount()(uint256)" --rpc-url $ARBITRUM_SEPOLIA_RPC

# After running some verifications, check again
```

## 🚀 Mainnet Deployment

### Additional Checks

1. **Security Audit:** Complete before mainnet
2. **Gas Optimization:** Verify <128KB WASM size
3. **Multi-sig Admin:** Use Gnosis Safe for admin functions
4. **Emergency Procedures:** Document pause process
5. **Monitoring:** Set up alerts for contract events

### Mainnet Steps

```bash
# 1. Build production WASM
./build-wasm.sh

# 2. Audit WASM binary
sha256sum artifacts/uzkv_verifier_optimized.wasm

# 3. Deploy to mainnet
export ARBITRUM_MAINNET_RPC="https://arb1.arbitrum.io/rpc"

cargo stylus deploy \
  --private-key $PRIVATE_KEY \
  --endpoint $ARBITRUM_MAINNET_RPC \
  --wasm-file artifacts/uzkv_verifier_optimized.wasm

# 4. Verify on Arbiscan
cargo stylus verify \
  --deployment-tx <TX_HASH> \
  --endpoint $ARBITRUM_MAINNET_RPC

# 5. Transfer admin to multi-sig
cast send $STYLUS_ADDRESS \
  "transferAdmin(address)" \
  <MULTISIG_ADDRESS> \
  --private-key $PRIVATE_KEY \
  --rpc-url $ARBITRUM_MAINNET_RPC
```

## 📊 Deployment Costs

| Network | Deployment | VK Registration | Verification |
| ------- | ---------- | --------------- | ------------ |
| Sepolia | ~0.01 ETH  | ~0.0001 ETH     | ~0.00006 ETH |
| Mainnet | ~0.1 ETH   | ~0.001 ETH      | ~0.0006 ETH  |

_Costs are estimates and vary with gas prices_

## 🔐 Security Best Practices

1. **Private Key Management:**
   - Never commit private keys
   - Use hardware wallets for mainnet
   - Rotate keys regularly

2. **Admin Controls:**
   - Use multi-sig for admin (Gnosis Safe)
   - Set up timelocks for critical operations
   - Document emergency procedures

3. **Monitoring:**
   - Set up alerts for pause events
   - Monitor verification counts
   - Track gas usage patterns

4. **Upgrades:**
   - Use UUPS proxy pattern
   - Test upgrades on testnet first
   - Document upgrade process

## 📝 Deployment Addresses

### Arbitrum Sepolia

```
Stylus Verifier: <pending deployment>
Proxy Address:   <pending deployment>
Admin Address:   <pending deployment>
```

### Arbitrum One (Mainnet)

```
Stylus Verifier: <not deployed>
Proxy Address:   <not deployed>
Admin Address:   <not deployed>
```

## 🐛 Troubleshooting

### Error: "insufficient funds"

**Solution:** Get testnet ETH from faucet

### Error: "WASM too large"

**Solution:** Re-optimize with `wasm-opt -Oz`

### Error: "deployment reverted"

**Solution:** Check RPC endpoint and network

### Error: "verification failed"

**Solution:** Ensure contract is deployed first

## 🔗 Resources

- [Arbitrum Sepolia Explorer](https://sepolia.arbiscan.io/)
- [Arbitrum Mainnet Explorer](https://arbiscan.io/)
- [Arbitrum Faucet](https://faucet.quicknode.com/arbitrum/sepolia)
- [Stylus Docs](https://docs.arbitrum.io/stylus/)
- [cargo-stylus](https://github.com/OffchainLabs/cargo-stylus)

---

**Last Updated:** November 21, 2025  
**Status:** Ready for testnet deployment
