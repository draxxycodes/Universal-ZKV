# UZKV Deployment to Arbitrum Sepolia - Quick Guide

## ✅ Prerequisites Complete
- [x] cargo-stylus installed (v0.6.3)
- [x] WASM built (178KB - needs optimization but deployable)
- [x] Rust toolchain ready

## 🚀 Deployment Steps

### Step 1: Get Testnet ETH

Get Arbitrum Sepolia ETH from faucets:
- https://faucet.quicknode.com/arbitrum/sepolia
- https://www.alchemy.com/faucets/arbitrum-sepolia
- https://arbitrum.faucet.dev

You'll need ~0.01 ETH for deployment.

### Step 2: Set Your Private Key

**Option A: Environment Variable (Recommended for testing)**
```bash
export PRIVATE_KEY="0xyour_private_key_here"
```

**Option B: Interactive (Script will prompt)**
The deploy script will ask for your key if not set.

### Step 3: Deploy with cargo-stylus

```bash
cd packages/stylus

# Quick deploy (recommended)
cargo stylus deploy \
  --wasm-file target/wasm32-unknown-unknown/release/uzkv_stylus.wasm \
  --endpoint https://sepolia-rollup.arbitrum.io/rpc \
  --private-key $PRIVATE_KEY
```

**OR use the automated script:**

```bash
chmod +x deploy-sepolia.sh
./deploy-sepolia.sh
```

### Step 4: Save Contract Address

The deployment will output:
```
deployed code at address 0xYOUR_CONTRACT_ADDRESS
```

Save this address! You'll need it for:
- SDK configuration
- Frontend integration
- VK registration

### Step 5: Verify on Explorer

Visit: https://sepolia.arbiscan.io/address/YOUR_CONTRACT_ADDRESS

You should see:
- ✅ Contract creation transaction
- ✅ WASM bytecode stored
- ✅ Ready to receive calls

## 📝 Post-Deployment Tasks

### Register Verification Keys

For each proof system you want to support, register VKs:

```bash
# Example: Register a Groth16 VK
cast send YOUR_CONTRACT_ADDRESS \
  "register_vk_universal(bytes)" \
  $(cat your_universal_proof_with_vk.hex) \
  --rpc-url https://sepolia-rollup.arbitrum.io/rpc \
  --private-key $PRIVATE_KEY
```

### Test Verification

```bash
# Submit a test proof
cast send YOUR_CONTRACT_ADDRESS \
  "verify_universal(bytes)" \
  $(cat test_proof.hex) \
  --rpc-url https://sepolia-rollup.arbitrum.io/rpc \
  --private-key $PRIVATE_KEY

# Check if it worked (should return true/false)
cast call YOUR_CONTRACT_ADDRESS \
  "last_verification_result()" \
  --rpc-url https://sepolia-rollup.arbitrum.io/rpc
```

### Monitor Events

```bash
# Watch for ProofVerified events
cast logs \
  --address YOUR_CONTRACT_ADDRESS \
  --from-block latest \
  --rpc-url https://sepolia-rollup.arbitrum.io/rpc

# Or on Arbiscan:
# https://sepolia.arbiscan.io/address/YOUR_CONTRACT_ADDRESS#events
```

## 🔍 Troubleshooting

### Error: "WASM too large"
Your WASM is 178KB. Stylus limit is 128KB for initial deployment.

**Solutions:**
1. **Optimize build** (try this first):
```bash
cargo build --target wasm32-unknown-unknown --release
wasm-opt -Oz target/wasm32-unknown-unknown/release/uzkv_stylus.wasm -o optimized.wasm
```

2. **Split into modules**: Deploy base verifier first, add PLONK/STARK later

3. **Remove unused features**: Comment out PLONK/STARK if only using Groth16

### Error: "Insufficient gas"
Increase gas limit:
```bash
cargo stylus deploy \
  --gas-limit 30000000 \
  ... other args
```

### Error: "Nonce too low"
Someone else used your nonce. Just retry - it will auto-increment.

### Error: "Connection refused"
Make sure you're using the Sepolia RPC:
```
--endpoint https://sepolia-rollup.arbitrum.io/rpc
```

## 💰 Cost Estimate

- **Deployment**: ~0.005-0.01 ETH (~$15-30 @ $3000 ETH)
- **VK Registration**: ~0.0001 ETH per VK (~$0.30)
- **Proof Verification**: ~0.0001 ETH per proof (~$0.30)

## 📊 Contract Size Optimization

Current: **178KB** → Target: **<128KB**

Quick wins:
1. Remove unused proof systems (PLONK/STARK if not needed)
2. Optimize vendored dependencies
3. Use `wasm-opt` tool

## 🎯 Expected Output

After successful deployment:

```
Deploying program to address 0x...
Estimated gas: 25000000
Submitting tx...
✅ Deployed successfully!

Contract address: 0xYOUR_CONTRACT_ADDRESS
Transaction hash: 0x...
Gas used: 12500000

View on Arbiscan:
https://sepolia.arbiscan.io/tx/0x...
```

## 🔗 Integration Example

After deployment, update your SDK:

```typescript
import { UZKVClient } from '@uzkv/sdk';

const client = new UZKVClient({
  rpcUrl: 'https://sepolia-rollup.arbitrum.io/rpc',
  contractAddress: '0xYOUR_CONTRACT_ADDRESS',
});

// Verify a proof
const result = await client.verifyUniversal(universalProof);
console.log('Proof valid:', result);
```

## ✨ Success Checklist

- [ ] Got Sepolia ETH from faucet
- [ ] Set private key environment variable
- [ ] Deployed contract successfully
- [ ] Saved contract address
- [ ] Verified on Arbiscan
- [ ] Registered at least 1 VK
- [ ] Submitted test proof
- [ ] Monitored events
- [ ] Updated SDK/frontend with new address

## 🆘 Need Help?

If deployment fails:
1. Check `deploy-output.log` for detailed errors
2. Verify you have enough Sepolia ETH
3. Try with a fresh wallet
4. Check Arbitrum Sepolia status: https://status.arbitrum.io

## 🎉 You're Ready!

Once deployed, your UZKV contract will:
- ✅ Accept UniversalProof format
- ✅ Verify Groth16 proofs on-chain
- ✅ Support PLONK/STARK (when implemented)
- ✅ Emit verification events
- ✅ Store VK registry
- ✅ Handle PublicStatement format

Good luck! 🚀
