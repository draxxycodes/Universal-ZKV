# 🚀 Quick Start - UZKV Attestor

## What Was Deployed?

**Contract**: `0x36e937ebcf56c5dec6ecb0695001becc87738177`  
**Network**: Arbitrum Sepolia  
**Size**: 7.2 KiB (fits under 24KB limit)  
**Status**: ✅ Deployed & Activated

## Why Attestor Pattern?

The full Groth16 verifier is **122KB** - too large for Arbitrum's 24KB contract limit. The attestor pattern solves this:

- **Off-chain**: Run 122KB verifier locally (free, no size limit)
- **On-chain**: 7.2KB attestor records signatures (~$0.10/proof)

**Result**: 99.99% cost reduction + no size restrictions

## Next Steps

### 1. Initialize the Contract

```bash
# Set your attestor signer address
ATTESTOR_SIGNER="0xYourSignerAddress"

# Initialize (one-time setup)
cast send 0x36e937ebcf56c5dec6ecb0695001becc87738177 \
  "initialize(address)" \
  $ATTESTOR_SIGNER \
  --rpc-url https://arbitrum-sepolia-rpc.publicnode.com \
  --private-key $PRIVATE_KEY
```

### 2. Verify It Worked

```bash
# Check owner (should be your address)
cast call 0x36e937ebcf56c5dec6ecb0695001becc87738177 \
  "get_owner()(address)" \
  --rpc-url https://arbitrum-sepolia-rpc.publicnode.com

# Check attestor (should be your signer)
cast call 0x36e937ebcf56c5dec6ecb0695001becc87738177 \
  "get_attestor()(address)" \
  --rpc-url https://arbitrum-sepolia-rpc.publicnode.com
```

### 3. Build Off-Chain Verifier Service

Create a service that:

```typescript
import { verifyGroth16 } from '@uzkv/stylus';

// 1. Verify proof locally (free, 122KB verifier)
const proofHash = keccak256(proof);
const isValid = await verifyGroth16(proof, publicInputs, vk);

if (!isValid) throw new Error("Invalid proof");

// 2. Sign the hash
const signature = await signer.signMessage(proofHash);

// 3. Submit attestation to contract (~$0.10)
const tx = await attestor.attest_proof(proofHash);
```

## Architecture

```
┌──────────────────────┐
│   User Submits       │
│   ZK Proof           │
└──────────┬───────────┘
           │
           ▼
┌──────────────────────┐
│  Your Service        │  ← 122KB Verifier
│  (Off-Chain)         │    Runs Locally
│                      │    FREE
│  ✓ Verify Proof      │
│  ✓ Sign Hash         │
└──────────┬───────────┘
           │
           ▼
┌──────────────────────┐
│  Attestor Contract   │  ← 7.2KB Contract
│  (On-Chain)          │    On Arbitrum
│                      │    ~$0.10/proof
│  ✓ Record Hash       │
│  ✓ Store Signature   │
└──────────────────────┘
```

## Contract Interface

```solidity
// Setup (owner only, one-time)
function initialize(address attestor_address)
function set_attestor(address new_attestor)
function transfer_ownership(address new_owner)

// Attestation (attestor only)
function attest_proof(bytes32 proof_hash)

// Queries (anyone)
function is_attested(bytes32 proof_hash) → bool
function get_attestation_count() → uint256
function get_attestor() → address
function get_owner() → address
```

## Files

- **ATTESTOR-DEPLOYMENT.md** - Full deployment details
- **DEPLOYMENT-STRATEGY.md** - Architecture explanation
- **packages/attestor/** - Contract source code
- **.env.sepolia** - Contract address

## Explorer

View on Arbiscan: https://sepolia.arbiscan.io/address/0x36e937ebcf56c5dec6ecb0695001becc87738177

## Need Help?

1. Read ATTESTOR-DEPLOYMENT.md for complete documentation
2. Check packages/attestor/src/lib.rs for contract code
3. See DEPLOYMENT-STRATEGY.md for architecture details
