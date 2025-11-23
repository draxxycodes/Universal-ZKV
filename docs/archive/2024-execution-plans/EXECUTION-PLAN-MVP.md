# 🚀 UZKV Universal Verifier - Production Execution Plan

**Project**: Universal ZK Verifier - Full Multi-Proof System (Groth16 + PLONK + STARK)  
**Timeline**: 16 Weeks (Full-Time Equivalent)  
**Start Date**: November 22, 2025  
**Target Launch**: March 15, 2026  
**Budget**: Sepolia gas fees only (~$100-200 total)  
**Architecture**: Stylus-based on-chain + off-chain hybrid model

---

## 📋 Executive Summary

### What We're Building

**VISION**: True Universal ZK Verifier supporting **Groth16, PLONK, and STARK** proofs  
**REALITY**: Hybrid architecture leveraging Stylus where possible, off-chain where necessary

**Architecture**:

```
┌──────────────────────────────────────────────────────────────────┐
│                    UNIVERSAL ZK VERIFIER                          │
├──────────────────────────────────────────────────────────────────┤
│  User → Proof Submission → Router                                │
│                                ↓                                  │
│         ┌──────────────────────┼──────────────────────┐         │
│         ↓                      ↓                       ↓         │
│   GROTH16 (Stylus)      PLONK (Hybrid)        STARK (Off-Chain)  │
│   - On-chain VK         - Stylus KZG          - WASM Service     │
│   - 7KB contract        - Off-chain prover    - Attestor record  │
│   - ~60k gas            - ~120k gas           - ~$0.10/proof     │
│         ↓                      ↓                       ↓         │
│   Attestor Contract ← Proof Attestation → On-Chain Record        │
└──────────────────────────────────────────────────────────────────┘
```

### Starting Point (Already Completed)

✅ **Foundation (DONE)**:

- Groth16 verifier (5,118 lines Rust) ✅ WORKS
- Attestor contract deployed: `0x36e937ebcf56c5dec6ecb0695001becc87738177` ✅ DEPLOYED
- 30,000+ test proofs (Groth16) ✅ READY
- PLONK module scaffolded (KZG, SRS, transcript) ⚠️ INCOMPLETE
- STARK module scaffolded (Fibonacci, verifier types) ⚠️ INCOMPLETE
- Monorepo structure with pnpm/Turborepo ✅ READY

### What We Need to Build (16 Weeks)

**Phase 1-2**: Groth16 Production System (Weeks 1-4)

- Off-chain verification service
- TypeScript SDK
- Integration tests

**Phase 3-4**: PLONK Implementation (Weeks 5-8)

- Complete PLONK verifier in Stylus
- KZG commitment scheme
- Universal setup ceremony
- PLONK proof generation pipeline

**Phase 5-6**: STARK Implementation (Weeks 9-12)

- Complete STARK verifier (no_std compatible)
- FRI polynomial commitments
- STARK proof generation
- Air trait implementations

**Phase 7**: Universal Router & Frontend (Weeks 13-15)

- Proof type detection & routing
- Multi-proof demo UI
- Gas benchmarking suite

**Phase 8**: Launch & Documentation (Week 16)

- Comprehensive docs
- Video demos
- Gas comparison reports

---

## 🎯 Success Criteria

### Universal Verifier Definition (Must Have)

**Groth16 Support**:

1. ✅ Stylus contract verifies Groth16 proofs on-chain
2. ✅ Gas cost < 80k per verification
3. ✅ VK registry with precomputed pairings
4. ✅ Batch verification (30-50% gas savings)

**PLONK Support**: 5. ✅ Stylus contract with KZG commitments 6. ✅ Universal setup (no circuit-specific trusted setup) 7. ✅ Gas cost < 150k per verification 8. ✅ Proof generation pipeline (snarkjs compatible)

**STARK Support**: 9. ✅ Off-chain STARK verifier (no_std WASM) 10. ✅ FRI polynomial commitments 11. ✅ Transparent setup (no trusted setup) 12. ✅ Attestation via on-chain record

**Integration**: 13. ✅ Universal router contract auto-detects proof type 14. ✅ TypeScript SDK supports all three proof systems 15. ✅ Demo UI with proof type selector 16. ✅ 100+ integration tests (all proof types) 17. ✅ Gas benchmarking comparing all systems 18. ✅ Live demo on Arbitrum Sepolia

### Out of Scope (Future Work)

- ❌ Mainnet deployment (testnet only for v1)
- ❌ Recursive proof composition
- ❌ zkEVM-specific optimizations
- ❌ Multi-chain support (Arbitrum Sepolia only)
- ❌ Security audit (post-v1)
- ❌ Formal verification (post-v1)

---

## 📅 Phase-by-Phase Execution Plan

---

## **PHASE 1: Off-Chain Verification Service** (Weeks 1-2)

**Goal**: Run 143KB Groth16 verifier as a REST API service

### Task 1.1: Service Architecture Setup (Day 1-2)

**Context**: Create Node.js service that loads Rust WASM and exposes REST API

**Implementation**:

```bash
# Create service package
mkdir -p packages/verifier-service
cd packages/verifier-service

# Initialize TypeScript project
pnpm init
pnpm add express cors dotenv
pnpm add -D typescript @types/node @types/express tsx nodemon
pnpm add viem@2.x abitype

# Create directory structure
mkdir -p src/{routes,middleware,utils,types}
mkdir -p wasm
touch src/server.ts
touch src/routes/verify.ts
touch src/middleware/validation.ts
touch src/utils/wasm-loader.ts
```

**Files to Create**:

1. `packages/verifier-service/package.json`:

```json
{
  "name": "@uzkv/verifier-service",
  "version": "0.1.0",
  "type": "module",
  "scripts": {
    "dev": "tsx watch src/server.ts",
    "build": "tsc",
    "start": "node dist/server.js",
    "test": "vitest"
  },
  "dependencies": {
    "express": "^4.18.2",
    "cors": "^2.8.5",
    "dotenv": "^16.3.1",
    "viem": "^2.7.0",
    "abitype": "^1.0.0"
  },
  "devDependencies": {
    "typescript": "^5.3.3",
    "@types/node": "^20.10.6",
    "@types/express": "^4.17.21",
    "@types/cors": "^2.8.17",
    "tsx": "^4.7.0",
    "nodemon": "^3.0.2",
    "vitest": "^1.1.0"
  }
}
```

2. `packages/verifier-service/tsconfig.json`:

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "outDir": "./dist",
    "rootDir": "./src",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "resolveJsonModule": true,
    "allowSyntheticDefaultImports": true
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist"]
}
```

3. `packages/verifier-service/.env.example`:

```env
PORT=3001
NODE_ENV=development
ARBITRUM_SEPOLIA_RPC=https://arbitrum-sepolia-rpc.publicnode.com
ATTESTOR_CONTRACT=0x36e937ebcf56c5dec6ecb0695001becc87738177
ATTESTOR_SIGNER_PRIVATE_KEY=your_private_key_here
CORS_ORIGIN=http://localhost:3000
MAX_PROOF_SIZE=10485760
RATE_LIMIT_WINDOW_MS=60000
RATE_LIMIT_MAX_REQUESTS=100
```

**Verification**:

```bash
cd packages/verifier-service
pnpm install
pnpm dev  # Should start without errors
```

**Deliverable**: Service scaffolding ready

---

### Task 1.2: WASM Integration (Day 3-5)

**Context**: Load 143KB Groth16 verifier WASM and expose verification function

**Implementation**:

1. Copy WASM to service:

```bash
cp ../stylus/target/wasm32-unknown-unknown/release/uzkv_stylus.wasm packages/verifier-service/wasm/
```

2. Create WASM loader (`src/utils/wasm-loader.ts`):

```typescript
import { readFileSync } from "fs";
import { join } from "path";

export interface VerificationResult {
  isValid: boolean;
  proofHash: string;
  publicInputs: string[];
  timestamp: number;
}

export class Groth16Verifier {
  private wasmInstance: WebAssembly.Instance | null = null;
  private memory: WebAssembly.Memory | null = null;

  async initialize(): Promise<void> {
    const wasmPath = join(process.cwd(), "wasm", "uzkv_stylus.wasm");
    const wasmBuffer = readFileSync(wasmPath);

    const wasmModule = await WebAssembly.compile(wasmBuffer);

    // Import memory for WASM
    this.memory = new WebAssembly.Memory({ initial: 256, maximum: 512 });

    this.wasmInstance = await WebAssembly.instantiate(wasmModule, {
      env: {
        memory: this.memory,
        abort: () => {
          throw new Error("WASM aborted");
        },
      },
    });

    console.log("✅ Groth16 WASM verifier loaded");
  }

  /**
   * Verify a Groth16 proof
   * @param proofHex - Hex-encoded proof (without 0x prefix)
   * @param publicInputsHex - Hex-encoded public inputs
   * @param vkHex - Hex-encoded verification key
   * @returns Verification result
   */
  verify(
    proofHex: string,
    publicInputsHex: string,
    vkHex: string,
  ): VerificationResult {
    if (!this.wasmInstance) {
      throw new Error("WASM not initialized");
    }

    // Convert hex to bytes
    const proofBytes = this.hexToBytes(proofHex);
    const publicInputsBytes = this.hexToBytes(publicInputsHex);
    const vkBytes = this.hexToBytes(vkHex);

    // Allocate memory in WASM
    const proofPtr = this.allocate(proofBytes.length);
    const inputsPtr = this.allocate(publicInputsBytes.length);
    const vkPtr = this.allocate(vkBytes.length);

    // Write data to WASM memory
    this.writeMemory(proofPtr, proofBytes);
    this.writeMemory(inputsPtr, publicInputsBytes);
    this.writeMemory(vkPtr, vkBytes);

    try {
      // Call WASM verify function
      const verifyFn = this.wasmInstance.exports.verify as Function;
      const result = verifyFn(
        proofPtr,
        proofBytes.length,
        inputsPtr,
        publicInputsBytes.length,
        vkPtr,
        vkBytes.length,
      );

      // Compute proof hash
      const proofHash = this.keccak256(proofBytes);

      return {
        isValid: Boolean(result),
        proofHash,
        publicInputs: this.parsePublicInputs(publicInputsBytes),
        timestamp: Date.now(),
      };
    } finally {
      // Free memory
      this.free(proofPtr);
      this.free(inputsPtr);
      this.free(vkPtr);
    }
  }

  private hexToBytes(hex: string): Uint8Array {
    const cleanHex = hex.replace(/^0x/, "");
    const bytes = new Uint8Array(cleanHex.length / 2);
    for (let i = 0; i < cleanHex.length; i += 2) {
      bytes[i / 2] = parseInt(cleanHex.slice(i, i + 2), 16);
    }
    return bytes;
  }

  private allocate(size: number): number {
    const allocFn = this.wasmInstance!.exports.alloc as Function;
    return allocFn(size);
  }

  private free(ptr: number): void {
    const freeFn = this.wasmInstance!.exports.free as Function;
    freeFn(ptr);
  }

  private writeMemory(ptr: number, data: Uint8Array): void {
    const memoryView = new Uint8Array(this.memory!.buffer);
    memoryView.set(data, ptr);
  }

  private keccak256(data: Uint8Array): string {
    // Use viem for keccak256
    const { keccak256 } = require("viem");
    return keccak256(data);
  }

  private parsePublicInputs(bytes: Uint8Array): string[] {
    // Each public input is 32 bytes
    const inputs: string[] = [];
    for (let i = 0; i < bytes.length; i += 32) {
      const input = bytes.slice(i, i + 32);
      inputs.push(
        "0x" +
          Array.from(input)
            .map((b) => b.toString(16).padStart(2, "0"))
            .join(""),
      );
    }
    return inputs;
  }
}

// Singleton instance
export const verifier = new Groth16Verifier();
```

**Note**: The WASM exports might differ. Check actual exports:

```bash
wasm-objdump -x packages/verifier-service/wasm/uzkv_stylus.wasm | grep -A 100 "Export\["
```

Adjust function names accordingly.

3. Create verification route (`src/routes/verify.ts`):

```typescript
import { Router, Request, Response } from "express";
import { verifier } from "../utils/wasm-loader.js";
import { z } from "zod";

const router = Router();

// Validation schema
const VerifyRequestSchema = z.object({
  proof: z.string().regex(/^0x[0-9a-fA-F]+$/),
  publicInputs: z.string().regex(/^0x[0-9a-fA-F]+$/),
  vk: z.string().regex(/^0x[0-9a-fA-F]+$/),
});

router.post("/verify", async (req: Request, res: Response) => {
  try {
    // Validate request
    const { proof, publicInputs, vk } = VerifyRequestSchema.parse(req.body);

    // Size limits
    if (proof.length > 1024) {
      return res.status(400).json({ error: "Proof too large" });
    }

    console.log(`📝 Verifying proof: ${proof.slice(0, 20)}...`);

    // Verify proof off-chain
    const result = verifier.verify(
      proof.slice(2), // Remove 0x
      publicInputs.slice(2),
      vk.slice(2),
    );

    if (result.isValid) {
      console.log(`✅ Proof valid: ${result.proofHash}`);
    } else {
      console.log(`❌ Proof invalid`);
    }

    res.json({
      success: true,
      result: {
        isValid: result.isValid,
        proofHash: result.proofHash,
        publicInputs: result.publicInputs,
        timestamp: result.timestamp,
      },
    });
  } catch (error: any) {
    console.error("❌ Verification error:", error.message);
    res.status(400).json({
      success: false,
      error: error.message,
    });
  }
});

// Health check
router.get("/health", (req: Request, res: Response) => {
  res.json({
    status: "ok",
    service: "UZKV Verifier",
    version: "0.1.0",
    timestamp: Date.now(),
  });
});

export default router;
```

4. Create main server (`src/server.ts`):

```typescript
import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import verifyRouter from "./routes/verify.js";
import { verifier } from "./utils/wasm-loader.js";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors({ origin: process.env.CORS_ORIGIN || "*" }));
app.use(express.json({ limit: "10mb" }));

// Routes
app.use("/api", verifyRouter);

// Error handler
app.use((err: any, req: any, res: any, next: any) => {
  console.error("Server error:", err);
  res.status(500).json({ error: "Internal server error" });
});

// Initialize and start
async function start() {
  try {
    // Initialize WASM verifier
    await verifier.initialize();

    app.listen(PORT, () => {
      console.log(`🚀 UZKV Verifier Service running on port ${PORT}`);
      console.log(`📍 API: http://localhost:${PORT}/api`);
    });
  } catch (error) {
    console.error("Failed to start server:", error);
    process.exit(1);
  }
}

start();
```

**Testing**:

```bash
# Start service
pnpm dev

# Test with curl (using a real proof from circuits package)
curl -X POST http://localhost:3001/api/verify \
  -H "Content-Type: application/json" \
  -d '{
    "proof": "0x...",
    "publicInputs": "0x...",
    "vk": "0x..."
  }'
```

**Deliverable**: Working off-chain verification API

---

### Task 1.3: Attestation Integration (Day 6-8)

**Context**: Sign valid proofs and submit to on-chain attestor

**Implementation**:

1. Install dependencies:

```bash
pnpm add viem@2.x ethers@6.x
```

2. Create attestor client (`src/utils/attestor-client.ts`):

```typescript
import { createWalletClient, createPublicClient, http, parseAbi } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { arbitrumSepolia } from "viem/chains";
import dotenv from "dotenv";

dotenv.config();

const ATTESTOR_ABI = parseAbi([
  "function initialize(address attestor_address) external",
  "function attest_proof(bytes32 proof_hash) external",
  "function is_attested(bytes32 proof_hash) external view returns (bool)",
  "function get_attestation_count() external view returns (uint256)",
  "function get_attestor() external view returns (address)",
  "function get_owner() external view returns (address)",
]);

export class AttestorClient {
  private walletClient;
  private publicClient;
  private account;
  private contractAddress;

  constructor() {
    if (!process.env.ATTESTOR_SIGNER_PRIVATE_KEY) {
      throw new Error("ATTESTOR_SIGNER_PRIVATE_KEY not set");
    }

    this.account = privateKeyToAccount(
      process.env.ATTESTOR_SIGNER_PRIVATE_KEY as `0x${string}`,
    );

    this.contractAddress = process.env.ATTESTOR_CONTRACT as `0x${string}`;

    this.walletClient = createWalletClient({
      account: this.account,
      chain: arbitrumSepolia,
      transport: http(process.env.ARBITRUM_SEPOLIA_RPC),
    });

    this.publicClient = createPublicClient({
      chain: arbitrumSepolia,
      transport: http(process.env.ARBITRUM_SEPOLIA_RPC),
    });
  }

  /**
   * Check if contract is initialized
   */
  async isInitialized(): Promise<boolean> {
    const attestor = (await this.publicClient.readContract({
      address: this.contractAddress,
      abi: ATTESTOR_ABI,
      functionName: "get_attestor",
    })) as `0x${string}`;

    return attestor !== "0x0000000000000000000000000000000000000000";
  }

  /**
   * Initialize attestor contract (one-time)
   */
  async initialize(): Promise<string> {
    const tx = await this.walletClient.writeContract({
      address: this.contractAddress,
      abi: ATTESTOR_ABI,
      functionName: "initialize",
      args: [this.account.address],
    });

    console.log(`📝 Initializing attestor: ${tx}`);

    const receipt = await this.publicClient.waitForTransactionReceipt({
      hash: tx,
    });
    console.log(`✅ Attestor initialized in block ${receipt.blockNumber}`);

    return tx;
  }

  /**
   * Attest a valid proof on-chain
   */
  async attestProof(proofHash: string): Promise<{
    txHash: string;
    blockNumber: bigint;
    gasUsed: bigint;
  }> {
    // Check if already attested
    const isAttested = await this.isAttested(proofHash);
    if (isAttested) {
      throw new Error("Proof already attested");
    }

    // Submit attestation
    const tx = await this.walletClient.writeContract({
      address: this.contractAddress,
      abi: ATTESTOR_ABI,
      functionName: "attest_proof",
      args: [proofHash as `0x${string}`],
    });

    console.log(`📝 Attesting proof ${proofHash}: ${tx}`);

    const receipt = await this.publicClient.waitForTransactionReceipt({
      hash: tx,
    });

    console.log(`✅ Proof attested in block ${receipt.blockNumber}`);
    console.log(`⛽ Gas used: ${receipt.gasUsed}`);

    return {
      txHash: tx,
      blockNumber: receipt.blockNumber,
      gasUsed: receipt.gasUsed,
    };
  }

  /**
   * Check if proof is attested
   */
  async isAttested(proofHash: string): Promise<boolean> {
    return (await this.publicClient.readContract({
      address: this.contractAddress,
      abi: ATTESTOR_ABI,
      functionName: "is_attested",
      args: [proofHash as `0x${string}`],
    })) as boolean;
  }

  /**
   * Get total attestation count
   */
  async getAttestationCount(): Promise<bigint> {
    return (await this.publicClient.readContract({
      address: this.contractAddress,
      abi: ATTESTOR_ABI,
      functionName: "get_attestation_count",
    })) as bigint;
  }

  /**
   * Get contract info
   */
  async getInfo(): Promise<{
    owner: string;
    attestor: string;
    attestationCount: bigint;
  }> {
    const [owner, attestor, count] = await Promise.all([
      this.publicClient.readContract({
        address: this.contractAddress,
        abi: ATTESTOR_ABI,
        functionName: "get_owner",
      }),
      this.publicClient.readContract({
        address: this.contractAddress,
        abi: ATTESTOR_ABI,
        functionName: "get_attestor",
      }),
      this.publicClient.readContract({
        address: this.contractAddress,
        abi: ATTESTOR_ABI,
        functionName: "get_attestation_count",
      }),
    ]);

    return {
      owner: owner as string,
      attestor: attestor as string,
      attestationCount: count as bigint,
    };
  }
}

// Singleton
export const attestorClient = new AttestorClient();
```

3. Update verification route to include attestation:

```typescript
// Add to src/routes/verify.ts
import { attestorClient } from "../utils/attestor-client.js";

router.post("/verify-and-attest", async (req: Request, res: Response) => {
  try {
    const { proof, publicInputs, vk } = VerifyRequestSchema.parse(req.body);

    // 1. Verify off-chain
    const result = verifier.verify(
      proof.slice(2),
      publicInputs.slice(2),
      vk.slice(2),
    );

    if (!result.isValid) {
      return res.status(400).json({
        success: false,
        error: "Proof verification failed",
      });
    }

    // 2. Check if already attested
    const isAttested = await attestorClient.isAttested(result.proofHash);
    if (isAttested) {
      return res.json({
        success: true,
        result: {
          ...result,
          attestation: {
            status: "already_attested",
            proofHash: result.proofHash,
          },
        },
      });
    }

    // 3. Attest on-chain
    const attestation = await attestorClient.attestProof(result.proofHash);

    res.json({
      success: true,
      result: {
        ...result,
        attestation: {
          status: "attested",
          txHash: attestation.txHash,
          blockNumber: attestation.blockNumber.toString(),
          gasUsed: attestation.gasUsed.toString(),
        },
      },
    });
  } catch (error: any) {
    console.error("Error:", error.message);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

// Check attestation status
router.get("/attestation/:proofHash", async (req: Request, res: Response) => {
  try {
    const { proofHash } = req.params;

    if (!/^0x[0-9a-fA-F]{64}$/.test(proofHash)) {
      return res.status(400).json({ error: "Invalid proof hash" });
    }

    const isAttested = await attestorClient.isAttested(proofHash);

    res.json({
      proofHash,
      isAttested,
      timestamp: Date.now(),
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Get contract stats
router.get("/stats", async (req: Request, res: Response) => {
  try {
    const info = await attestorClient.getInfo();

    res.json({
      contractAddress: process.env.ATTESTOR_CONTRACT,
      owner: info.owner,
      attestor: info.attestor,
      totalAttestations: info.attestationCount.toString(),
      network: "arbitrum-sepolia",
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});
```

4. Create initialization script (`scripts/init-attestor.ts`):

```typescript
import { attestorClient } from "../src/utils/attestor-client.js";

async function main() {
  console.log("🔧 Checking attestor contract...");

  const isInit = await attestorClient.isInitialized();

  if (isInit) {
    console.log("✅ Attestor already initialized");
    const info = await attestorClient.getInfo();
    console.log("Owner:", info.owner);
    console.log("Attestor:", info.attestor);
    console.log("Attestations:", info.attestationCount.toString());
  } else {
    console.log("⚠️  Attestor not initialized, initializing...");
    await attestorClient.initialize();
    console.log("✅ Initialization complete");
  }
}

main().catch(console.error);
```

**Testing**:

```bash
# Initialize attestor (if not already done)
pnpm tsx scripts/init-attestor.ts

# Test full flow
curl -X POST http://localhost:3001/api/verify-and-attest \
  -H "Content-Type: application/json" \
  -d @../circuits/proofs/poseidon_test_proof_0.json

# Check stats
curl http://localhost:3001/api/stats
```

**Deliverable**: Complete off-chain → on-chain attestation flow

---

### Task 1.4: Production Hardening (Day 9-10)

**Context**: Add rate limiting, error handling, logging

**Implementation**:

1. Install dependencies:

```bash
pnpm add express-rate-limit helmet pino pino-http
```

2. Add middleware (`src/middleware/rate-limit.ts`):

```typescript
import rateLimit from "express-rate-limit";

export const verifyLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 10, // 10 requests per minute
  message: "Too many verification requests, please try again later",
  standardHeaders: true,
  legacyHeaders: false,
});

export const attestLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 5, // 5 attestations per minute (expensive)
  message: "Too many attestation requests, please try again later",
});
```

3. Add logging (`src/middleware/logger.ts`):

```typescript
import pino from "pino";
import pinoHttp from "pino-http";

export const logger = pino({
  level: process.env.LOG_LEVEL || "info",
  transport: {
    target: "pino-pretty",
    options: {
      colorize: true,
    },
  },
});

export const httpLogger = pinoHttp({ logger });
```

4. Update server with security:

```typescript
// src/server.ts
import helmet from "helmet";
import { httpLogger } from "./middleware/logger.js";
import { verifyLimiter } from "./middleware/rate-limit.js";

// Add to middleware section
app.use(helmet());
app.use(httpLogger);
app.use("/api/verify", verifyLimiter);
app.use("/api/verify-and-attest", attestLimiter);
```

5. Create Dockerfile:

```dockerfile
# packages/verifier-service/Dockerfile
FROM node:20-alpine

WORKDIR /app

# Copy package files
COPY package.json pnpm-lock.yaml ./
COPY wasm ./wasm

# Install dependencies
RUN npm install -g pnpm
RUN pnpm install --frozen-lockfile

# Copy source
COPY src ./src
COPY tsconfig.json ./

# Build
RUN pnpm build

# Expose port
EXPOSE 3001

# Start
CMD ["node", "dist/server.js"]
```

6. Create docker-compose for local testing:

```yaml
# packages/verifier-service/docker-compose.yml
version: "3.8"
services:
  verifier:
    build: .
    ports:
      - "3001:3001"
    environment:
      - NODE_ENV=production
      - PORT=3001
      - ARBITRUM_SEPOLIA_RPC=${ARBITRUM_SEPOLIA_RPC}
      - ATTESTOR_CONTRACT=${ATTESTOR_CONTRACT}
      - ATTESTOR_SIGNER_PRIVATE_KEY=${ATTESTOR_SIGNER_PRIVATE_KEY}
    restart: unless-stopped
```

**Testing**:

```bash
# Build and run
docker-compose up --build

# Test
curl http://localhost:3001/api/health
```

**Deliverable**: Production-ready verification service

---

## **PHASE 2: TypeScript SDK** (Weeks 3-4)

**Goal**: Create npm package for easy integration

### Task 2.1: SDK Package Setup (Day 11-12)

**Implementation**:

```bash
# Create SDK package
mkdir -p packages/sdk
cd packages/sdk

pnpm init
pnpm add viem@2.x abitype
pnpm add -D typescript @types/node tsup vitest
```

**Package structure**:

```
packages/sdk/
├── src/
│   ├── index.ts
│   ├── attestor.ts
│   ├── verifier.ts
│   ├── types.ts
│   └── constants.ts
├── test/
│   ├── attestor.test.ts
│   └── verifier.test.ts
├── package.json
├── tsconfig.json
└── README.md
```

**Files**:

1. `package.json`:

```json
{
  "name": "@uzkv/sdk",
  "version": "0.1.0",
  "description": "TypeScript SDK for UZKV Proof Attestation",
  "main": "./dist/index.js",
  "module": "./dist/index.mjs",
  "types": "./dist/index.d.ts",
  "exports": {
    ".": {
      "import": "./dist/index.mjs",
      "require": "./dist/index.js",
      "types": "./dist/index.d.ts"
    }
  },
  "scripts": {
    "build": "tsup src/index.ts --format cjs,esm --dts",
    "dev": "tsup src/index.ts --format cjs,esm --dts --watch",
    "test": "vitest",
    "prepublishOnly": "pnpm build"
  },
  "keywords": ["zkp", "groth16", "arbitrum", "stylus"],
  "license": "MIT",
  "dependencies": {
    "viem": "^2.7.0",
    "abitype": "^1.0.0"
  },
  "devDependencies": {
    "typescript": "^5.3.3",
    "@types/node": "^20.10.6",
    "tsup": "^8.0.1",
    "vitest": "^1.1.0"
  }
}
```

2. `src/types.ts`:

```typescript
export interface ProofData {
  proof: `0x${string}`;
  publicInputs: `0x${string}`;
  vk: `0x${string}`;
}

export interface VerificationResult {
  isValid: boolean;
  proofHash: `0x${string}`;
  publicInputs: string[];
  timestamp: number;
}

export interface AttestationResult {
  txHash: `0x${string}`;
  blockNumber: bigint;
  gasUsed: bigint;
  proofHash: `0x${string}`;
}

export interface AttestorConfig {
  contractAddress: `0x${string}`;
  rpcUrl: string;
  privateKey?: `0x${string}`;
}

export interface VerifierConfig {
  serviceUrl: string;
  apiKey?: string;
}
```

3. `src/constants.ts`:

```typescript
export const ATTESTOR_ABI = [
  {
    type: "function",
    name: "initialize",
    inputs: [{ name: "attestor_address", type: "address" }],
    outputs: [],
    stateMutability: "nonpayable",
  },
  {
    type: "function",
    name: "attest_proof",
    inputs: [{ name: "proof_hash", type: "bytes32" }],
    outputs: [],
    stateMutability: "nonpayable",
  },
  {
    type: "function",
    name: "is_attested",
    inputs: [{ name: "proof_hash", type: "bytes32" }],
    outputs: [{ type: "bool" }],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "get_attestation_count",
    inputs: [],
    outputs: [{ type: "uint256" }],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "get_attestor",
    inputs: [],
    outputs: [{ type: "address" }],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "get_owner",
    inputs: [],
    outputs: [{ type: "address" }],
    stateMutability: "view",
  },
] as const;

export const DEFAULT_ATTESTOR_ADDRESS =
  "0x36e937ebcf56c5dec6ecb0695001becc87738177" as const;
export const DEFAULT_VERIFIER_URL = "http://localhost:3001/api";
export const ARBITRUM_SEPOLIA_RPC =
  "https://arbitrum-sepolia-rpc.publicnode.com";
```

4. `src/verifier.ts`:

```typescript
import type { ProofData, VerificationResult, VerifierConfig } from "./types";
import { DEFAULT_VERIFIER_URL } from "./constants";

export class VerifierClient {
  private serviceUrl: string;
  private apiKey?: string;

  constructor(config: Partial<VerifierConfig> = {}) {
    this.serviceUrl = config.serviceUrl || DEFAULT_VERIFIER_URL;
    this.apiKey = config.apiKey;
  }

  /**
   * Verify a Groth16 proof off-chain
   */
  async verify(proofData: ProofData): Promise<VerificationResult> {
    const response = await fetch(`${this.serviceUrl}/verify`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(this.apiKey && { "X-API-Key": this.apiKey }),
      },
      body: JSON.stringify(proofData),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(`Verification failed: ${error.error}`);
    }

    const data = await response.json();
    return data.result;
  }

  /**
   * Verify and attest in one call
   */
  async verifyAndAttest(proofData: ProofData): Promise<{
    verification: VerificationResult;
    attestation: {
      status: "attested" | "already_attested";
      txHash?: string;
      blockNumber?: string;
      gasUsed?: string;
    };
  }> {
    const response = await fetch(`${this.serviceUrl}/verify-and-attest`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(this.apiKey && { "X-API-Key": this.apiKey }),
      },
      body: JSON.stringify(proofData),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(`Verification/attestation failed: ${error.error}`);
    }

    const data = await response.json();
    return {
      verification: data.result,
      attestation: data.result.attestation,
    };
  }

  /**
   * Check if proof is attested
   */
  async checkAttestation(proofHash: `0x${string}`): Promise<{
    isAttested: boolean;
    timestamp: number;
  }> {
    const response = await fetch(`${this.serviceUrl}/attestation/${proofHash}`);

    if (!response.ok) {
      throw new Error("Failed to check attestation");
    }

    return response.json();
  }

  /**
   * Get service stats
   */
  async getStats(): Promise<{
    contractAddress: string;
    owner: string;
    attestor: string;
    totalAttestations: string;
    network: string;
  }> {
    const response = await fetch(`${this.serviceUrl}/stats`);

    if (!response.ok) {
      throw new Error("Failed to get stats");
    }

    return response.json();
  }
}
```

5. `src/attestor.ts`:

```typescript
import {
  createPublicClient,
  createWalletClient,
  http,
  type PublicClient,
  type WalletClient,
} from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { arbitrumSepolia } from "viem/chains";
import type { AttestorConfig, AttestationResult } from "./types";
import {
  ATTESTOR_ABI,
  DEFAULT_ATTESTOR_ADDRESS,
  ARBITRUM_SEPOLIA_RPC,
} from "./constants";

export class AttestorClient {
  private publicClient: PublicClient;
  private walletClient?: WalletClient;
  private contractAddress: `0x${string}`;

  constructor(config: Partial<AttestorConfig> = {}) {
    this.contractAddress = config.contractAddress || DEFAULT_ATTESTOR_ADDRESS;

    this.publicClient = createPublicClient({
      chain: arbitrumSepolia,
      transport: http(config.rpcUrl || ARBITRUM_SEPOLIA_RPC),
    });

    if (config.privateKey) {
      const account = privateKeyToAccount(config.privateKey);
      this.walletClient = createWalletClient({
        account,
        chain: arbitrumSepolia,
        transport: http(config.rpcUrl || ARBITRUM_SEPOLIA_RPC),
      });
    }
  }

  /**
   * Check if proof is attested
   */
  async isAttested(proofHash: `0x${string}`): Promise<boolean> {
    return await this.publicClient.readContract({
      address: this.contractAddress,
      abi: ATTESTOR_ABI,
      functionName: "is_attested",
      args: [proofHash],
    });
  }

  /**
   * Get total attestation count
   */
  async getAttestationCount(): Promise<bigint> {
    return await this.publicClient.readContract({
      address: this.contractAddress,
      abi: ATTESTOR_ABI,
      functionName: "get_attestation_count",
    });
  }

  /**
   * Get attestor address
   */
  async getAttestor(): Promise<`0x${string}`> {
    return (await this.publicClient.readContract({
      address: this.contractAddress,
      abi: ATTESTOR_ABI,
      functionName: "get_attestor",
    })) as `0x${string}`;
  }

  /**
   * Get owner address
   */
  async getOwner(): Promise<`0x${string}`> {
    return (await this.publicClient.readContract({
      address: this.contractAddress,
      abi: ATTESTOR_ABI,
      functionName: "get_owner",
    })) as `0x${string}`;
  }

  /**
   * Attest a proof (requires wallet)
   */
  async attestProof(proofHash: `0x${string}`): Promise<AttestationResult> {
    if (!this.walletClient) {
      throw new Error("Wallet client required for attestation");
    }

    const hash = await this.walletClient.writeContract({
      address: this.contractAddress,
      abi: ATTESTOR_ABI,
      functionName: "attest_proof",
      args: [proofHash],
    });

    const receipt = await this.publicClient.waitForTransactionReceipt({ hash });

    return {
      txHash: hash,
      blockNumber: receipt.blockNumber,
      gasUsed: receipt.gasUsed,
      proofHash,
    };
  }
}
```

6. `src/index.ts`:

```typescript
export { VerifierClient } from "./verifier";
export { AttestorClient } from "./attestor";
export * from "./types";
export * from "./constants";

// Re-export for convenience
export { arbitrumSepolia } from "viem/chains";
```

7. `README.md`:

````markdown
# @uzkv/sdk

TypeScript SDK for UZKV ZK Proof Attestation Service

## Installation

\`\`\`bash
npm install @uzkv/sdk viem

# or

pnpm add @uzkv/sdk viem
\`\`\`

## Usage

### Verify a proof

\`\`\`typescript
import { VerifierClient } from '@uzkv/sdk';

const verifier = new VerifierClient({
serviceUrl: 'https://verifier.uzkv.io/api'
});

const result = await verifier.verify({
proof: '0x...',
publicInputs: '0x...',
vk: '0x...'
});

console.log('Valid:', result.isValid);
console.log('Proof hash:', result.proofHash);
\`\`\`

### Check attestation status

\`\`\`typescript
import { AttestorClient } from '@uzkv/sdk';

const attestor = new AttestorClient();

const isAttested = await attestor.isAttested('0x...');
console.log('Attested:', isAttested);
\`\`\`

### Full flow: Verify and Attest

\`\`\`typescript
const result = await verifier.verifyAndAttest({
proof: '0x...',
publicInputs: '0x...',
vk: '0x...'
});

console.log('Verification:', result.verification.isValid);
console.log('Attestation TX:', result.attestation.txHash);
\`\`\`

## API Reference

See [API.md](./API.md) for full documentation.
\`\`\`

**Testing**:

```bash
pnpm build
pnpm test
```
````

**Deliverable**: Working TypeScript SDK

---

_[CONTINUED IN NEXT MESSAGE DUE TO LENGTH - THIS IS WEEKS 1-4 OF 10]_

Would you like me to continue with Phases 3-5 (Integration Tests, Frontend, Documentation & Launch)?
