import { NextRequest } from "next/server";
import { WorkflowManager } from "@/lib/redis";
import { spawn } from "child_process";
import path from "path";
import crypto from "crypto";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const searchParams = req.nextUrl.searchParams;
  const sessionId = searchParams.get("sessionId");
  const proofType = searchParams.get("proofType") as
    | "groth16"
    | "plonk"
    | "stark";

  if (!sessionId || !proofType) {
    return new Response("Missing sessionId or proofType", { status: 400 });
  }

  // Set up Server-Sent Events
  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      try {
        // Create workflow session
        await WorkflowManager.createSession(sessionId, proofType);

        const sendEvent = (event: string, data: any) => {
          controller.enqueue(
            encoder.encode(
              `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`,
            ),
          );
        };

        // Phase 1: Generate Proofs
        sendEvent("status", { phase: "generating", progress: 0 });
        await generateProofs(sessionId, proofType, sendEvent);

        // Phase 2: Verify Proofs
        sendEvent("status", { phase: "verifying", progress: 33 });
        await verifyProofs(sessionId, proofType, sendEvent);

        // Phase 3: Attest Proofs
        sendEvent("status", { phase: "attesting", progress: 66 });
        await attestProofs(sessionId, proofType, sendEvent);

        // Complete
        sendEvent("status", { phase: "complete", progress: 100 });
        sendEvent("complete", await WorkflowManager.getSession(sessionId));

        controller.close();
      } catch (error: any) {
        await WorkflowManager.setError(sessionId, error.message);
        controller.enqueue(
          encoder.encode(
            `event: error\ndata: ${JSON.stringify({ error: error.message })}\n\n`,
          ),
        );
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
}

async function generateProofs(
  sessionId: string,
  proofType: string,
  sendEvent: (event: string, data: any) => void,
): Promise<void> {
  const projectRoot = path.join(process.cwd(), "..", "..");
  const scriptPath = path.join(
    projectRoot,
    "scripts",
    "generate-all-proofs.cjs",
  );

  return new Promise((resolve, reject) => {
    const child = spawn("node", [scriptPath], {
      cwd: projectRoot,
      shell: true,
    });

    let stdout = "";
    const proofFiles = {
      groth16: [] as string[],
      plonk: [] as string[],
      stark: [] as string[],
    };

    child.stdout.on("data", async (data) => {
      const text = data.toString();
      stdout += text;

      // Send each line as it comes
      const lines = text.split("\n");
      for (const line of lines) {
        if (line.trim()) {
          sendEvent("log", { message: line.trim() });
          await WorkflowManager.addLog(sessionId, line.trim());

          // Parse proof files
          if (line.includes("_groth16_proof.json")) {
            proofFiles.groth16.push(line.trim());
          } else if (line.includes("_plonk_proof.json")) {
            proofFiles.plonk.push(line.trim());
          } else if (line.includes("_stark_proof.ub")) {
            proofFiles.stark.push(line.trim());
          }
        }
      }
    });

    child.stderr.on("data", async (data) => {
      const text = data.toString();
      sendEvent("log", { message: `ERROR: ${text}`, type: "error" });
      await WorkflowManager.addLog(sessionId, `ERROR: ${text}`);
    });

    child.on("close", async (code) => {
      if (code !== 0) {
        reject(new Error(`Generation failed with code ${code}`));
      } else {
        await WorkflowManager.storeProofs(sessionId, proofFiles);
        resolve();
      }
    });

    // Timeout after 60 seconds
    setTimeout(() => {
      child.kill();
      reject(new Error("Generation timeout"));
    }, 60000);
  });
}

async function verifyProofs(
  sessionId: string,
  proofType: string,
  sendEvent: (event: string, data: any) => void,
): Promise<void> {
  const projectRoot = path.join(process.cwd(), "..", "..");
  const scriptPath = path.join(projectRoot, "scripts", "verify-with-uzkv.cjs");

  return new Promise((resolve, reject) => {
    const child = spawn("node", [scriptPath], {
      cwd: projectRoot,
      shell: true,
    });

    let stdout = "";
    let verifiedCount = 0;
    let gasEstimate = 0;

    child.stdout.on("data", async (data) => {
      const text = data.toString();
      stdout += text;

      const lines = text.split("\n");
      for (const line of lines) {
        if (line.trim()) {
          sendEvent("log", { message: line.trim() });
          await WorkflowManager.addLog(sessionId, line.trim());

          // Parse verification results
          if (line.includes("✅") && line.includes("Verified")) {
            verifiedCount++;
          }
          if (line.includes("gas")) {
            const match = line.match(/(\d+)k?\s*gas/i);
            if (match) {
              gasEstimate =
                parseInt(match[1]) * (line.includes("k") ? 1000 : 1);
            }
          }
        }
      }
    });

    child.stderr.on("data", async (data) => {
      const text = data.toString();
      sendEvent("log", { message: `ERROR: ${text}`, type: "error" });
      await WorkflowManager.addLog(sessionId, `ERROR: ${text}`);
    });

    child.on("close", async (code) => {
      if (code !== 0) {
        reject(new Error(`Verification failed with code ${code}`));
      } else {
        await WorkflowManager.storeVerificationResults(sessionId, {
          verified: verifiedCount > 0,
          circuitsVerified: verifiedCount,
          gasEstimate,
        });
        resolve();
      }
    });

    setTimeout(() => {
      child.kill();
      reject(new Error("Verification timeout"));
    }, 30000);
  });
}

async function attestProofs(
  sessionId: string,
  proofType: string,
  sendEvent: (event: string, data: any) => void,
): Promise<void> {
  // Check if private key is configured
  if (!process.env.PRIVATE_KEY) {
    sendEvent("log", {
      message: "WARNING: PRIVATE_KEY not configured. Skipping attestation.",
      type: "warning",
    });
    await WorkflowManager.storeAttestationResults(sessionId, {
      txHashes: [],
      network: "Arbitrum Sepolia",
      attestorContract: "0x36e937ebcf56c5dec6ecb0695001becc87738177",
    });
    return;
  }

  const projectRoot = path.join(process.cwd(), "..", "..");
  const scriptPath = path.join(projectRoot, "scripts", "attest-proofs.cjs");

  return new Promise((resolve, reject) => {
    const child = spawn("node", [scriptPath], {
      cwd: projectRoot,
      shell: true,
    });

    let stdout = "";
    const txHashes: string[] = [];

    child.stdout.on("data", async (data) => {
      const text = data.toString();
      stdout += text;

      const lines = text.split("\n");
      for (const line of lines) {
        if (line.trim()) {
          sendEvent("log", { message: line.trim() });
          await WorkflowManager.addLog(sessionId, line.trim());

          // Parse transaction hashes (only capture "Attested! TX" to avoid duplicates)
          const txMatch = line.match(/Attested! TX:\s*(0x[a-fA-F0-9]{64})/);
          if (txMatch && !txHashes.includes(txMatch[1])) {
            txHashes.push(txMatch[1]);
            sendEvent("transaction", { txHash: txMatch[1] });
          }
        }
      }
    });

    child.stderr.on("data", async (data) => {
      const text = data.toString();
      sendEvent("log", { message: `ERROR: ${text}`, type: "error" });
      await WorkflowManager.addLog(sessionId, `ERROR: ${text}`);
    });

    child.on("close", async (code) => {
      if (code !== 0 && txHashes.length === 0) {
        reject(new Error(`Attestation failed with code ${code}`));
      } else {
        await WorkflowManager.storeAttestationResults(sessionId, {
          txHashes,
          network: "Arbitrum Sepolia",
          attestorContract: "0x36e937ebcf56c5dec6ecb0695001becc87738177",
        });
        resolve();
      }
    });

    setTimeout(() => {
      child.kill();
      reject(new Error("Attestation timeout"));
    }, 120000); // 2 minutes for blockchain transactions
  });
}
