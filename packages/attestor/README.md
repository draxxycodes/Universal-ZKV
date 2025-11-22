# UZKV Attestor - Tiny Stylus Contract

**Size:** ~5-10 KB (fits 24KB limit easily)  
**Purpose:** Record off-chain Groth16 proof verifications on-chain  
**Gas Cost:** ~30-50k per attestation

## Architecture

```
┌─────────────────────────────────────────┐
│   Off-Chain (Local Machine)            │
│                                         │
│  1. Stylus WASM (122KB) verifies proof │
│     ├─ Groth16 verification            │
│     ├─ BN254 pairing operations        │
│     └─ Returns: valid/invalid          │
│                                         │
│  2. If valid: Sign proof hash          │
│     ├─ proof_hash = keccak256(proof || inputs)
│     ├─ signature = eth_sign(proof_hash)│
│     └─ Use attestor private key        │
└─────────────────────────────────────────┘
                    ↓
┌─────────────────────────────────────────┐
│   On-Chain (Arbitrum One/Sepolia)      │
│                                         │
│  3. Attestor Contract (This - Stylus)  │
│     ├─ Verify signature using ecrecover│
│     ├─ Check signer == attestor address│
│     ├─ Record attestation on-chain     │
│     └─ Emit ProofAttested event        │
│                                         │
│  4. Anyone can query:                   │
│     ├─ is_attested(proof_hash) → bool  │
│     ├─ get_attestation_count() → uint  │
│     └─ View events on Arbiscan         │
└─────────────────────────────────────────┘
```

## Deployment Cost Estimate

### Arbitrum One (Mainnet)
- **Contract deployment:** ~0.0002 ETH ($0.60 @ $3000/ETH)
- **Per attestation:** ~0.00003 ETH ($0.09 @ $3000/ETH)

### Arbitrum Sepolia (Testnet)
- **Contract deployment:** FREE (testnet ETH)
- **Per attestation:** FREE (testnet ETH)

## Build

```bash
cd packages/attestor
cargo build --target wasm32-unknown-unknown --release
```

## Check Size

```bash
ls -lh target/wasm32-unknown-unknown/release/uzkv_attestor.wasm
# Expected: 5-10 KB (well under 24KB limit)
```

## Deploy (Will show costs before executing)

```bash
# Sepolia (testnet)
cargo stylus deploy --endpoint https://sepolia-rollup.arbitrum.io/rpc

# Arbitrum One (mainnet) - REQUIRES APPROVAL
cargo stylus deploy --endpoint https://arb1.arbitrum.io/rpc
```

## Usage Flow

### 1. Off-Chain Verification (Local)

```typescript
// packages/sdk/src/attestor.ts
import { verifyGroth16 } from './stylus-wasm';
import { ethers } from 'ethers';

// Run 122KB WASM locally
const isValid = await verifyGroth16(proof, publicInputs, vk);

if (isValid) {
    // Compute proof hash
    const proofHash = ethers.keccak256(
        ethers.concat([proofBytes, publicInputsBytes])
    );
    
    // Sign with attestor key
    const attestorWallet = new ethers.Wallet(ATTESTOR_PRIVATE_KEY);
    const signature = await attestorWallet.signMessage(
        ethers.getBytes(proofHash)
    );
    
    // Submit on-chain
    const attestorContract = new ethers.Contract(
        ATTESTOR_ADDRESS,
        ATTESTOR_ABI,
        wallet
    );
    
    await attestorContract.attest_proof(proofHash, signature);
}
```

### 2. Query Attestation

```typescript
// Check if proof was attested
const isAttested = await attestorContract.is_attested(proofHash);

// Get total count
const count = await attestorContract.get_attestation_count();

// View events on Arbiscan
// https://arbiscan.io/address/{ATTESTOR_ADDRESS}#events
```

## Trust Model

**What you're trusting:**
- The off-chain verifier correctly runs Groth16 verification
- The attestor private key is kept secure
- The attestor won't sign invalid proofs

**What you're NOT trusting:**
- The on-chain signature verification (cryptographically secure)
- The attestation record storage (immutable on-chain)
- The query results (anyone can verify independently)

## Improvements

**Multi-Sig Attestation:**
Require k-of-n signatures before recording attestation:

```rust
pub struct MultiSigAttestor {
    attestors: StorageVec<Address>,
    threshold: StorageU256,
    attestations: StorageMap<FixedBytes<32>, StorageVec<Address>>,
}
```

**Still fits under 24KB**, adds decentralization.

## Gas Comparison

| Operation | Solidity | Stylus | Savings |
|-----------|----------|--------|---------|
| Deploy | ~200k gas | ~150k gas | 25% |
| Attest | ~50k gas | ~35k gas | 30% |
| Query | ~5k gas | ~3k gas | 40% |

## Size Comparison

| Component | Size | Limit | Status |
|-----------|------|-------|--------|
| Attestor WASM | ~8 KB | 24 KB | ✅ Fits |
| Verifier WASM | 122 KB | 24 KB | ❌ Too large |
| **Solution** | Off-chain verify + on-chain attest | | ✅ Works |
