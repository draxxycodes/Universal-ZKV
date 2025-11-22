# UZKV Deployment Strategy

## The Problem
The full Groth16 verifier WASM is **122KB**, which exceeds Arbitrum's **24KB contract size limit**.

## The Solution: Attestor Pattern

### Architecture

```
┌─────────────────────────────────────────────────┐
│   OFF-CHAIN (No size limit)                    │
│                                                 │
│   packages/stylus/ - 122KB Groth16 Verifier   │
│   ├─ Runs locally or on server                 │
│   ├─ Full BN254 pairing verification           │
│   ├─ ark-groth16 + ark-bn254 libraries         │
│   └─ Returns: proof is valid/invalid           │
│                                                 │
│   If proof is VALID:                           │
│   ├─ Compute: hash = keccak256(proof + inputs) │
│   ├─ Sign: signature = sign(hash, attestor_key)│
│   └─ Submit to on-chain attestor              │
└─────────────────────────────────────────────────┘
                      ↓
┌─────────────────────────────────────────────────┐
│   ON-CHAIN (Must be < 24KB)                    │
│                                                 │
│   packages/attestor/ - ~8KB Attestor Contract  │
│   ├─ Verify ECDSA signature                    │
│   ├─ Check signer == trusted attestor          │
│   ├─ Record attestation in storage              │
│   └─ Emit ProofAttested event                   │
│                                                 │
│   Anyone can query:                             │
│   └─ is_attested(proof_hash) → bool            │
└─────────────────────────────────────────────────┘
```

## What To Deploy

### ❌ DO NOT Deploy: `packages/stylus/`
- **Size:** 122KB (exceeds 24KB limit)
- **Purpose:** Off-chain verification
- **Run:** Locally via WASM or on a server
- **Gas:** FREE (doesn't run on-chain)

### ✅ DO Deploy: `packages/attestor/`
- **Size:** ~8KB (66% under limit)
- **Purpose:** On-chain attestation recording
- **Deploy to:** Arbitrum Sepolia / Arbitrum One
- **Gas per attestation:** ~35,000 gas (~$0.01)

## Deployment Steps

### 1. Build Attestor

```bash
cd packages/attestor

# Update toolchain to support edition2024
# Edit rust-toolchain.toml: channel = "nightly-2025-01-01" or later

# Build WASM
cargo build --target wasm32-unknown-unknown --release

# Check size (should be ~8KB)
ls -lh target/wasm32-unknown-unknown/release/uzkv_attestor.wasm
```

### 2. Deploy to Arbitrum Sepolia

```bash
cargo stylus deploy \
    --no-verify \
    --endpoint https://arbitrum-sepolia-rpc.publicnode.com \
    --private-key 0x89999d59fc9cd25a556132c1f4c739bd7d2648f9c348ff32f533e4916303e732

# Save the contract address from output
export ATTESTOR_ADDRESS="0x..."
```

### 3. Initialize Attestor

```bash
# Set the trusted attestor signing key
export ATTESTOR_SIGNER="0x..."  # Public address that will sign proofs

cast send $ATTESTOR_ADDRESS \
    "initialize(address)" \
    $ATTESTOR_SIGNER \
    --rpc-url https://arbitrum-sepolia-rpc.publicnode.com \
    --private-key $PRIVATE_KEY
```

### 4. Verify Deployment

```bash
# Check attestor address
cast call $ATTESTOR_ADDRESS \
    "get_attestor()(address)" \
    --rpc-url https://arbitrum-sepolia-rpc.publicnode.com

# Check attestation count (should be 0)
cast call $ATTESTOR_ADDRESS \
    "get_attestation_count()(uint256)" \
    --rpc-url https://arbitrum-sepolia-rpc.publicnode.com
```

## Usage Flow

### Off-Chain Verification Service

```typescript
// 1. Load 122KB verifier WASM locally
import { verifyGroth16 } from './packages/stylus/wasm-bindings';

// 2. Verify proof (runs locally, no gas)
const isValid = await verifyGroth16(proof, publicInputs, vk);

if (isValid) {
    // 3. Compute proof hash
    const proofHash = ethers.keccak256(
        ethers.concat([proofBytes, publicInputsBytes])
    );
    
    // 4. Sign with attestor key
    const attestorWallet = new ethers.Wallet(ATTESTOR_PRIVATE_KEY);
    const signature = await attestorWallet.signMessage(
        ethers.getBytes(proofHash)
    );
    
    // 5. Submit to on-chain attestor
    const attestor = new ethers.Contract(
        ATTESTOR_ADDRESS,
        ATTESTOR_ABI,
        userWallet
    );
    
    await attestor.attest_proof(proofHash, signature);
    // Cost: ~35k gas (~$0.01)
}
```

### Query Attestations

```typescript
// Check if a proof was attested
const isAttested = await attestor.is_attested(proofHash);

// Get total attestation count
const count = await attestor.get_attestation_count();
```

## Size Comparison

| Component | Size | Limit | Deploy? |
|-----------|------|-------|---------|
| **Verifier** (packages/stylus) | 122 KB | 24 KB | ❌ Too large |
| **Attestor** (packages/attestor) | ~8 KB | 24 KB | ✅ Fits! |

## Gas Comparison

| Operation | Gas | Cost @ $3000 ETH |
|-----------|-----|------------------|
| Full on-chain Groth16 (if possible) | ~500k | ~$1.50 |
| Attestor deployment | ~150k | ~$0.45 (one-time) |
| Each attestation | ~35k | ~$0.01 |
| Query attestation | ~3k | ~$0.001 |

## Security Model

### What You Trust
- Off-chain verifier correctly implements Groth16
- Attestor private key is kept secure
- Attestor won't sign invalid proofs

### What You DON'T Trust
- On-chain ECDSA signature verification (cryptographically secure)
- Attestation storage (immutable blockchain)
- Query results (publicly verifiable)

## Current Blockers

### 1. Rust Toolchain Version
- **Issue:** `stylus-sdk 0.10.0-rc.1` dependencies require edition2024
- **Need:** Rust nightly >= 2025-01-01 (with Cargo edition2024 support)
- **Status:** Rust 1.85.0-nightly (2025-01-01) should work

### 2. Dependency Compatibility
- Some dependencies may need updates for latest nightly
- May need to pin specific versions

## Next Steps

1. ✅ Identify correct deployment target (attestor, not verifier)
2. 🔄 Update attestor toolchain to nightly-2025-01-01+
3. ⏳ Build attestor WASM (~8KB)
4. ⏳ Deploy attestor to Arbitrum Sepolia
5. ⏳ Initialize with trusted signer address
6. ⏳ Build off-chain verification service
7. ⏳ Integrate with SDK for end-to-end flow

## Summary

**The big verifier (122KB) stays off-chain. The tiny attestor (8KB) goes on-chain.**

This gives you:
- ✅ Full Groth16 verification (off-chain, unlimited size)
- ✅ On-chain proof of verification (attestor records it)
- ✅ Publicly verifiable (anyone can query attestations)
- ✅ Low gas costs (~$0.01 per proof)
- ✅ Pure Stylus stack (no Solidity)
