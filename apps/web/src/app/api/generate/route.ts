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
    const scriptPath = path.join(projectRoot, 'scripts', 'generate-all-proofs.cjs');

    // Execute the proof generation script
    const { stdout, stderr } = await execAsync(`node ${scriptPath}`, {
      cwd: projectRoot,
      timeout: 60000, // 60 second timeout
    });

    console.log('Generate output:', stdout);
    if (stderr) console.error('Generate errors:', stderr);

    return NextResponse.json({
      success: true,
      message: 'Proofs generated successfully',
      proofType,
      output: stdout,
    });
  } catch (error: any) {
    console.error('Generation error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Failed to generate proofs',
      },
      { status: 500 }
    );
  }
}
