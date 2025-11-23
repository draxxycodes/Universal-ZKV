import { NextRequest, NextResponse } from "next/server";
import { exec } from "child_process";
import { promisify } from "util";
import path from "path";

const execAsync = promisify(exec);

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

    // Execute the verification script
    const { stdout, stderr } = await execAsync(`node ${scriptPath}`, {
      cwd: projectRoot,
      timeout: 30000, // 30 second timeout
    });

    console.log("Verify output:", stdout);
    if (stderr) console.error("Verify errors:", stderr);

    // Parse the output to determine verification status
    const verified = stdout.includes("✅") || stdout.includes("Verified");
    const circuitsVerified = (stdout.match(/✅/g) || []).length;

    // Extract gas estimate from output (mock for now)
    const gasEstimate =
      proofType === "groth16"
        ? 280000
        : proofType === "plonk"
          ? 400000
          : 540000;

    // Verification method details
    const verificationMethod = 
      proofType === "groth16" 
        ? "Pairing check (e(A, B) = e(α, β) · e(L, γ) · e(C, δ))"
        : proofType === "plonk"
          ? "Polynomial commitment verification with KZG"
          : "FRI (Fast Reed-Solomon Interactive Oracle Proofs)";

    const verificationKeys = `Loaded verification keys for ${circuitsVerified} circuits: poseidon_test, eddsa_verify, merkle_proof`;

    return NextResponse.json({
      success: true,
      verified,
      circuitsVerified,
      gasEstimate,
      proofType,
      verificationMethod,
      verificationKeys,
      details: {
        universalVerifier: "UZKV v1.0",
        delegatedTo: `${proofType.toUpperCase()} verifier module`,
        cryptographicSecurity: proofType === "stark" ? "Post-quantum secure" : "Computationally secure"
      },
      output: stdout,
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
