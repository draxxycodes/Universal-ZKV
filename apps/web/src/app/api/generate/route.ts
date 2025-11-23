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
      "generate-all-proofs.cjs",
    );

    // Execute the proof generation script and collect output
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
        reject(new Error("Generation timeout"));
      }, 60000);
    });

    console.log("Generate output:", output);

    // Parse output to extract details
    const circuits = ["poseidon_test", "eddsa_verify", "merkle_proof"];
    const groth16Count = (output.match(/Groth16 proof copied/g) || []).length;
    const plonkCount = (output.match(/PLONK proof generated/g) || []).length;
    const starkCount = (output.match(/STARK UniversalProof \(binary\) created/g) || []).length;
    
    return NextResponse.json({
      success: true,
      message: "Proofs generated successfully",
      proofType,
      circuits,
      counts: {
        groth16: groth16Count,
        plonk: plonkCount,
        stark: starkCount
      },
      output: output,
      lines: output.split('\n').filter(line => line.trim()),
    });
  } catch (error: any) {
    console.error("Generation error:", error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || "Failed to generate proofs",
      },
      { status: 500 },
    );
  }
}
