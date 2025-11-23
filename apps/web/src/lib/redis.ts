import Redis from "ioredis";

// Create Redis client with connection pooling
const redis = new Redis({
  host: process.env.REDIS_HOST || "localhost",
  port: parseInt(process.env.REDIS_PORT || "6379"),
  password: process.env.REDIS_PASSWORD,
  retryStrategy: (times) => {
    const delay = Math.min(times * 50, 2000);
    return delay;
  },
  maxRetriesPerRequest: 3,
});

redis.on("error", (err) => {
  console.error("Redis Client Error:", err);
});

redis.on("connect", () => {
  console.log("Redis Client Connected");
});

export default redis;

// Workflow state interface
export interface WorkflowState {
  sessionId: string;
  proofType: "groth16" | "plonk" | "stark";
  status: "generating" | "verifying" | "attesting" | "complete" | "error";
  currentStep: string;
  progress: number; // 0-100
  logs: string[];
  generatedProofs?: {
    groth16: string[];
    plonk: string[];
    stark: string[];
  };
  verificationResults?: {
    verified: boolean;
    circuitsVerified: number;
    gasEstimate: number;
  };
  attestationResults?: {
    txHashes: string[];
    network: string;
    attestorContract: string;
  };
  error?: string;
  startTime: number;
  lastUpdate: number;
}

// Utility functions for workflow management
export const WorkflowManager = {
  async createSession(
    sessionId: string,
    proofType: "groth16" | "plonk" | "stark",
  ): Promise<void> {
    const state: WorkflowState = {
      sessionId,
      proofType,
      status: "generating",
      currentStep: "Initializing...",
      progress: 0,
      logs: [],
      startTime: Date.now(),
      lastUpdate: Date.now(),
    };
    await redis.setex(`workflow:${sessionId}`, 3600, JSON.stringify(state)); // 1 hour TTL
  },

  async getSession(sessionId: string): Promise<WorkflowState | null> {
    const data = await redis.get(`workflow:${sessionId}`);
    return data ? JSON.parse(data) : null;
  },

  async updateSession(
    sessionId: string,
    updates: Partial<WorkflowState>,
  ): Promise<void> {
    const state = await this.getSession(sessionId);
    if (!state) throw new Error("Session not found");

    const updated = {
      ...state,
      ...updates,
      lastUpdate: Date.now(),
    };
    await redis.setex(`workflow:${sessionId}`, 3600, JSON.stringify(updated));
  },

  async addLog(sessionId: string, log: string): Promise<void> {
    const state = await this.getSession(sessionId);
    if (!state) return;

    state.logs.push(log);
    state.lastUpdate = Date.now();
    await redis.setex(`workflow:${sessionId}`, 3600, JSON.stringify(state));
  },

  async storeProofs(
    sessionId: string,
    proofs: { groth16: string[]; plonk: string[]; stark: string[] },
  ): Promise<void> {
    await this.updateSession(sessionId, {
      generatedProofs: proofs,
      status: "verifying",
      progress: 33,
    });
  },

  async storeVerificationResults(
    sessionId: string,
    results: any,
  ): Promise<void> {
    await this.updateSession(sessionId, {
      verificationResults: results,
      status: "attesting",
      progress: 66,
    });
  },

  async storeAttestationResults(
    sessionId: string,
    results: any,
  ): Promise<void> {
    await this.updateSession(sessionId, {
      attestationResults: results,
      status: "complete",
      progress: 100,
    });
  },

  async setError(sessionId: string, error: string): Promise<void> {
    await this.updateSession(sessionId, {
      error,
      status: "error",
    });
  },

  async deleteSession(sessionId: string): Promise<void> {
    await redis.del(`workflow:${sessionId}`);
  },
};
