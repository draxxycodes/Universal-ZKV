import { NextRequest } from "next/server";
import { WorkflowManager } from "@/lib/redis";
import {
  getProofFiles,
  verifyProofs as verifyProofsHelper,
  attestProofs as attestProofsHelper,
} from "@/lib/workflow-helpers";
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
          try {
            controller.enqueue(
              encoder.encode(
                `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`,
              ),
            );
          } catch (e: any) {
            console.error("Failed to send event:", e);
          }
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
        console.error("Workflow error:", error);
        console.error("Error stack:", error.stack);
        
        try {
          await WorkflowManager.setError(sessionId, error.message);
        } catch (redisError: any) {
          console.error("Redis error:", redisError);
        }
        
        try {
          controller.enqueue(
            encoder.encode(
              `event: error\ndata: ${JSON.stringify({ 
                error: error.message,
                stack: error.stack 
              })}\n\n`,
            ),
          );
        } catch (e: any) {
          console.error("Failed to send error event:", e);
        }
        
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
  try {
    const log = async (message: string) => {
      sendEvent("log", { message });
      try {
        await WorkflowManager.addLog(sessionId, message);
      } catch (e: any) {
        console.error("Failed to add log to Redis:", e);
      }
    };

    await log("=== Loading Pre-Generated Proofs ===");

    // Get proof files from deployment directory
    const proofFiles = await getProofFiles();

    await log(`✓ Found ${proofFiles.groth16.length} Groth16 proofs`);
    await log(`✓ Found ${proofFiles.plonk.length} PLONK proofs`);
    await log(`✓ Found ${proofFiles.stark.length} STARK proofs`);

    // Store proof files in session
    await WorkflowManager.storeProofs(sessionId, proofFiles);
    await log("✓ Proofs ready for verification");
  } catch (error: any) {
    console.error("Generate proofs error:", error);
    const errorMessage = error?.message || String(error);
    throw new Error(`Proof generation failed: ${errorMessage}`);
  }
}

async function verifyProofs(
  sessionId: string,
  proofType: string,
  sendEvent: (event: string, data: any) => void,
): Promise<void> {
  try {
    const log = async (message: string) => {
      sendEvent("log", { message });
      await WorkflowManager.addLog(sessionId, message);
    };

    // Use the helper function to verify proofs
    const results = await verifyProofsHelper(proofType, log);

    await log(
      `✓ Verification complete: ${results.circuitsVerified} circuits verified`,
    );
    await log(`✓ Estimated gas: ${results.gasEstimate}`);

    await WorkflowManager.storeVerificationResults(sessionId, results);
  } catch (error: any) {
    throw new Error(`Verification failed: ${error.message}`);
  }
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

  try {
    const log = async (message: string) => {
      sendEvent("log", { message });
      await WorkflowManager.addLog(sessionId, message);
    };

    const onTransaction = (txHash: string) => {
      sendEvent("transaction", { txHash });
    };

    // Use the helper function to attest proofs
    const txHashes = await attestProofsHelper(proofType, log, onTransaction);

    await log(`✓ Attestation complete: ${txHashes.length} proofs attested`);

    await WorkflowManager.storeAttestationResults(sessionId, {
      txHashes,
      network: "Arbitrum Sepolia",
      attestorContract:
        process.env.NEXT_PUBLIC_ATTESTOR_ADDRESS ||
        "0x36e937ebcf56c5dec6ecb0695001becc87738177",
    });
  } catch (error: any) {
    throw new Error(`Attestation failed: ${error.message}`);
  }
}
