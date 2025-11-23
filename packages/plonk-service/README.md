# PLONK Verification Service

Off-chain PLONK proof verification service with on-chain attestation support.

## Overview

**Contract Size**: 36.8 KiB (37,708 bytes)  
**Deployment Strategy**: Off-chain (exceeds 24KB Arbitrum Stylus limit)  
**Proof System**: PLONK with KZG polynomial commitments  
**Elliptic Curve**: BN254 (alt_bn128)  
**Attestor Contract**: `0x36e937ebcf56c5dec6ecb0695001becc87738177` (Arbitrum Sepolia)

## Why Off-Chain?

The compiled PLONK verifier WASM module is 36.8KB after optimization, which exceeds the Arbitrum Stylus 24KB contract size limit. This service provides off-chain verification with on-chain attestation as an alternative deployment strategy.

## Architecture

```
┌─────────────────┐       ┌──────────────────┐       ┌────────────────┐
│  Client/DApp    │ ────> │  PLONK Service   │ ────> │  WASM Verifier │
│  (Web3)         │       │  (Express API)   │       │  (Rust/Stylus) │
└─────────────────┘       └──────────────────┘       └────────────────┘
         │                         │
         │                         ▼
         │                ┌──────────────────┐
         └───────────────>│ Attestor Contract│
                          │  (Arbitrum)      │
                          └──────────────────┘
```

## Installation

```bash
# Install dependencies
pnpm install

# Copy environment configuration
cp .env.example .env

# Edit .env with your configuration
# - Set ATTESTOR_PRIVATE_KEY for attestation (optional)
# - Configure RPC_URL and other settings
```

## Configuration

### Environment Variables

- `PORT`: Service port (default: 3002)
- `LOG_LEVEL`: Logging level (default: info)
- `RPC_URL`: Arbitrum Sepolia RPC endpoint
- `ATTESTOR_ADDRESS`: Attestor contract address
- `ATTESTOR_PRIVATE_KEY`: Private key for submitting attestations (optional)
- `WASM_PATH`: Path to PLONK WASM module
- `MAX_PROOF_SIZE`: Maximum proof size in bytes (default: 10240)
- `MAX_PUBLIC_INPUTS`: Maximum number of public inputs (default: 256)

### WASM Module

The service loads the PLONK verification WASM module from:

```
../../stylus/target/wasm32-unknown-unknown/release/uzkv_stylus.wasm
```

Ensure the WASM module is built before starting the service:

```bash
cd ../stylus
cargo build --release --target wasm32-unknown-unknown
cd ../plonk-service
```

## Usage

### Development

```bash
# Start development server with hot reload
pnpm dev
```

### Production

```bash
# Build TypeScript
pnpm build

# Start production server
pnpm start
```

### Testing

```bash
# Run tests
pnpm test

# Run tests with coverage
pnpm test -- --coverage

# Run tests in watch mode
pnpm test:watch
```

## API Endpoints

### `POST /verify`

Verify a single PLONK proof.

**Request**:

```json
{
  "proof": "0x...",
  "publicInputs": "0x...",
  "vkHash": "0x..."
}
```

**Response**:

```json
{
  "isValid": true,
  "proofHash": "0x...",
  "verificationTime": 150,
  "proofSystem": "PLONK",
  "curve": "BN254",
  "timestamp": "2025-11-22T10:30:00.000Z"
}
```

### `POST /verify/batch`

Verify multiple PLONK proofs.

**Request**:

```json
{
  "proofs": [
    {
      "proof": "0x...",
      "publicInputs": "0x...",
      "vkHash": "0x..."
    },
    ...
  ]
}
```

**Response**:

```json
{
  "results": [
    {
      "proofHash": "0x...",
      "isValid": true,
      "error": null
    },
    ...
  ],
  "summary": {
    "total": 10,
    "successful": 9,
    "failed": 1
  },
  "verificationTime": 1500,
  "proofSystem": "PLONK",
  "timestamp": "2025-11-22T10:30:00.000Z"
}
```

### `GET /attestation/:proofHash`

Get attestation status for a proof.

**Response**:

```json
{
  "proofHash": "0x...",
  "isValid": true,
  "timestamp": "2025-11-22T10:30:00.000Z",
  "proofType": "PLONK"
}
```

### `GET /attestation/events`

Get recent attestation events from the blockchain.

**Response**:

```json
{
  "count": 5,
  "events": [
    {
      "proofHash": "0x...",
      "isValid": true,
      "proofType": "PLONK",
      "timestamp": "2025-11-22T10:30:00.000Z",
      "blockNumber": 12345678,
      "transactionHash": "0x..."
    },
    ...
  ]
}
```

### `GET /health`

Health check endpoint.

**Response**:

```json
{
  "status": "healthy",
  "timestamp": "2025-11-22T10:30:00.000Z",
  "wasmInitialized": true,
  "proofSystem": "PLONK",
  "curve": "BN254",
  "wasmSize": "36.8 KiB",
  "uptime": 3600
}
```

### `GET /metrics`

Service metrics endpoint.

**Response**:

```json
{
  "service": "plonk-verification",
  "version": "0.1.0",
  "wasmSize": 37708,
  "maxProofSize": 10240,
  "maxPublicInputs": 256,
  "deploymentStrategy": "off-chain",
  "reason": "WASM size 36.8KB exceeds 24KB Stylus limit",
  "uptime": 3600,
  "timestamp": "2025-11-22T10:30:00.000Z"
}
```

## Security Features

- **Rate Limiting**: 100 requests per minute per IP
- **Input Validation**: Zod schema validation for all endpoints
- **Size Limits**: Proof size limited to 10KB by default
- **CORS**: Configurable cross-origin resource sharing
- **Helmet**: Security headers middleware
- **Request Logging**: Pino structured logging

## Performance

- **Verification Time**: ~100-200ms per proof (single-threaded)
- **Batch Processing**: Parallel verification of multiple proofs
- **Memory Usage**: ~50MB baseline + ~5MB per concurrent verification

## Attestation

The service can optionally submit verification results to the on-chain attestor contract for permanent record-keeping. This provides:

- **Immutable Record**: All verifications recorded on Arbitrum
- **Proof History**: Query past verification results
- **Transparency**: Public verification audit trail
- **Integration**: Smart contracts can query attestation status

To enable attestation, set `ATTESTOR_PRIVATE_KEY` in `.env`.

## Troubleshooting

### WASM Module Not Found

Ensure the WASM module is built:

```bash
cd ../stylus
cargo build --release --target wasm32-unknown-unknown
```

### Attestation Fails

Check:

- `ATTESTOR_PRIVATE_KEY` is set and valid
- Wallet has sufficient Arbitrum Sepolia ETH for gas
- RPC endpoint is accessible
- Attestor contract address is correct

### Verification Always Fails

Verify:

- Proof format matches PLONK specification
- Public inputs are correctly serialized
- VK hash corresponds to the circuit
- WASM module is up-to-date

## Development

### Project Structure

```
plonk-service/
├── src/
│   ├── server.ts           # Express server setup
│   ├── routes/
│   │   └── verify.ts       # Verification endpoints
│   └── utils/
│       ├── wasm-loader.ts  # WASM module interface
│       └── attestor.ts     # On-chain attestation
├── test/
│   └── verify.test.ts      # Integration tests
├── package.json
├── tsconfig.json
├── vitest.config.ts
└── README.md
```

### Adding Tests

Tests use Vitest and Supertest:

```typescript
import { describe, it, expect } from "vitest";
import request from "supertest";
import app from "../src/server";

describe("POST /verify", () => {
  it("should verify valid proof", async () => {
    const response = await request(app).post("/verify").send({
      proof: "0x...",
      publicInputs: "0x...",
      vkHash: "0x...",
    });

    expect(response.status).toBe(200);
    expect(response.body.isValid).toBe(true);
  });
});
```

## License

MIT

## Related Documentation

- [PLONK Design Document](../../docs/PLONK-DESIGN.md)
- [Task 2.4 Completion Report](../../execution_steps_details/task-2.4-plonk-verifier-core-completion.md)
- [Phase 2 Progress Tracking](../../docs/PHASE-2-PLONK-PROGRESS.md)
- [Stylus PLONK Implementation](../stylus/src/plonk/)
