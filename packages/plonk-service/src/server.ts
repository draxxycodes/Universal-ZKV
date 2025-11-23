/**
 * PLONK Verification Service
 *
 * Express server with WASM verification and attestor integration
 * Contract size: 36.8KB - too large for on-chain deployment
 */

import express, {
  type Request,
  type Response,
  type NextFunction,
} from "express";
import cors from "cors";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import pino from "pino";
import pinoHttp from "pino-http";
import { config } from "dotenv";
import verifyRouter from "./routes/verify.js";
import { wasmVerifier } from "./utils/wasm-loader.js";

// Load environment variables
config();

const logger = pino({
  name: "plonk-service",
  level: process.env.LOG_LEVEL || "info",
});

const app = express();
const PORT = parseInt(process.env.PORT || "3002", 10);

// Security middleware
app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        scriptSrc: ["'self'"],
        imgSrc: ["'self'", "data:", "https:"],
      },
    },
    crossOriginEmbedderPolicy: false,
  }),
);

// CORS configuration
app.use(
  cors({
    origin: process.env.CORS_ORIGIN || "*",
    methods: ["GET", "POST"],
    allowedHeaders: ["Content-Type", "Authorization"],
    credentials: true,
    maxAge: 86400, // 24 hours
  }),
);

// Request logging
app.use(pinoHttp({ logger }));

// Body parser
app.use(express.json({ limit: "1mb" }));
app.use(express.urlencoded({ extended: true, limit: "1mb" }));

// Rate limiting
const limiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || "60000", 10), // 1 minute
  max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || "100", 10),
  message: "Too many requests from this IP, please try again later",
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => {
    // Skip rate limiting for health checks
    return req.path === "/health";
  },
});

app.use(limiter);

// Root endpoint
app.get("/", (_req: Request, res: Response) => {
  res.json({
    service: "UZKV PLONK Verification Service",
    version: "0.1.0",
    description: "Off-chain PLONK proof verification with on-chain attestation",
    proofSystem: "PLONK with KZG polynomial commitments",
    curve: "BN254 (alt_bn128)",
    wasmSize: "36.8 KiB (37708 bytes)",
    deploymentStrategy:
      "Off-chain verification (contract size exceeds 24KB Stylus limit)",
    endpoints: {
      verify: "POST /verify",
      verifyBatch: "POST /verify/batch",
      attestationStatus: "GET /attestation/:proofHash",
      attestationEvents: "GET /attestation/events",
      health: "GET /health",
      metrics: "GET /metrics",
    },
    attestorContract:
      process.env.ATTESTOR_ADDRESS ||
      "0x36e937ebcf56c5dec6ecb0695001becc87738177",
    network: "Arbitrum Sepolia",
  });
});

// Mount verification routes
app.use("/", verifyRouter);

// 404 handler
app.use((_req: Request, res: Response) => {
  res.status(404).json({
    error: "Not found",
    message: "The requested endpoint does not exist",
  });
});

// Error handler
app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
  logger.error({ err }, "Unhandled error");

  res.status(500).json({
    error: "Internal server error",
    message:
      process.env.NODE_ENV === "development"
        ? err.message
        : "Something went wrong",
  });
});

// Initialize WASM and start server
async function start() {
  try {
    logger.info("Initializing PLONK WASM verifier...");
    logger.info(
      `WASM size: 36.8 KiB (37708 bytes) - exceeds 24KB Stylus limit`,
    );
    logger.info("Using off-chain verification strategy");

    await wasmVerifier.initialize();
    logger.info("PLONK WASM verifier initialized successfully");

    app.listen(PORT, () => {
      logger.info(
        {
          port: PORT,
          nodeEnv: process.env.NODE_ENV || "development",
          attestorAddress: process.env.ATTESTOR_ADDRESS,
          proofSystem: "PLONK",
          curve: "BN254",
        },
        "PLONK verification service started",
      );
    });
  } catch (error) {
    logger.error({ error }, "Failed to start service");
    process.exit(1);
  }
}

// Graceful shutdown
process.on("SIGTERM", () => {
  logger.info("SIGTERM received, shutting down gracefully");
  process.exit(0);
});

process.on("SIGINT", () => {
  logger.info("SIGINT received, shutting down gracefully");
  process.exit(0);
});

// Handle uncaught errors
process.on("uncaughtException", (error) => {
  logger.error({ error }, "Uncaught exception");
  process.exit(1);
});

process.on("unhandledRejection", (reason) => {
  logger.error({ reason }, "Unhandled rejection");
  process.exit(1);
});

// Start the server
start();
