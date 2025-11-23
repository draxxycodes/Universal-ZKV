import { NextRequest, NextResponse } from "next/server";
import { spawn } from "child_process";
import path from "path";

export async function POST(req: NextRequest) {
  try {
    const { proofType } = await req.json();

    // Path to the root project directory
    const projectRoot = path.join(process.cwd(), "..", "..");
    const scriptPath = path.join(
      projectRoot,
      "scripts",
      "verify-with-uzkv.cjs",
    );

    // Execute the verification script and collect output
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

      // Timeout after 30 seconds
      setTimeout(() => {
        child.kill();
        reject(new Error("Verification timeout"));
      }, 30000);
    });

    console.log("Verify output:", output);

    // Parse the output to determine verification status
    const verified = output.includes("✅") && output.includes("Verified");
    const groth16Verified = (output.match(/Groth16.*?✅/gs) || []).length;
    const plonkVerified = (output.match(/PLONK.*?✅/gs) || []).length;
    const starkVerified = (output.match(/STARK.*?✅/gs) || []).length;
    const totalVerified = groth16Verified + plonkVerified + starkVerified;

    // Extract gas estimate from output
    const gasMatch = output.match(/(\d+)k gas/);
    const gasEstimate = gasMatch ? parseInt(gasMatch[1]) * 1000 : 
      (proofType === "groth16" ? 280000 : proofType === "plonk" ? 400000 : 540000);

    return NextResponse.json({
      success: true,
      verified,
      circuitsVerified: totalVerified,
      counts: {
        groth16: groth16Verified,
        plonk: plonkVerified,
        stark: starkVerified
      },
      gasEstimate,
      proofType,
      output: output,
      lines: output.split('\n').filter(line => line.trim()),
    });
  } catch (error: any) {
    console.error("Verification error:", error);
    return NextResponse.json(
      {
        success: false,
        verified: false,
        error: error.message || "Failed to verify proofs",
      },
      { status: 500 },
    );
  }
}
