# @uzkv/sdk

TypeScript SDK for the Universal ZK Verifier (UZKV) platform.

## Features

- ✅ **Universal Proof Protocol** - Frozen binary format for Groth16, PLONK, and STARK proofs
- ✅ **UPD v2 (Universal Proof Descriptor)** - Self-describing 75-byte proof header with gas estimation
- ✅ **Cost-Aware Verification** - Pre-verification gas estimation and path selection
- ✅ **Security Formalization** - Dispatch validation with formal threat model
- ✅ **Type-Safe** - Full TypeScript support with comprehensive types
- ✅ **Cross-Language Compatible** - Byte-for-byte encoding matches Rust implementation
- ✅ **Fully Tested** - 103 unit tests covering all scenarios
- ✅ **Viem Integration** - Ready for on-chain interactions with Arbitrum Stylus

## Installation

```bash
npm install @uzkv/sdk
# or
pnpm add @uzkv/sdk
# or
yarn add @uzkv/sdk
```

## Quick Start

### Using Universal Proof Protocol Types

```typescript
import { ProofType, PublicStatement, UniversalProof } from "@uzkv/sdk";

// Create a public statement
const statement = new PublicStatement({
  merkleRoot: new Uint8Array(32).fill(0x11), // State tree root
  publicKey: new Uint8Array(32).fill(0x22), // EdDSA public key
  nullifier: new Uint8Array(32).fill(0x33), // Anti-replay nullifier
  value: 12345n, // Amount or ID
  extra: new Uint8Array([0xde, 0xad]), // Optional metadata
});

// Create a universal proof
const proof = UniversalProof.withStatement({
  proofType: ProofType.Groth16,
  programId: 0, // Circuit identifier
  vkHash: new Uint8Array(32).fill(0xab), // VK hash from registry
  proofBytes: groth16ProofBytes, // Your Groth16 proof
  publicStatement: statement,
});

// Encode for on-chain submission
const encodedProof = proof.encode();
await verifierContract.verify(encodedProof);
```

### Using Legacy Groth16 Client

```typescript
import { createUZKVClient } from "@uzkv/sdk";

// Create client
const client = createUZKVClient({
  serviceUrl: "http://localhost:3001",
  rpcUrl: "https://sepolia-rollup.arbitrum.io/rpc",
  attestorAddress: "0x36e937ebcf56c5dec6ecb0695001becc87738177",
});

// Verify a proof
const result = await client.verify({
  proof: myProof,
  publicInputs: ["1", "2", "3"],
  vk: verificationKey,
  attestOnChain: true, // Optional: attest on Arbitrum
});

console.log("Valid:", result.valid);
console.log("Proof Hash:", result.proofHash);
console.log("Transaction:", result.attestation?.transactionHash);
```

## Universal Proof Protocol API

### ProofType Enum

```typescript
enum ProofType {
  Groth16 = 0, // Trusted setup, ~280k gas, ~128 byte proofs
  PLONK = 1, // Universal setup, ~400k gas, ~800 byte proofs
  STARK = 2, // Transparent, ~540k gas, ~40-100 KB proofs
}
```

### PublicStatement Class

```typescript
class PublicStatement {
  constructor(params: {
    merkleRoot: Uint8Array; // 32 bytes - State tree root
    publicKey: Uint8Array; // 32 bytes - EdDSA public key
    nullifier: Uint8Array; // 32 bytes - Anti-replay value
    value: bigint; // u128 - Application-specific value
    extra?: Uint8Array; // Optional extension data
  });

  encode(): Uint8Array;
  static decode(bytes: Uint8Array): PublicStatement;
  encodedSize(): number;
}
```

### UniversalProof Class

```typescript
class UniversalProof {
  constructor(params: {
    version?: number;
    proofType: ProofType;
    programId: number;
    vkHash: Uint8Array;
    proofBytes: Uint8Array;
    publicInputsBytes: Uint8Array;
  });

  static withStatement(params: {
    proofType: ProofType;
    programId: number;
    vkHash: Uint8Array;
    proofBytes: Uint8Array;
    publicStatement: PublicStatement;
  }): UniversalProof;

  encode(): Uint8Array;
  static decode(bytes: Uint8Array): UniversalProof;
  decodePublicStatement(): PublicStatement;
  encodedSize(): number;
}
```

### UniversalProofDescriptor Class (UPD v2)

Self-describing 75-byte proof header for safe dispatch and cost prediction.

```typescript
import { UniversalProofDescriptor, CurveId, HashFunctionId } from "@uzkv/sdk";

// Create using convenience constructors
const descriptor = UniversalProofDescriptor.groth16(4, vkCommitment, circuitId);

// Estimate gas before verification
const gasEstimate = descriptor.estimateGas(); // Returns bigint

// Validate before dispatch
descriptor.validate(); // Throws on invalid

// Encode for transmission
const encoded = descriptor.encode(); // 75 bytes
const decoded = UniversalProofDescriptor.decode(encoded);
```

### VerificationCost Class (Cost Model)

Gas estimation and verification path selection.

```typescript
import {
  VerificationCost,
  compareCosts,
  selectCheapest,
  shouldVerify,
  estimateBatchCost,
} from "@uzkv/sdk";

// Calculate costs for different proof types
const groth16Cost = VerificationCost.forGroth16(4); // 4 public inputs
const plonkCost = VerificationCost.forPlonk(4);
const starkCost = VerificationCost.forStark(1024, 100);

// Compare costs
console.log("Groth16 cheaper:", groth16Cost.cheaperThan(plonkCost));
console.log("Savings:", groth16Cost.savingsVs(plonkCost), "gas");

// Select cheapest path
const options = [groth16Cost, plonkCost, starkCost];
const cheapestIndex = selectCheapest(options); // Returns index

// Budget-aware routing
if (shouldVerify(groth16Cost, 500_000n, 10)) {
  // Proceed with verification (10% safety margin)
}

// Batch cost with discounts (5% per additional proof, max 30%)
const batchTotal = estimateBatchCost([groth16Cost, groth16Cost, groth16Cost]);
```

### DispatchValidator Class (Security)

Dispatch boundary security validation.

```typescript
import {
  DispatchValidator,
  RegisteredVK,
  SecurityModel,
  SecurityError,
} from "@uzkv/sdk";

// Create validator
const validator = DispatchValidator.default(); // or .strict() for high-value ops

// Register VK metadata
const registeredVK = new RegisteredVK({
  proofType: ProofType.Groth16,
  vkHash: vkHashBytes,
  circuitId: circuitIdBytes,
  curveId: CurveId.BN254,
  maxPublicInputs: 16,
});

// Validate before dispatch
try {
  validator.validateAll(descriptor, registeredVK, SecurityModel.groth16Bn254());
  // Safe to proceed
} catch (error) {
  if (error.code === SecurityError.ProofTypeMismatch) {
    // Handle specific error
  }
}
```

## Legacy Groth16 Client API

### `createUZKVClient(config?)`

Create a new UZKV client instance.

**Parameters:**

- `config.serviceUrl` (optional): URL of the verification service (default: `http://localhost:3001`)
- `config.rpcUrl` (optional): Arbitrum Sepolia RPC URL
- `config.attestorAddress` (optional): Attestor contract address

**Returns:** `UZKVClient` instance

### `client.verify(request)`

Verify a Groth16 proof.

**Parameters:**

- `request.proof`: Groth16 proof object
- `request.publicInputs`: Array of public inputs (as strings)
- `request.vk`: Verification key
- `request.attestOnChain` (optional): Whether to attest on-chain (default: false)

**Returns:** Promise<VerifyResponse>

### `client.verifyBatch(requests)`

Verify multiple proofs in batch.

**Parameters:**

- `requests`: Array of verify requests

**Returns:** Promise with batch results

### `client.getAttestationStatus(proofHash)`

Check if a proof has been attested on-chain.

**Parameters:**

- `proofHash`: Proof hash (0x-prefixed hex string)

**Returns:** Promise<AttestationStatus>

### `client.getAttestationEvents(proofHash?)`

Get attestation events from the contract.

**Parameters:**

- `proofHash` (optional): Filter by specific proof hash

**Returns:** Promise with array of events

### `client.healthCheck()`

Check service health.

**Returns:** Promise with health status

## Examples

### Basic Verification

```typescript
import { createUZKVClient } from "@uzkv/sdk";

const client = createUZKVClient();

const result = await client.verify({
  proof: {
    pi_a: ["...", "..."],
    pi_b: [
      ["...", "..."],
      ["...", "..."],
    ],
    pi_c: ["...", "..."],
    protocol: "groth16",
    curve: "bn128",
  },
  publicInputs: ["1"],
  vk: myVerificationKey,
});

if (result.valid) {
  console.log("✅ Proof verified!");
} else {
  console.log("❌ Invalid proof:", result.error);
}
```

### With On-Chain Attestation

```typescript
const result = await client.verify({
  proof: myProof,
  publicInputs: ["1", "2"],
  vk: myVK,
  attestOnChain: true, // Request on-chain attestation
});

if (result.valid && result.attestation?.success) {
  console.log("✅ Proof verified and attested!");
  console.log("TX:", result.attestation.transactionHash);
  console.log("Gas used:", result.attestation.gasUsed);
}
```

### Check Attestation Status

```typescript
const status = await client.getAttestationStatus("0xabc123...");

if (status.isAttested) {
  console.log("Proof was attested at:", status.timestampISO);
} else {
  console.log("Proof not yet attested");
}
```

### Batch Verification

```typescript
const results = await client.verifyBatch([
  { proof: proof1, publicInputs: ["1"], vk: vk1 },
  { proof: proof2, publicInputs: ["2"], vk: vk2 },
  { proof: proof3, publicInputs: ["3"], vk: vk3 },
]);

console.log(`${results.validProofs}/${results.totalProofs} proofs valid`);
```

## Types

### Groth16Proof

```typescript
interface Groth16Proof {
  pi_a: [string, string];
  pi_b: [[string, string], [string, string]];
  pi_c: [string, string];
  protocol: "groth16";
  curve: "bn128";
}
```

### VerificationKey

```typescript
interface VerificationKey {
  protocol: "groth16";
  curve: "bn128";
  nPublic: number;
  vk_alpha_1: [string, string];
  vk_beta_2: [[string, string], [string, string]];
  vk_gamma_2: [[string, string], [string, string]];
  vk_delta_2: [[string, string], [string, string]];
  vk_alphabeta_12: [
    [[string, string], [string, string]],
    [[string, string], [string, string]],
  ];
  IC: Array<[string, string]>;
}
```

## License

MIT
