import { NextRequest, NextResponse } from "next/server";
import { spawn } from "child_process";
import path from "path";

export async function POST(req: NextRequest) {
  try {
    const { proofType } = await req.json();

    // Check if private key is configured
    if (!process.env.PRIVATE_KEY) {
      return NextResponse.json({
        success: false,
        error:
          "Attestation requires PRIVATE_KEY to be configured in .env.local",
        txHash: null,
      });
    }

    // Path to the root project directory
    const projectRoot = path.join(process.cwd(), "..", "..");
    const scriptPath = path.join(projectRoot, "scripts", "attest-proofs.cjs");

    // Execute the attestation script and collect output
    try {
      const output = await new Promise<string>((resolve, reject) => {
        const child = spawn("node", [scriptPath], {
          cwd: projectRoot,
          shell: true,
        });

        let stdout = "";
        let stderr = "";

        child.stdout.on("data", (data) => {
          stdout += data.toString();
        });

        child.stderr.on("data", (data) => {
          stderr += data.toString();
        });

        child.on("close", (code) => {
          if (code !== 0) {
            reject(new Error(stderr || `Process exited with code ${code}`));
          } else {
            resolve(stdout);
          }
        });

        // Timeout after 60 seconds
        setTimeout(() => {
          child.kill();
          reject(new Error("Attestation timeout"));
        }, 60000);
      });

      console.log("Attest output:", output);

      // Extract all transaction hashes from output
      const txHashes = [];
      const txRegex = /(?:Transaction sent|Attested! TX):\s*(0x[a-fA-F0-9]{64})/g;
      let match;
      while ((match = txRegex.exec(output)) !== null) {
        txHashes.push(match[1]);
      }

      // Count successful attestations
      const successCount = (output.match(/✅ Attested!/g) || []).length;
      const groth16Count = output.includes("Attesting Groth16 Proofs:") ? 
        (output.split("Attesting Groth16 Proofs:")[1].split("Attesting PLONK Proofs:")[0].match(/✅ Attested!/g) || []).length : 0;
      const plonkCount = output.includes("Attesting PLONK Proofs:") ? 
        (output.split("Attesting PLONK Proofs:")[1].split("Attesting STARK Proofs:")[0].match(/✅ Attested!/g) || []).length : 0;
      const starkCount = output.includes("Attesting STARK Proofs:") ? 
        (output.split("Attesting STARK Proofs:")[1].split("=== Attestation Summary ===")?.[0]?.match(/✅ Attested!/g) || []).length : 0;

      return NextResponse.json({
        success: true,
        txHashes: txHashes,
        txHash: txHashes[txHashes.length - 1] || null,
        proofType,
        message: "Proofs attested on-chain",
        network: "Arbitrum Sepolia",
        chainId: 421614,
        attestorContract: "0x36e937ebcf56c5dec6ecb0695001becc87738177",
        explorerUrl: txHashes[txHashes.length - 1] ? `https://sepolia.arbiscan.io/tx/${txHashes[txHashes.length - 1]}` : null,
        counts: {
          total: successCount,
          groth16: groth16Count,
          plonk: plonkCount,
          stark: starkCount
        },
        output: output,
        lines: output.split('\n').filter(line => line.trim()),
      });
    } catch (error: any) {
      // Check if proof is already attested
      if (error.message && error.message.includes("already attested")) {
        return NextResponse.json({
          success: true,
          txHash: "already-attested",
          proofType,
          message: "Proofs already attested",
        });
      }
      throw error;
    }
  } catch (error: any) {
    console.error("Attestation error:", error);
    return NextResponse.json(
      {
        success: false,
        txHash: null,
        error: error.message || "Failed to attest proofs",
      },
      { status: 500 },
    );
  }
}
