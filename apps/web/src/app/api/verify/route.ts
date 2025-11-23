import { NextRequest, NextResponse } from 'next/server';
import { exec } from 'child_process';
import { promisify } from 'util';
import path from 'path';

const execAsync = promisify(exec);

export async function POST(req: NextRequest) {
  try {
    const { proofType } = await req.json();

    // Path to the root project directory
    const projectRoot = path.join(process.cwd(), '..', '..');
    const scriptPath = path.join(projectRoot, 'scripts', 'verify-with-uzkv.cjs');

    // Execute the verification script
    const { stdout, stderr } = await execAsync(`node ${scriptPath}`, {
      cwd: projectRoot,
      timeout: 30000, // 30 second timeout
    });

    console.log('Verify output:', stdout);
    if (stderr) console.error('Verify errors:', stderr);

    // Parse the output to determine verification status
    const verified = stdout.includes('✅') || stdout.includes('Verified');
    
    // Extract gas estimate from output (mock for now)
    const gasEstimate = proofType === 'groth16' ? 280000 : 
                       proofType === 'plonk' ? 400000 : 540000;

    return NextResponse.json({
      success: true,
      verified,
      gasEstimate,
      proofType,
      output: stdout,
    });
  } catch (error: any) {
    console.error('Verification error:', error);
    return NextResponse.json(
      {
        success: false,
        verified: false,
        error: error.message || 'Failed to verify proofs',
      },
      { status: 500 }
    );
  }
}
