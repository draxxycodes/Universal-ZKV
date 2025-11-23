# Integration Tests

Comprehensive test suite for the Groth16 verification service.

## Test Coverage

### 1. API Endpoint Tests (`api.test.ts`)

- ✅ GET /health - Health check endpoint
- ✅ POST /verify - Single proof verification
  - Valid proof verification
  - Invalid proof rejection
  - Missing fields handling
  - Malformed JSON handling
- ✅ POST /verify/batch - Batch verification
  - Multiple proof verification
  - Empty batch rejection
  - Batch size limit enforcement (100 proofs max)
  - Mixed valid/invalid proofs
- ✅ GET /attestation/:proofHash - Attestation status
  - Valid hash format
  - Invalid hash rejection
- ✅ GET /attestation/events - Event fetching
  - All events retrieval
  - Filtering by proof hash

### 2. Proof Validation Tests (`validation.test.ts`)

- ✅ Valid proof verification
- ✅ Proof hash consistency
- ✅ Gas estimate validation
- ✅ Invalid protocol rejection
- ✅ Invalid curve rejection
- ✅ Malformed proof components (pi_a, pi_b, pi_c)
- ✅ Missing field detection
- ✅ Verification key validation
- ✅ Public inputs handling

### 3. Attestor Integration Tests (`attestor.test.ts`)

- ✅ Attestation status checks
- ✅ Unattested proof handling
- ✅ Timestamp validation for attested proofs
- ✅ Event fetching and filtering
- ✅ Gas estimation
- ✅ Error handling (invalid hash, RPC errors, bad contract)
- ✅ Read-only attestation flow

### 4. Performance Benchmarks (`benchmark.test.ts`)

- ✅ Single proof verification timing
- ✅ Cold vs warm performance
- ✅ Batch verification performance
- ✅ Batch scaling efficiency
- ✅ Gas estimation performance
- ✅ Attestation status check performance
- ✅ Stress testing (50+ consecutive verifications)
- ✅ Comprehensive benchmark reporting

### 5. SDK Client Tests (`sdk.test.ts`)

- ✅ Client creation with default/custom config
- ✅ verify() method
- ✅ verifyBatch() method
- ✅ getAttestationStatus() method
- ✅ getAttestationEvents() method
- ✅ healthCheck() method
- ✅ getServiceInfo() method
- ✅ Error handling and network errors
- ✅ Type safety validation
- ✅ Concurrent request handling
- ✅ End-to-end latency measurement

## Running Tests

### All Tests

```bash
cd packages/groth16-service
pnpm test
```

### Watch Mode

```bash
pnpm test:watch
```

### Specific Test File

```bash
pnpm test api.test.ts
pnpm test validation.test.ts
pnpm test attestor.test.ts
pnpm test benchmark.test.ts
pnpm test sdk.test.ts
```

### With Coverage

```bash
pnpm test --coverage
```

## Test Fixtures

Located in `test/fixtures/`:

- `valid-proof.json` - Sample Groth16 proof for testing
- `verification-key.json` - Sample verification key

## Environment Configuration

Tests use environment variables from `.env`:

```env
RPC_URL=https://sepolia-rollup.arbitrum.io/rpc
ATTESTOR_ADDRESS=0x36e937ebcf56c5dec6ecb0695001becc87738177
```

## Expected Results

### Test Statistics

- **Total Tests**: 80+
- **API Tests**: 20+
- **Validation Tests**: 15+
- **Attestor Tests**: 15+
- **Benchmark Tests**: 10+
- **SDK Tests**: 20+

### Performance Targets

- Single verification: < 50ms
- Batch improvement: > 30%
- Gas estimation: < 5s
- Status check: < 5s
- SDK latency: < 1s

## Continuous Integration

Tests are designed to run in CI/CD pipelines:

- No external dependencies required for basic tests
- Attestor tests use read-only RPC calls
- Benchmarks provide performance regression detection

## Test Structure

```
test/
├── api.test.ts          # REST API endpoint tests
├── validation.test.ts   # Proof validation logic
├── attestor.test.ts     # On-chain integration
├── benchmark.test.ts    # Performance benchmarks
├── sdk.test.ts          # TypeScript SDK tests
└── fixtures/
    ├── valid-proof.json
    └── verification-key.json
```

## Writing New Tests

### Example Test

```typescript
import { describe, it, expect } from "vitest";
import { wasmVerifier } from "../src/utils/wasm-loader.js";

describe("My Feature", () => {
  it("should do something", async () => {
    const result = await wasmVerifier.verify(/* ... */);
    expect(result.isValid).toBe(true);
  });
});
```

### Best Practices

1. Use descriptive test names
2. Test both success and failure cases
3. Include error handling tests
4. Measure performance for critical paths
5. Use fixtures for test data
6. Clean up resources in afterAll/afterEach

## Troubleshooting

### Tests Failing

- Ensure dependencies are installed: `pnpm install`
- Check environment variables are set
- Verify RPC_URL is accessible
- Check WASM module is compiled

### Slow Tests

- Attestor tests may be slow due to RPC calls
- Use `--reporter=verbose` for detailed output
- Check network connectivity

### Coverage Issues

- Run `pnpm test --coverage --reporter=html`
- Open `coverage/index.html` in browser
- Target: > 80% coverage

## Integration with CI/CD

Example GitHub Actions workflow:

```yaml
name: Tests
on: [push, pull_request]
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: pnpm/action-setup@v2
      - name: Install dependencies
        run: pnpm install
      - name: Run tests
        run: pnpm test --coverage
      - name: Upload coverage
        uses: codecov/codecov-action@v3
```

## Next Steps

1. Add more test fixtures from the 30,000+ proof corpus
2. Implement integration tests with running service
3. Add load testing scenarios
4. Create visual regression tests for benchmarks
5. Set up automated performance tracking
