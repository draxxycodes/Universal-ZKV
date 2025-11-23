# Task 2.9: Integration Tests & Benchmarking

**Status**: ✅ Test Suite Created | ⏳ Awaiting Task 2.8 Completion

## Overview

Comprehensive integration testing and performance benchmarking for the PLONK verification service. Tests verify the complete proof generation → verification → attestation workflow and measure performance characteristics across all circuits.

## Test Structure

```
packages/plonk-service/test/
├── integration/
│   ├── verify.test.ts          # API verification tests
│   └── attestor.test.ts        # Attestor contract integration
├── e2e/
│   └── workflow.test.ts        # End-to-end workflows
└── performance/
    └── profiling.test.ts       # Performance profiling suite
```

## Test Suites

### 1. Integration Tests: Verification API (`verify.test.ts`)

Tests the `/verify` and `/verify/batch` endpoints with real PLONK proofs from the test corpus.

**Test Coverage**:

- ✅ Single proof verification (all 3 circuits)
- ✅ Valid proof acceptance
- ✅ Invalid proof rejection
- ✅ Tampered public signal detection
- ✅ Batch verification (5-50 proofs)
- ✅ Mixed valid/invalid batch handling
- ✅ Cross-circuit batch verification
- ✅ Error handling (malformed proofs, invalid circuits)
- ✅ Concurrent request handling (10-50 concurrent)
- ✅ Performance benchmarking (per-circuit timing)

**Key Tests**:

```typescript
// Verify valid Poseidon proof
POST /verify
{
  circuitType: 'poseidon_test',
  proof: { ... },
  publicSignals: [ ... ]
}
→ { verified: true, proofHash: '0x...', verificationTime: 450 }

// Batch verification (50 proofs)
POST /verify/batch
{ proofs: [ ... ] }
→ { results: [...], summary: { total: 50, verified: 48, failed: 2 } }
```

### 2. Integration Tests: Attestor Contract (`attestor.test.ts`)

Tests interaction with the on-chain attestor contract on Arbitrum Sepolia.

**Test Coverage**:

- ✅ Attestation submission after verification
- ✅ Attestation status queries by proof hash
- ✅ Attestation event retrieval and filtering
- ✅ Time-range filtering
- ✅ Pagination
- ✅ Error handling (invalid proof hash, large limits)
- ✅ Attestor contract health check

**Key Tests**:

```typescript
// Verify and submit attestation
POST /verify
{
  circuitType: 'poseidon_test',
  proof: { ... },
  publicSignals: [ ... ],
  submitAttestation: true
}
→ { verified: true, attestation: { submitted: true, txHash: '0x...' } }

// Query attestation status
GET /attestation/0x1234...
→ { proofHash: '0x1234...', attested: true, timestamp: 1234567890, blockNumber: 12345 }
```

### 3. End-to-End Tests (`workflow.test.ts`)

Tests complete workflows from input generation through proof generation to verification.

**Test Coverage**:

- ✅ Poseidon workflow: generate input → PLONK proof → verify
- ✅ EdDSA workflow: generate signature → PLONK proof → verify
- ✅ Merkle workflow: generate proof → PLONK proof → verify
- ✅ Batch workflow: generate 5 inputs → proofs → batch verify
- ✅ Error recovery: invalid inputs, corrupted proofs
- ✅ Performance benchmarks: full workflow timing (10 iterations)

**Workflow Example**:

```bash
# Step 1: Generate test input
node scripts/generate-test-inputs.cjs 1

# Step 2: Generate PLONK proof
node scripts/plonk-cli.cjs generate poseidon_test input_1.json output/

# Step 3: Verify via API
POST /verify { circuitType, proof, publicSignals }

# Result: ✓ Verified in < 3 seconds total
```

### 4. Performance Profiling (`profiling.test.ts`)

Comprehensive performance testing with detailed metrics and reporting.

**Test Coverage**:

- ✅ Single proof verification latency (n=100 per circuit)
- ✅ Batch verification performance (10, 50 proofs)
- ✅ Batch efficiency analysis (1-50 batch sizes)
- ✅ Concurrent request handling (10, 50 concurrent)
- ✅ Memory usage analysis
- ✅ Memory leak detection
- ✅ Latency under sustained load (30 seconds)
- ✅ Maximum throughput measurement

**Performance Metrics Collected**:

- Min/Max/Mean latency
- P95/P99 percentiles
- Standard deviation
- Throughput (proofs/sec)
- Memory usage (heap, RSS)
- Batch efficiency ratios

**Report Output**:

```json
{
  "timestamp": "2025-01-27T...",
  "performanceMetrics": [
    {
      "circuit": "poseidon_test",
      "operation": "single_verification",
      "samples": 100,
      "mean": 485.23,
      "p95": 612.45,
      "p99": 678.9,
      "stdDev": 45.67
    }
  ],
  "summary": {
    "poseidon_test": {
      "single_verification": { "mean": "485.23ms", "p95": "612.45ms" },
      "batch_50": { "mean": "18.5s", "p95": "19.2s" }
    }
  }
}
```

## Running Tests

### Prerequisites

**Task 2.8 MUST be complete** - Test corpus generation must finish before running tests:

```bash
# Check corpus status
cd packages/circuits
find proofs/plonk -name "proof.json" | wc -l  # Should be 750

# Verify catalog exists
cat test-corpus-catalog.json
```

### Environment Setup

Create `.env` file in `packages/plonk-service/`:

```bash
# Required
PORT=3002
NODE_ENV=test

# Optional (for attestor tests)
ATTESTOR_ADDRESS=0x36e937ebcf56c5dec6ecb0695001becc87738177
PRIVATE_KEY=your_private_key_here
RPC_URL=https://sepolia-rollup.arbitrum.io/rpc

# Performance tuning
RATE_LIMIT_MAX_REQUESTS=1000
RATE_LIMIT_WINDOW_MS=60000
```

### Run All Tests

```bash
cd packages/plonk-service

# Install dependencies
pnpm install

# Run all test suites
pnpm test

# Run specific suite
pnpm test integration
pnpm test e2e
pnpm test performance

# Run with coverage
pnpm test --coverage

# Watch mode (during development)
pnpm test:watch
```

### Run Individual Tests

```bash
# Integration tests only
pnpm vitest test/integration/verify.test.ts

# Performance profiling (generates report)
pnpm vitest test/performance/profiling.test.ts

# End-to-end workflows
pnpm vitest test/e2e/workflow.test.ts
```

### Performance Profiling

```bash
# Run with garbage collection enabled (for memory tests)
node --expose-gc ./node_modules/.bin/vitest test/performance/profiling.test.ts

# Generate performance report
pnpm vitest test/performance/profiling.test.ts
# Output: packages/plonk-service/performance-report.json
```

## Expected Results

### Test Metrics

**Poseidon Circuit** (601 constraints):

- Single verification: < 1000ms
- Batch 50 verification: < 20 seconds
- Throughput: > 10 verifications/sec

**EdDSA Circuit** (23,793 constraints):

- Single verification: < 1500ms
- Batch 50 verification: < 30 seconds
- Throughput: > 5 verifications/sec

**Merkle Circuit** (12,886 constraints):

- Single verification: < 1200ms
- Batch 50 verification: < 25 seconds
- Throughput: > 8 verifications/sec

### Success Criteria

- ✅ All 100+ integration tests pass
- ✅ Valid proofs verify correctly (100% success rate)
- ✅ Invalid proofs reject correctly (100% detection rate)
- ✅ Batch verification handles mixed valid/invalid
- ✅ Concurrent requests (50) complete without errors
- ✅ Memory growth < 50MB for 100 verifications
- ✅ P99 latency < 2.5x mean latency
- ✅ Test coverage > 80%

## Troubleshooting

### Test Corpus Missing

**Error**: `ENOENT: no such file or directory ... proofs/plonk/poseidon_test/batch/proof_1`

**Solution**: Wait for Task 2.8 corpus generation to complete (~30-45 minutes)

```bash
cd packages/circuits
ps aux | grep generate-test-corpus  # Check if still running
```

### WASM Initialization Failure

**Error**: `Failed to initialize WASM verifier`

**Solution**: Build WASM verifier first

```bash
cd packages/plonk-verifier
cargo build --release --target wasm32-unknown-unknown
```

### Attestor Connection Issues

**Error**: `Attestor contract not accessible`

**Solution**: Attestor tests are optional - they skip if no RPC configured. To enable:

```bash
# Set environment variables
export ATTESTOR_ADDRESS=0x36e937ebcf56c5dec6ecb0695001becc87738177
export PRIVATE_KEY=your_key_here
export RPC_URL=https://sepolia-rollup.arbitrum.io/rpc
```

### Performance Tests Timeout

**Error**: `Test timeout of 30000ms exceeded`

**Solution**: Increase timeout in `vitest.config.ts`:

```typescript
export default defineConfig({
  test: {
    testTimeout: 60000, // Increase to 60 seconds
  },
});
```

### Memory Tests Fail

**Error**: Memory growth exceeds threshold

**Solution**: Run with GC enabled:

```bash
node --expose-gc ./node_modules/.bin/vitest test/performance/profiling.test.ts
```

## Performance Report

After running performance tests, view the detailed report:

```bash
cat packages/plonk-service/performance-report.json
```

**Report Contents**:

- Per-circuit verification timings
- Batch efficiency analysis
- Memory usage snapshots
- Throughput benchmarks
- Latency percentiles (P95, P99)

## Test Coverage

Generate coverage report:

```bash
pnpm test --coverage

# View HTML report
open coverage/index.html  # macOS
xdg-open coverage/index.html  # Linux
start coverage/index.html  # Windows
```

**Coverage Targets**:

- Line coverage: > 80%
- Branch coverage: > 75%
- Function coverage: > 85%

## Next Steps (After Tests Pass)

1. **Review Performance Report**: Analyze bottlenecks
2. **Optimize Hot Paths**: Improve P95/P99 latencies if needed
3. **Document Findings**: Update benchmarks in docs
4. **Phase 2 Completion**: Finalize all Phase 2 documentation
5. **Deploy Service**: Consider staging deployment

## Dependencies

- Task 2.8 MUST be complete (750 proofs generated)
- PLONK verifier WASM built (`plonk-verifier/target/wasm32-unknown-unknown/release/`)
- Service dependencies installed (`pnpm install`)
- (Optional) Arbitrum Sepolia RPC access for attestor tests

## Test Duration

**Estimated Runtime**:

- Integration tests: ~5-10 minutes
- E2E workflow tests: ~10-15 minutes
- Performance profiling: ~10-15 minutes
- **Total**: ~25-40 minutes

**Parallel Execution**: Tests can run in parallel with `vitest --threads`

## Files Created

✅ `test/integration/verify.test.ts` (300+ lines)
✅ `test/integration/attestor.test.ts` (200+ lines)
✅ `test/e2e/workflow.test.ts` (350+ lines)
✅ `test/performance/profiling.test.ts` (400+ lines)

**Total**: 1250+ lines of comprehensive test coverage

---

**Task Status**: Test suite ready. Waiting for Task 2.8 test corpus generation to complete before execution.
