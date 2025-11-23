# Universal ZK Verifier - Usage Guide

## 🎯 **One Verifier for All Proof Types**

The Universal ZK Verifier (UZKV) is built with **Rust Stylus** and provides a **single contract interface** that can verify **all three proof types**: Groth16, PLONK, and STARK.

### 🦀 Why Rust Stylus?

- **10x cheaper computation** compared to EVM Solidity
- **Compiles to WASM** for near-native performance
- **EVM-compatible** - callable from any EVM contract or dApp
- **Memory-safe** with Rust's ownership model
- **Perfect for ZK verification** - complex cryptographic operations run efficiently

---

## 🚀 **Quick Start - Using the Universal Verifier**

### Single Function for All Proof Types

**Rust Stylus Implementation:**

```rust
#[public]
pub fn verify(
    &mut self,
    proof_type: u8,       // 0=Groth16, 1=PLONK, 2=STARK
    proof: Vec<u8>,
    public_inputs: Vec<u8>,
    vk_hash: [u8; 32]     // Not used for STARK
) -> Result<bool, Error>;
```

**From TypeScript/JavaScript** (interacts via ABI):

```typescript
// Call via ethers.js (Stylus contracts are EVM-compatible)
await uzkv.verify(proofType, proof, publicInputs, vkHash);
```

---

## 📋 **Proof Type Enumeration**

| Proof Type  | Value | Gas Cost | Setup Type  | Security             |
| ----------- | ----- | -------- | ----------- | -------------------- |
| **Groth16** | `0`   | ~280k    | Trusted     | Discrete Log         |
| **PLONK**   | `1`   | ~400k    | Universal   | Discrete Log         |
| **STARK**   | `2`   | ~540k    | Transparent | Collision Resistance |

---

## 💻 **Usage Examples**

### 1. Verify Groth16 Proof (Poseidon Hash)

```typescript
import { ethers } from "ethers";

const contractAddress = "0x..."; // Your deployed UZKV contract
const abi = [
  "function verify(uint8 proofType, bytes proof, bytes publicInputs, bytes32 vkHash) external returns (bool)",
];

const provider = new ethers.JsonRpcProvider(
  "https://sepolia-rollup.arbitrum.io/rpc",
);
const signer = new ethers.Wallet(privateKey, provider);
const uzkv = new ethers.Contract(contractAddress, abi, signer);

// Groth16 proof data (from snarkjs)
const proof = "0x..."; // Serialized Groth16 proof
const publicInputs = "0x..."; // Hash output
const vkHash = "0x..."; // Registered VK hash

// Verify using universal interface
const isValid = await uzkv.verify(
  0, // Groth16 proof type
  proof,
  publicInputs,
  vkHash,
);

console.log("Groth16 verification:", isValid);
```

### 2. Verify PLONK Proof (EdDSA Signature)

```typescript
// PLONK proof data
const plonkProof = "0x..."; // PLONK proof bytes
const signatureValid = "0x..."; // Public output (1 = valid)
const plonkVkHash = "0x..."; // Registered PLONK VK

// Verify using same universal interface
const isValid = await uzkv.verify(
  1, // PLONK proof type
  plonkProof,
  signatureValid,
  plonkVkHash,
);

console.log("PLONK verification:", isValid);
```

### 3. Verify STARK Proof (Fibonacci)

```typescript
// STARK proof data
const starkProof = "0x..."; // STARK proof bytes
const fibonacciInputs = "0x..."; // Initial values + final result
const zeroHash =
  "0x0000000000000000000000000000000000000000000000000000000000000000";

// STARK doesn't use VK (transparent setup)
const isValid = await uzkv.verify(
  2, // STARK proof type
  starkProof,
  fibonacciInputs,
  zeroHash, // Not used, pass zero hash
);

console.log("STARK verification:", isValid);
```

---

## 🔧 **Complete Integration Example**

### DeFi Protocol with Multiple Proof Requirements

```typescript
class UniversalVerifierClient {
  private contract: ethers.Contract;

  constructor(contractAddress: string, signer: ethers.Signer) {
    const abi = [
      "function verify(uint8, bytes, bytes, bytes32) external returns (bool)",
      "function register_vk(bytes) external returns (bytes32)",
      "function get_verification_count() external view returns (uint256)",
    ];
    this.contract = new ethers.Contract(contractAddress, abi, signer);
  }

  // Verify any proof type with single function
  async verifyProof(
    proofType: 0 | 1 | 2, // Groth16 | PLONK | STARK
    proof: string,
    publicInputs: string,
    vkHash?: string,
  ): Promise<boolean> {
    const vk = vkHash || ethers.ZeroHash;
    const tx = await this.contract.verify(proofType, proof, publicInputs, vk);
    const receipt = await tx.wait();
    return receipt.status === 1;
  }

  // Complete workflow: Identity → Whitelist → State → Computation → Finalize
  async verifyCompleteWorkflow(
    identityProof: { proof: string; inputs: string; vk: string },
    whitelistProof: { proof: string; inputs: string; vk: string },
    stateProof: { proof: string; inputs: string; vk: string },
    computeProof: { proof: string; inputs: string },
    finalizeProof: { proof: string; inputs: string; vk: string },
  ): Promise<boolean> {
    console.log("Starting universal verification workflow...\n");

    // Step 1: Verify identity (Groth16 + EdDSA)
    console.log("1. Verifying identity (Groth16)...");
    const identity = await this.verifyProof(
      0,
      identityProof.proof,
      identityProof.inputs,
      identityProof.vk,
    );
    if (!identity) throw new Error("Identity verification failed");
    console.log("✅ Identity verified");

    // Step 2: Verify whitelist membership (Groth16 + Merkle)
    console.log("2. Verifying whitelist (Groth16)...");
    const whitelist = await this.verifyProof(
      0,
      whitelistProof.proof,
      whitelistProof.inputs,
      whitelistProof.vk,
    );
    if (!whitelist) throw new Error("Whitelist verification failed");
    console.log("✅ Whitelist verified");

    // Step 3: Verify state transition (PLONK + Poseidon)
    console.log("3. Verifying state transition (PLONK)...");
    const state = await this.verifyProof(
      1,
      stateProof.proof,
      stateProof.inputs,
      stateProof.vk,
    );
    if (!state) throw new Error("State verification failed");
    console.log("✅ State transition verified");

    // Step 4: Verify computation (STARK + Fibonacci)
    console.log("4. Verifying computation integrity (STARK)...");
    const compute = await this.verifyProof(
      2,
      computeProof.proof,
      computeProof.inputs,
    );
    if (!compute) throw new Error("Computation verification failed");
    console.log("✅ Computation verified");

    // Step 5: Finalize transaction (PLONK + EdDSA)
    console.log("5. Finalizing transaction (PLONK)...");
    const finalize = await this.verifyProof(
      1,
      finalizeProof.proof,
      finalizeProof.inputs,
      finalizeProof.vk,
    );
    if (!finalize) throw new Error("Finalization failed");
    console.log("✅ Transaction finalized");

    console.log("\n🎉 Complete workflow verified successfully!");
    return true;
  }

  // Get total verifications across all proof types
  async getVerificationCount(): Promise<bigint> {
    return await this.contract.get_verification_count();
  }
}

// Usage
const verifier = new UniversalVerifierClient(contractAddress, signer);

// Verify individual proofs
await verifier.verifyProof(0, groth16Proof, inputs, vkHash); // Groth16
await verifier.verifyProof(1, plonkProof, inputs, vkHash); // PLONK
await verifier.verifyProof(2, starkProof, inputs); // STARK

// Or verify complete workflow
await verifier.verifyCompleteWorkflow(
  identityProof,
  whitelistProof,
  stateProof,
  computeProof,
  finalizeProof,
);

// Check total verifications
const count = await verifier.getVerificationCount();
console.log(`Total verifications: ${count}`);
```

---

## 🔑 **Setup Process**

### 1. Deploy UZKV Contract

```bash
cd packages/stylus

# Build WASM
cargo build --release --target wasm32-unknown-unknown

# Deploy to Arbitrum Sepolia
cargo stylus deploy \
    --private-key $PRIVATE_KEY \
    --endpoint https://sepolia-rollup.arbitrum.io/rpc
```

### 2. Register Verification Keys

```typescript
// Register Groth16 VK for Poseidon circuit
const groth16VK = "0x..."; // From snarkjs export
const groth16VkHash = await contract.register_vk(groth16VK);
console.log("Groth16 VK registered:", groth16VkHash);

// Register PLONK VK for EdDSA circuit
const plonkVK = "0x...";
const plonkVkHash = await contract.register_vk(plonkVK);
console.log("PLONK VK registered:", plonkVkHash);

// STARK doesn't need VK registration (transparent setup)
```

### 3. Generate and Verify Proofs

```bash
# Generate Groth16 proof
cd packages/circuits
snarkjs groth16 prove build/circuit.zkey witness.wtns proof.json public.json

# Generate PLONK proof
cd packages/plonk-service
npm run generate-proof -- circuit.r1cs witness.wtns

# Generate STARK proof
cd packages/stylus
cargo run --bin generate_stark_proof -- --steps 100 --output proof.json
```

---

## 📊 **Gas Optimization Tips**

### Precomputed Pairings (Groth16)

The contract automatically precomputes pairings when you register a VK, saving ~80k gas per verification.

```typescript
// First time: Register VK (~150k gas)
const vkHash = await contract.register_vk(vkData);

// Subsequent verifications: Only ~280k gas (instead of ~360k)
await contract.verify(0, proof, inputs, vkHash);
```

### Batch Verification

Submit multiple proofs in a single transaction:

```solidity
// Custom batch verification wrapper (Solidity contract calling UZKV)
// The core UZKV is Rust Stylus, but you can wrap it in Solidity
function batchVerify(
    uint8[] calldata proofTypes,
    bytes[] calldata proofs,
    bytes[] calldata publicInputs,
    bytes32[] calldata vkHashes
) external returns (bool) {
    for (uint i = 0; i < proofs.length; i++) {
        bool valid = uzkv.verify(proofTypes[i], proofs[i], publicInputs[i], vkHashes[i]);
        require(valid, "Proof verification failed");
    }
    return true;
}
```

---

## 🛡️ **Security Considerations**

### 1. Nullifier Prevention (Replay Attacks)

```solidity
// Add nullifier tracking in your app (Solidity wrapper around UZKV)
mapping(bytes32 => bool) public usedProofs;

function verifyWithNullifier(
    uint8 proofType,
    bytes calldata proof,
    bytes calldata publicInputs,
    bytes32 vkHash,
    bytes32 nullifier
) external {
    require(!usedProofs[nullifier], "Proof already used");

    // Call UZKV Rust Stylus contract
    bool valid = uzkv.verify(proofType, proof, publicInputs, vkHash);
    require(valid, "Invalid proof");

    usedProofs[nullifier] = true;
}
```

### 2. Circuit Breaker (Emergency Pause)

The Rust Stylus contract has a built-in pause mechanism (admin only).

### 3. VK Registration Access Control

Only register VKs from trusted sources to prevent malicious circuit injection.

### 4. Stylus Gas Efficiency

Rust Stylus provides **10x cheaper computation** compared to EVM Solidity, making verification significantly more cost-effective.

---

## 🔍 **Debugging & Testing**

### Test All Proof Types Locally

```bash
cd packages/stylus

# Test Groth16
cargo test groth16 --release -- --nocapture

# Test PLONK
cargo test plonk --release -- --nocapture

# Test STARK
cargo test stark --release -- --nocapture

# Test universal interface
cargo test universal_verifier_e2e --release -- --nocapture
```

### Check Verification Results

```typescript
// Failed verification returns false (doesn't revert)
const isValid = await contract.verify(0, invalidProof, inputs, vkHash);
if (!isValid) {
  console.log("Proof verification failed");
}

// Check verification count
const count = await contract.get_verification_count();
console.log(`Successful verifications: ${count}`);
```

---

## 📈 **Production Deployment Checklist**

- [ ] Contract deployed to Arbitrum Sepolia/Mainnet
- [ ] All VKs registered for circuits
- [ ] Gas costs benchmarked for all proof types
- [ ] Nullifier system implemented (if needed)
- [ ] Access controls configured
- [ ] Circuit breaker tested
- [ ] Client SDK deployed
- [ ] Documentation complete
- [ ] Monitoring dashboard live

---

## 🎓 **When to Use Which Proof Type**

| Use Case                    | Recommended      | Reason                              |
| --------------------------- | ---------------- | ----------------------------------- |
| **Fast verification**       | Groth16          | Lowest gas (~280k)                  |
| **Flexible circuits**       | PLONK            | Universal setup, one-time ceremony  |
| **No trusted setup**        | STARK            | Transparent, post-quantum ready     |
| **Privacy-preserving auth** | Groth16 + EdDSA  | Fast + proven security              |
| **ZK-Rollups**              | PLONK + Poseidon | Universal setup + efficient hashing |
| **Long-term security**      | STARK + Any      | Post-quantum resistant              |
| **High-throughput**         | Groth16 (batch)  | Lowest per-proof cost               |

---

## 🔗 **Resources**

- **Contract ABI**: `packages/stylus/abi/UZKV.json`
- **TypeScript SDK**: `packages/sdk/`
- **Example Integrations**: `examples/`
- **Gas Benchmarks**: `benchmarks/GAS-BENCHMARK-REPORT.md`
- **Deployment Guide**: `DEPLOYMENT-EXECUTION-PLAN.md`
- **Testing Guide**: `TESTING-GUIDE.md`

---

## 💡 **Key Takeaway**

**One function. Three proof systems. Infinite possibilities.**

```typescript
// That's it! One function for everything.
await uzkv.verify(proofType, proof, publicInputs, vkHash);
```

The Universal ZK Verifier abstracts away the complexity of different proof systems, giving you a simple, unified interface for all your zero-knowledge proof verification needs.

---

**Questions?** Open an issue on GitHub: https://github.com/draxxycodes/Universal-ZKV
