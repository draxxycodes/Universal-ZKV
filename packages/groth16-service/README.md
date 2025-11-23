# Groth16 Verification Service

Off-chain verification service for Groth16 zkSNARK proofs with on-chain attestation.

## Architecture

```
┌─────────────────────┐
│  Client/Frontend    │
└──────────┬──────────┘
           │ POST /verify
           ▼
┌─────────────────────┐
│  Express REST API   │
│  (This Service)     │
├─────────────────────┤
│ 1. Load WASM        │
│ 2. Verify Proof     │
│ 3. Sign Hash        │
│ 4. Submit Attestat. │
└──────────┬──────────┘
           │
           ▼
┌─────────────────────┐
│  Attestor Contract  │
│  (On-Chain)         │
│  0x36e937...        │
└─────────────────────┘
```

## Features

- ✅ **Off-chain Groth16 verification** - No gas costs for proof verification
- ✅ **On-chain attestation** - Permanent proof records on Arbitrum
- ✅ **REST API** - Simple HTTP interface
- ✅ **Rate limiting** - Prevent abuse
- ✅ **Validation** - Input sanitization with Zod
- ✅ **Logging** - Structured logging with Pino
- ✅ **Type-safe** - Full TypeScript coverage

## Quick Start

### Installation

```bash
cd packages/groth16-service
pnpm install
```

### Configuration

```bash
# Copy example environment file
cp .env.example .env

# Edit .env with your values
nano .env
```

Required environment variables:

- `ATTESTOR_CONTRACT` - Deployed attestor contract address
- `ATTESTOR_SIGNER_PRIVATE_KEY` - Private key for signing attestations
- `ARBITRUM_SEPOLIA_RPC` - RPC endpoint for Arbitrum Sepolia

### Development

```bash
# Start development server with hot reload
pnpm dev

# Server will start on http://localhost:3001
```

### Production

```bash
# Build TypeScript
pnpm build

# Start production server
pnpm start
```

## API Endpoints

### POST /verify

Verify a Groth16 proof and attest it on-chain.

**Request:**

```json
{
  "proof": {
    "pi_a": ["0x...", "0x..."],
    "pi_b": [["0x...", "0x..."], ["0x...", "0x..."]],
    "pi_c": ["0x...", "0x..."]
  },
  "publicSignals": ["0x..."],
  "vk": {
    "alpha": ["0x...", "0x..."],
    "beta": [["0x...", "0x..."], ["0x...", "0x..."]],
    "gamma": [["0x...", "0x..."], ["0x...", "0x..."]],
    "delta": [["0x...", "0x..."], ["0x...", "0x..."]],
    "ic": [["0x...", "0x..."], ...]
  }
}
```

**Response (Success):**

```json
{
  "valid": true,
  "proofHash": "0x1234...",
  "attestationTx": "0xabcd...",
  "timestamp": "2025-11-22T10:30:00.000Z"
}
```

**Response (Invalid Proof):**

```json
{
  "valid": false,
  "error": "Proof verification failed",
  "timestamp": "2025-11-22T10:30:00.000Z"
}
```

### GET /health

Health check endpoint.

**Response:**

```json
{
  "status": "healthy",
  "timestamp": "2025-11-22T10:30:00.000Z",
  "uptime": 12345
}
```

### GET /stats

Service statistics.

**Response:**

```json
{
  "totalVerifications": 1234,
  "totalAttestations": 1230,
  "successRate": 0.997,
  "uptime": 86400
}
```

## Testing

```bash
# Run tests
pnpm test

# Run tests with coverage
pnpm test -- --coverage

# Watch mode
pnpm test:watch
```

## WASM Setup

The service requires the compiled Groth16 verifier WASM file:

```bash
# Copy WASM from stylus package
mkdir -p wasm
cp ../stylus/target/wasm32-unknown-unknown/release/uzkv_stylus.wasm wasm/
```

## Security

- Private keys are loaded from environment variables (never committed)
- Helmet.js for HTTP security headers
- Rate limiting to prevent abuse
- Input validation with Zod schemas
- CORS configuration for allowed origins

## Monitoring

Logs are output in JSON format (production) or pretty format (development).

Log levels:

- `trace` - Very detailed debugging
- `debug` - Debugging information
- `info` - General informational messages
- `warn` - Warning messages
- `error` - Error messages
- `fatal` - Fatal errors

## Deployment

### Docker (Recommended)

```bash
# Build Docker image
docker build -t uzkv-groth16-service .

# Run container
docker run -p 3001:3001 --env-file .env uzkv-groth16-service
```

### Manual

```bash
# Build
pnpm build

# Start with PM2
pm2 start dist/server.js --name groth16-service

# Monitor
pm2 logs groth16-service
```

## Troubleshooting

**WASM not loading:**

- Ensure WASM file exists in `wasm/` directory
- Check file permissions
- Verify WASM was built with correct target

**Attestation failing:**

- Verify `ATTESTOR_SIGNER_PRIVATE_KEY` matches the attestor address set in contract
- Check RPC endpoint is accessible
- Ensure contract is initialized

**Rate limiting issues:**

- Adjust `RATE_LIMIT_MAX_REQUESTS` in `.env`
- Implement IP whitelisting for trusted clients

## License

MIT
