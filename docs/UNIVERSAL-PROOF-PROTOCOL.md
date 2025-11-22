# Universal Proof Protocol Specification

**Version:** 1.0  
**Status:** Frozen (Audit-Ready)  
**Last Updated:** November 23, 2025

## Overview

The Universal Proof Protocol defines the binary format for all zero-knowledge proofs submitted to UZKV. This frozen protocol ensures cross-language compatibility, type safety, and audit readiness.

## Design Principles

1. **Version Stability**: Breaking changes require new version numbers
2. **Deterministic Encoding**: Borsh-compatible serialization for predictable bytes
3. **Type Safety**: Strong enums prevent invalid proof routing
4. **Security by Design**: Explicit binding of (proofType, programId, vkHash)
5. **Cross-Language**: Rust ↔ TypeScript ↔ Solidity interoperability

## Core Types

### ProofType Enum

```rust
#[repr(u8)]
pub enum ProofType {
    Groth16 = 0,  // Trusted setup, ~280k gas, 128 byte proofs
    PLONK   = 1,  // Universal setup, ~400k gas, 800 byte proofs
    STARK   = 2,  // Transparent, ~540k gas, 40-100 KB proofs
}
```

**Wire Format:** Single byte (0x00, 0x01, or 0x02)

### PublicStatement Struct

Unified public input format across all proof systems.

```rust
pub struct PublicStatement {
    pub merkle_root: [u8; 32],      // State tree root
    pub public_key: [u8; 32],       // EdDSA public key (prover identity)
    pub nullifier: [u8; 32],        // Anti-replay value
    pub value: u128,                // Scalar (amount, index, etc.)
    pub extra: Vec<u8>,             // Application-specific extensions
}
```

#### Binary Layout (Borsh Encoding)

```
Offset  | Size  | Field
--------|-------|------------------
0       | 32    | merkle_root
32      | 32    | public_key
64      | 32    | nullifier
96      | 16    | value (u128 little-endian)
112     | 4     | extra_len (u32 little-endian)
116     | N     | extra data
```

**Total Size:** 116 + len(extra) bytes

#### Security Invariants

- `merkle_root` MUST match current on-chain state root
- `public_key` SHOULD be verified via EdDSA signature in circuit
- `nullifier` MUST be derived from secret inputs (prevents replay)
- `value` is application-specific (amount, ID, timestamp, etc.)
- `extra` allows extensibility without protocol changes

### UniversalProof Struct

Top-level proof envelope wrapping all proof systems.

```rust
pub struct UniversalProof {
    pub version: u8,                    // Protocol version (currently 1)
    pub proof_type: ProofType,          // Which proof system
    pub program_id: u32,                // Circuit/program identifier
    pub vk_hash: [u8; 32],              // Verification key hash
    pub proof_bytes: Vec<u8>,           // System-specific proof data
    pub public_inputs_bytes: Vec<u8>,   // Encoded PublicStatement
}
```

#### Binary Layout (Borsh-Compatible)

```
Offset  | Size  | Field
--------|-------|---------------------------
0       | 1     | version
1       | 1     | proof_type (u8)
2       | 4     | program_id (u32 little-endian)
6       | 32    | vk_hash
38      | 4     | proof_len (u32 little-endian)
42      | M     | proof_bytes
42+M    | 4     | public_inputs_len (u32 little-endian)
46+M    | N     | public_inputs_bytes
```

**Total Size:** 46 + len(proof_bytes) + len(public_inputs_bytes) bytes

#### Field Semantics

**version** (1 byte)
- Current version: `1`
- Future versions may support recursion, aggregation
- Decoder MUST reject unknown versions

**proof_type** (1 byte)
- `0x00` = Groth16
- `0x01` = PLONK
- `0x02` = STARK
- Other values MUST be rejected

**program_id** (4 bytes, u32 little-endian)
- Identifies which circuit/program generated this proof
- Allows multiple circuits per proof type
- Examples:
  - `0` = Poseidon hash circuit
  - `1` = EdDSA signature circuit
  - `2` = Merkle tree membership circuit
  - `42` = Custom application circuit

**vk_hash** (32 bytes)
- Keccak256 or SHA256 of verification key bytes
- MUST match on-chain registered VK for `(proof_type, program_id)`
- Prevents VK substitution attacks

**proof_bytes** (variable length)
- Groth16: ~128 bytes (2 G1 points + 1 G2 point, compressed)
- PLONK: ~800 bytes (commitments + evaluations + KZG opening)
- STARK: ~40-100 KB (FRI proof + trace commitments)
- Format is proof-system-specific

**public_inputs_bytes** (variable length)
- Borsh-encoded `PublicStatement`
- Typically 116 bytes (no extra data)
- Can be larger with application extensions

## Encoding/Decoding

### Encoding Example (Rust)

```rust
use uzkv_stylus::types::{UniversalProof, PublicStatement, ProofType};

// Create public statement
let statement = PublicStatement::new(
    [0x11; 32],  // merkle_root
    [0x22; 32],  // public_key
    [0x33; 32],  // nullifier
    12345u128,   // value
);

// Create universal proof
let proof = UniversalProof::new(
    ProofType::Groth16,
    0,  // program_id
    [0xAB; 32],  // vk_hash
    vec![0xDE, 0xAD, 0xBE, 0xEF],  // proof_bytes (mock)
    statement.encode(),  // public_inputs_bytes
);

// Encode to bytes
let bytes = proof.encode();
```

### Decoding Example (Rust)

```rust
use uzkv_stylus::types::UniversalProof;

// Decode from bytes
let proof = UniversalProof::decode(&bytes)?;

// Validate version
assert_eq!(proof.version, 1);

// Extract public statement
let statement = proof.decode_public_statement()?;

// Verify fields
assert_eq!(statement.merkle_root, [0x11; 32]);
assert_eq!(statement.value, 12345u128);
```

### TypeScript Encoding (Task 2 - To Be Implemented)

```typescript
import { UniversalProof, PublicStatement, ProofType } from '@uzkv/sdk';

// Create public statement
const statement = new PublicStatement({
  merkleRoot: new Uint8Array(32).fill(0x11),
  publicKey: new Uint8Array(32).fill(0x22),
  nullifier: new Uint8Array(32).fill(0x33),
  value: 12345n,
  extra: new Uint8Array(0),
});

// Create universal proof
const proof = new UniversalProof({
  version: 1,
  proofType: ProofType.Groth16,
  programId: 0,
  vkHash: new Uint8Array(32).fill(0xAB),
  proofBytes: new Uint8Array([0xDE, 0xAD, 0xBE, 0xEF]),
  publicInputsBytes: statement.encode(),
});

// Encode to bytes
const bytes = proof.encode();
```

## On-Chain Integration

### Solidity Proxy Flow

```solidity
// Client submits raw bytes
function verify(bytes calldata universalProofBytes) external returns (bool) {
    // Forward to Stylus contract
    (bool success, bytes memory result) = stylusVerifier.call(
        universalProofBytes
    );
    
    require(success, "Stylus verification failed");
    return abi.decode(result, (bool));
}
```

### Stylus Verifier Flow

```rust
#[external]
pub fn verify(ctx: &mut Context, universal_proof_bytes: Vec<u8>) -> bool {
    // Decode universal proof
    let proof = UniversalProof::decode(&universal_proof_bytes)?;
    
    // Validate version
    if proof.version != 1 {
        return false;
    }
    
    // Route to appropriate verifier
    match proof.proof_type {
        ProofType::Groth16 => groth16::verify(&proof),
        ProofType::PLONK => plonk::verify(&proof),
        ProofType::STARK => stark::verify(&proof),
    }
}
```

## Security Considerations

### 1. VK Registry Binding

**Invariant:** Every proof MUST have a matching VK registered for `(proof_type, program_id, vk_hash)`.

**Attack Prevented:** User cannot submit Groth16 proof with PLONK VK hash, or vice versa.

**Implementation:**
```rust
// On-chain storage
mapping(proof_type => mapping(program_id => mapping(vk_hash => vk_bytes)))

// Verification check
let stored_vk = get_vk(proof.proof_type, proof.program_id, proof.vk_hash);
if stored_vk.is_none() {
    return Err(Error::VKNotRegistered);
}
```

### 2. Nullifier Uniqueness

**Invariant:** Each nullifier can only be used once per contract.

**Attack Prevented:** Replay attacks, double-spending.

**Implementation:**
```rust
// On-chain storage
mapping(nullifier => bool) used_nullifiers;

// Check before verification
let statement = proof.decode_public_statement()?;
if used_nullifiers.contains(statement.nullifier) {
    return Err(Error::NullifierAlreadyUsed);
}

// Mark as used after successful verification
used_nullifiers.insert(statement.nullifier, true);
```

### 3. Version Enforcement

**Invariant:** Only version 1 proofs are accepted currently.

**Attack Prevented:** Downgrade attacks, future incompatibility.

**Implementation:**
```rust
if proof.version != 1 {
    return Err(Error::UnsupportedVersion);
}
```

### 4. Input Size Limits

**Invariant:** Proof sizes must stay within reasonable bounds.

**Attack Prevented:** DoS via extremely large proofs.

**Recommended Limits:**
- Groth16: max 256 bytes
- PLONK: max 2 KB
- STARK: max 200 KB
- PublicStatement: max 1 KB extra data

## Testing

### Unit Tests (Rust)

```bash
cd packages/stylus
cargo test types::tests
```

**Coverage:**
- ✅ ProofType enum roundtrip (from_u8/to_u8)
- ✅ PublicStatement encode/decode
- ✅ PublicStatement with extra data
- ✅ UniversalProof encode/decode
- ✅ Invalid version rejection
- ✅ Invalid proof type rejection
- ✅ Buffer too short rejection
- ✅ Size calculation accuracy

### Integration Tests (TypeScript - Task 2)

```bash
cd packages/sdk
pnpm test
```

**Coverage (planned):**
- Rust ↔ TypeScript encoding compatibility
- Groth16 proof end-to-end flow
- PLONK proof end-to-end flow
- STARK proof end-to-end flow
- Invalid proof rejection

## Protocol Versioning

### Version 1 (Current)

**Features:**
- Groth16, PLONK, STARK support
- Unified PublicStatement format
- VK registry with (proofType, programId, vkHash) binding
- Nullifier-based replay protection

**Limitations:**
- No recursive proof support
- No aggregation (batch proofs still separate)
- Single-level program_id (no namespacing)

### Version 2 (Future)

**Planned Features:**
- `ProofType::Recursive = 3` for Groth16-in-PLONK
- `ProofType::Aggregate = 4` for batched verifications
- Extended PublicStatement with commitment trees
- Hierarchical program_id (namespace.circuit_id)

**Migration Path:**
- Version 1 contracts continue working
- Version 2 decoders MUST support version 1 (backward compat)
- Version 1 decoders reject version 2 (forward incompatibility)

## Implementation Checklist

### Phase 1: Core Protocol ✅
- [x] Define ProofType enum in Rust
- [x] Define PublicStatement struct in Rust
- [x] Define UniversalProof struct in Rust
- [x] Implement borsh-compatible encoding
- [x] Implement safe decoding with validation
- [x] Write comprehensive unit tests (8 tests)
- [x] Document security invariants
- [x] Commit to git as frozen protocol

### Phase 2: TypeScript SDK (Task 2) 🚧
- [ ] Create `packages/sdk/src/types.ts`
- [ ] Implement PublicStatement class
- [ ] Implement UniversalProof class
- [ ] Write encode/decode methods
- [ ] Add cross-compatibility tests (Rust ↔ TS)
- [ ] Update SDK to use UniversalProof envelope

### Phase 3: VK Registry (Task 3) 🔜
- [ ] Add storage mapping to Stylus contract
- [ ] Implement registerVK() with binding
- [ ] Add vkHash validation to verify()
- [ ] Write tests for VK mismatch rejection

### Phase 4: Events & Monitoring (Task 4) 🔜
- [ ] Add ProofVerified event to Stylus
- [ ] Emit event on every verify() call
- [ ] Create off-chain monitoring dashboard
- [ ] Set up alerts for anomalies

## References

- **Borsh Specification**: https://borsh.io/
- **EIP-7201 Storage**: https://eips.ethereum.org/EIPS/eip-7201
- **Arbitrum Stylus**: https://docs.arbitrum.io/stylus
- **UZKV Repository**: https://github.com/draxxycodes/Universal-ZKV

## Changelog

### 2025-11-23 - Version 1.0 (Frozen)
- Initial protocol specification
- Rust implementation complete
- 8 unit tests passing
- Ready for TypeScript SDK mirroring
- Security invariants documented
- Audit-ready state achieved

---

**Status:** This protocol is now **FROZEN** for audit preparation. Any changes require a new version number and migration plan.
