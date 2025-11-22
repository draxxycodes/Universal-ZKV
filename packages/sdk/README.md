# @uzkv/sdk

TypeScript SDK for the Universal ZK Verifier (UZKV) platform.

## Installation

```bash
npm install @uzkv/sdk
# or
pnpm add @uzkv/sdk
# or
yarn add @uzkv/sdk
```

## Quick Start

```typescript
import { createUZKVClient } from '@uzkv/sdk';

// Create client
const client = createUZKVClient({
  serviceUrl: 'http://localhost:3001',
  rpcUrl: 'https://sepolia-rollup.arbitrum.io/rpc',
  attestorAddress: '0x36e937ebcf56c5dec6ecb0695001becc87738177',
});

// Verify a proof
const result = await client.verify({
  proof: myProof,
  publicInputs: ['1', '2', '3'],
  vk: verificationKey,
  attestOnChain: true, // Optional: attest on Arbitrum
});

console.log('Valid:', result.valid);
console.log('Proof Hash:', result.proofHash);
console.log('Transaction:', result.attestation?.transactionHash);
```

## API Reference

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
import { createUZKVClient } from '@uzkv/sdk';

const client = createUZKVClient();

const result = await client.verify({
  proof: {
    pi_a: ['...', '...'],
    pi_b: [['...', '...'], ['...', '...']],
    pi_c: ['...', '...'],
    protocol: 'groth16',
    curve: 'bn128',
  },
  publicInputs: ['1'],
  vk: myVerificationKey,
});

if (result.valid) {
  console.log('✅ Proof verified!');
} else {
  console.log('❌ Invalid proof:', result.error);
}
```

### With On-Chain Attestation

```typescript
const result = await client.verify({
  proof: myProof,
  publicInputs: ['1', '2'],
  vk: myVK,
  attestOnChain: true, // Request on-chain attestation
});

if (result.valid && result.attestation?.success) {
  console.log('✅ Proof verified and attested!');
  console.log('TX:', result.attestation.transactionHash);
  console.log('Gas used:', result.attestation.gasUsed);
}
```

### Check Attestation Status

```typescript
const status = await client.getAttestationStatus('0xabc123...');

if (status.isAttested) {
  console.log('Proof was attested at:', status.timestampISO);
} else {
  console.log('Proof not yet attested');
}
```

### Batch Verification

```typescript
const results = await client.verifyBatch([
  { proof: proof1, publicInputs: ['1'], vk: vk1 },
  { proof: proof2, publicInputs: ['2'], vk: vk2 },
  { proof: proof3, publicInputs: ['3'], vk: vk3 },
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
  protocol: 'groth16';
  curve: 'bn128';
}
```

### VerificationKey

```typescript
interface VerificationKey {
  protocol: 'groth16';
  curve: 'bn128';
  nPublic: number;
  vk_alpha_1: [string, string];
  vk_beta_2: [[string, string], [string, string]];
  vk_gamma_2: [[string, string], [string, string]];
  vk_delta_2: [[string, string], [string, string]];
  vk_alphabeta_12: [[[string, string], [string, string]], [[string, string], [string, string]]];
  IC: Array<[string, string]>;
}
```

## License

MIT
