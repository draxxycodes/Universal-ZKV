"use client";

import Link from "next/link";
import Image from "next/image";
import {
  Book,
  Rocket,
  TestTube,
  Code,
  FileText,
  Github,
  ArrowRight,
} from "lucide-react";

export default function DocsPage() {
  return (
    <div className="min-h-screen bg-black text-white">
      {/* Header */}
      <header className="border-b border-[#2a2a2a] bg-black/50 backdrop-blur-sm sticky top-0 z-50">
        <div className="container mx-auto px-4 py-6">
          <nav className="flex justify-between items-center">
            <Link
              href="/"
              className="text-3xl font-black tracking-tight bg-gradient-to-r from-yellow-400 via-amber-500 to-yellow-600 bg-clip-text text-transparent hover:from-yellow-300 hover:to-yellow-500 transition-all"
            >
              UZKV
            </Link>
            <div className="flex gap-6 items-center">
              <Link
                href="/demo"
                className="text-neutral-400 hover:text-yellow-400 transition-colors"
              >
                Demo
              </Link>
              <Link
                href="/benchmarks"
                className="text-neutral-400 hover:text-yellow-400 transition-colors"
              >
                Benchmarks
              </Link>
              <Link
                href="/attestations"
                className="text-neutral-400 hover:text-yellow-400 transition-colors"
              >
                Attestations
              </Link>
              <a
                href="https://github.com/draxxycodes/Universal-ZKV"
                target="_blank"
                rel="noopener noreferrer"
                className="px-6 py-2 gradient-yellow text-black hover:gradient-yellow-dark rounded-lg font-medium transition-all"
              >
                GitHub
              </a>
            </div>
          </nav>
        </div>
      </header>

      <div className="container mx-auto px-4 py-12">
        <div className="max-w-6xl mx-auto">
          {/* Title */}
          <div className="text-center mb-12">
            <h1 className="text-4xl md:text-5xl font-bold mb-4">
              Documentation
            </h1>
            <p className="text-xl text-neutral-300">
              Everything you need to build with Universal ZK Verifier
            </p>
          </div>

          {/* Quick Links */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-16">
            <Link
              href="#quick-start"
              className="group bg-[#1a1a1a] rounded-xl p-6 border border-[#2a2a2a] hover:border-yellow-400 transition"
            >
              <Rocket className="w-12 h-12 text-yellow-400 mb-4" />
              <h3 className="text-xl font-bold mb-2 group-hover:text-yellow-400 transition">
                Quick Start
              </h3>
              <p className="text-neutral-400 text-sm">
                Get up and running in 5 minutes
              </p>
            </Link>

            <Link
              href="#testing"
              className="group bg-[#1a1a1a] rounded-xl p-6 border border-[#2a2a2a] hover:border-yellow-500 transition"
            >
              <TestTube className="w-12 h-12 text-yellow-400 mb-4" />
              <h3 className="text-xl font-bold mb-2 group-hover:text-yellow-400 transition">
                Testing Guide
              </h3>
              <p className="text-neutral-400 text-sm">
                Test all 3 proof systems
              </p>
            </Link>

            <Link
              href="#usage"
              className="group bg-[#1a1a1a] rounded-xl p-6 border border-[#2a2a2a] hover:border-yellow-600 transition"
            >
              <Code className="w-12 h-12 text-yellow-400 mb-4" />
              <h3 className="text-xl font-bold mb-2 group-hover:text-yellow-400 transition">
                Usage Examples
              </h3>
              <p className="text-neutral-400 text-sm">
                Integration code samples
              </p>
            </Link>
          </div>

          {/* Quick Start Section */}
          <section id="quick-start" className="mb-16 scroll-mt-20">
            <div className="flex items-center gap-3 mb-6">
              <Rocket className="w-8 h-8 text-yellow-400" />
              <h2 className="text-3xl font-bold">Quick Start</h2>
            </div>

            <div className="bg-[#1a1a1a] rounded-xl p-8 border border-[#2a2a2a]">
              <h3 className="text-2xl font-bold mb-4">Installation</h3>
              <div className="space-y-4">
                <div>
                  <p className="text-neutral-300 mb-2">
                    1. Clone the repository:
                  </p>
                  <div className="bg-black rounded-lg p-4 font-mono text-sm text-yellow-400">
                    git clone https://github.com/draxxycodes/Universal-ZKV.git
                    <br />
                    cd Universal-ZKV
                  </div>
                </div>

                <div>
                  <p className="text-neutral-300 mb-2">
                    2. Install dependencies:
                  </p>
                  <div className="bg-black rounded-lg p-4 font-mono text-sm text-yellow-400">
                    pnpm install
                  </div>
                </div>

                <div>
                  <p className="text-neutral-300 mb-2">
                    3. Build the Stylus contract:
                  </p>
                  <div className="bg-black rounded-lg p-4 font-mono text-sm text-yellow-400">
                    cd packages/stylus
                    <br />
                    cargo build --release --target wasm32-unknown-unknown
                  </div>
                </div>

                <div>
                  <p className="text-neutral-300 mb-2">
                    4. Run the complete workflow:
                  </p>
                  <div className="bg-black rounded-lg p-4 font-mono text-sm text-yellow-400">
                    node scripts/complete-workflow.cjs
                  </div>
                  <p className="text-neutral-400 text-sm mt-2">
                    This generates → verifies → attests proofs automatically
                  </p>
                </div>
              </div>

              <div className="mt-8 p-6 bg-blue-900/20 rounded-lg border border-blue-500/30">
                <h4 className="text-lg font-bold mb-3 text-yellow-400">
                  What This Does:
                </h4>
                <ul className="space-y-2 text-neutral-300">
                  <li>
                    ✅ Generates fresh proofs for all 3 systems (Groth16, PLONK,
                    STARK)
                  </li>
                  <li>✅ Randomly selects from 30,000+ valid witnesses</li>
                  <li>✅ Verifies proofs locally using UZKV</li>
                  <li>✅ Attests proof hashes to Arbitrum Sepolia</li>
                </ul>
              </div>
            </div>
          </section>

          {/* Testing Guide Section */}
          <section id="testing" className="mb-16 scroll-mt-20">
            <div className="flex items-center gap-3 mb-6">
              <TestTube className="w-8 h-8 text-yellow-400" />
              <h2 className="text-3xl font-bold">Testing Guide</h2>
            </div>

            <div className="bg-[#1a1a1a] rounded-xl p-8 border border-[#2a2a2a]">
              <h3 className="text-2xl font-bold mb-4">
                Test All Proof Systems
              </h3>

              <div className="space-y-6">
                <div>
                  <h4 className="text-xl font-semibold mb-3 text-yellow-400">
                    Test Groth16
                  </h4>
                  <div className="bg-black rounded-lg p-4 font-mono text-sm text-yellow-400 mb-2">
                    cd packages/stylus
                    <br />
                    cargo test groth16 --release -- --nocapture
                  </div>
                  <p className="text-neutral-400 text-sm">
                    Tests Poseidon, EdDSA, and Merkle circuits with Groth16
                  </p>
                </div>

                <div>
                  <h4 className="text-xl font-semibold mb-3 text-yellow-400">
                    Test PLONK
                  </h4>
                  <div className="bg-black rounded-lg p-4 font-mono text-sm text-yellow-400 mb-2">
                    cargo test plonk --release -- --nocapture
                  </div>
                  <p className="text-neutral-400 text-sm">
                    120+ PLONK test proofs with universal setup
                  </p>
                </div>

                <div>
                  <h4 className="text-xl font-semibold mb-3 text-yellow-400">
                    Test STARK
                  </h4>
                  <div className="bg-black rounded-lg p-4 font-mono text-sm text-yellow-400 mb-2">
                    cargo test stark --release -- --nocapture
                  </div>
                  <p className="text-neutral-400 text-sm">
                    Fibonacci STARK proof with transparent setup
                  </p>
                </div>

                <div>
                  <h4 className="text-xl font-semibold mb-3 text-yellow-400">
                    Complete E2E Test
                  </h4>
                  <div className="bg-black rounded-lg p-4 font-mono text-sm text-yellow-400 mb-2">
                    cargo test universal_verifier_e2e --release -- --nocapture
                  </div>
                  <p className="text-neutral-400 text-sm">
                    Full DeFi workflow: Identity → Whitelist → State →
                    Computation → Finalize
                  </p>
                </div>
              </div>

              <div className="mt-8 p-6 bg-green-900/20 rounded-lg border border-green-500/30">
                <h4 className="text-lg font-bold mb-3 text-yellow-400">
                  Expected Output:
                </h4>
                <div className="bg-black rounded-lg p-4 font-mono text-xs text-neutral-300">
                  🌟 UNIVERSAL VERIFIER - COMPLETE WORKFLOW TEST
                  <br />
                  ============================================================
                  <br />
                  📝 Step 1: Identity Verification (Groth16 + EdDSA)
                  <br />
                  ✅ User identity verified
                  <br />
                  <br />
                  📝 Step 2: Whitelist Verification (Groth16 + Merkle)
                  <br />
                  ✅ Whitelist membership verified
                  <br />
                  <br />
                  📝 Step 3: State Transition (PLONK + Poseidon)
                  <br />
                  ✅ State transition verified
                  <br />
                  <br />
                  📝 Step 4: Computational Integrity (STARK + Fibonacci)
                  <br />
                  ✅ Computation integrity verified
                  <br />
                  <br />
                  📝 Step 5: Transaction Finalization (PLONK + EdDSA)
                  <br />
                  ✅ Transaction finalized
                  <br />
                  <br />
                  🎉 UNIVERSAL VERIFIER WORKFLOW: SUCCESS
                </div>
              </div>
            </div>
          </section>

          {/* Usage Examples Section */}
          <section id="usage" className="mb-16 scroll-mt-20">
            <div className="flex items-center gap-3 mb-6">
              <Code className="w-8 h-8 text-yellow-400" />
              <h2 className="text-3xl font-bold">Usage Examples</h2>
            </div>

            <div className="bg-[#1a1a1a] rounded-xl p-8 border border-[#2a2a2a]">
              <h3 className="text-2xl font-bold mb-4">
                TypeScript Integration
              </h3>

              <div className="space-y-6">
                <div>
                  <h4 className="text-xl font-semibold mb-3">
                    Verify Any Proof Type
                  </h4>
                  <div className="bg-black rounded-lg p-4 font-mono text-sm overflow-x-auto">
                    <pre className="text-neutral-300">
                      {`import { ethers } from 'ethers';

const contractAddress = "0x..."; // Your deployed UZKV
const abi = [
  "function verify(uint8 proofType, bytes proof, bytes publicInputs, bytes32 vkHash) external returns (bool)"
];

const provider = new ethers.JsonRpcProvider(
  "https://sepolia-rollup.arbitrum.io/rpc"
);
const signer = new ethers.Wallet(privateKey, provider);
const uzkv = new ethers.Contract(contractAddress, abi, signer);

// Verify Groth16 proof
const isValid = await uzkv.verify(
  0,              // Groth16 proof type
  proof,
  publicInputs,
  vkHash
);

console.log("Groth16 verification:", isValid);`}
                    </pre>
                  </div>
                </div>

                <div>
                  <h4 className="text-xl font-semibold mb-3">
                    Complete DeFi Workflow
                  </h4>
                  <div className="bg-black rounded-lg p-4 font-mono text-sm overflow-x-auto">
                    <pre className="text-neutral-300">
                      {`class UniversalVerifierClient {
  async verifyCompleteWorkflow(
    identityProof,    // Groth16 + EdDSA
    whitelistProof,   // Groth16 + Merkle
    stateProof,       // PLONK + Poseidon
    computeProof,     // STARK + Fibonacci
    finalizeProof     // PLONK + EdDSA
  ) {
    // Step 1: Verify identity
    await this.verifyProof(0, identityProof.proof, 
      identityProof.inputs, identityProof.vk);
    
    // Step 2: Verify whitelist membership
    await this.verifyProof(0, whitelistProof.proof, 
      whitelistProof.inputs, whitelistProof.vk);
    
    // Step 3: Verify state transition
    await this.verifyProof(1, stateProof.proof, 
      stateProof.inputs, stateProof.vk);
    
    // Step 4: Verify computation (no VK needed)
    await this.verifyProof(2, computeProof.proof, 
      computeProof.inputs);
    
    // Step 5: Finalize transaction
    await this.verifyProof(1, finalizeProof.proof, 
      finalizeProof.inputs, finalizeProof.vk);
    
    return true;
  }
}`}
                    </pre>
                  </div>
                </div>
              </div>

              <div className="mt-8 p-6 bg-pink-900/20 rounded-lg border border-pink-500/30">
                <h4 className="text-lg font-bold mb-3 text-yellow-400">
                  Proof Type Reference:
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                  <div>
                    <p className="font-semibold text-yellow-400">Groth16 = 0</p>
                    <p className="text-neutral-400">~280k gas, trusted setup</p>
                  </div>
                  <div>
                    <p className="font-semibold text-yellow-400">PLONK = 1</p>
                    <p className="text-neutral-400">
                      ~400k gas, universal setup
                    </p>
                  </div>
                  <div>
                    <p className="font-semibold text-yellow-400">STARK = 2</p>
                    <p className="text-neutral-400">
                      ~540k gas, transparent setup
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* Architecture Section */}
          <section id="architecture" className="mb-16 scroll-mt-20">
            <div className="flex items-center gap-3 mb-6">
              <FileText className="w-8 h-8 text-yellow-400" />
              <h2 className="text-3xl font-bold">Architecture</h2>
            </div>

            <div className="bg-[#1a1a1a] rounded-xl p-8 border border-[#2a2a2a]">
              <h3 className="text-2xl font-bold mb-4">
                Universal Verifier Pattern
              </h3>

              <div className="mb-6">
                <Image
                  src="/architecture.png"
                  alt="Universal ZK Verifier Architecture - Local Verification and On-Chain Attestation"
                  width={1200}
                  height={800}
                  className="w-full h-auto rounded-lg"
                />
              </div>

              <div className="space-y-4 text-neutral-300">
                <p>
                  <strong className="text-white">
                    Why Split Architecture?
                  </strong>
                </p>
                <ul className="space-y-2 ml-6">
                  <li>
                    • <strong>UZKV (39.5 KB)</strong> - Too large for on-chain
                    deployment, perfect for local verification
                  </li>
                  <li>
                    • <strong>Attestor (8 KB)</strong> - Lightweight hash
                    storage, deployed on Arbitrum Sepolia
                  </li>
                  <li>
                    • <strong>Security</strong> - Full verification happens
                    locally before on-chain attestation
                  </li>
                  <li>
                    • <strong>Cost Efficiency</strong> - Only store proof hashes
                    on-chain (~50k gas vs ~295k)
                  </li>
                  <li>
                    • <strong>Flexibility</strong> - Upgrade local verification
                    without redeployment
                  </li>
                </ul>
              </div>
            </div>
          </section>

          {/* Resources Section */}
          <section className="mb-16">
            <h2 className="text-3xl font-bold mb-6">Additional Resources</h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <a
                href="https://github.com/draxxycodes/Universal-ZKV"
                target="_blank"
                rel="noopener noreferrer"
                className="group bg-[#1a1a1a] rounded-xl p-6 border border-[#2a2a2a] hover:border-yellow-400 transition"
              >
                <div className="flex items-center gap-3 mb-3">
                  <Github className="w-6 h-6 text-yellow-400" />
                  <h3 className="text-xl font-bold group-hover:text-yellow-400 transition">
                    GitHub Repository
                  </h3>
                </div>
                <p className="text-neutral-400 text-sm">
                  Full source code, examples, and contribution guidelines
                </p>
              </a>

              <a
                href="https://sepolia.arbiscan.io/address/0x36e937ebcf56c5dec6ecb0695001becc87738177"
                target="_blank"
                rel="noopener noreferrer"
                className="group bg-[#1a1a1a] rounded-xl p-6 border border-[#2a2a2a] hover:border-yellow-500 transition"
              >
                <div className="flex items-center gap-3 mb-3">
                  <FileText className="w-6 h-6 text-yellow-400" />
                  <h3 className="text-xl font-bold group-hover:text-yellow-400 transition">
                    Attestor Contract
                  </h3>
                </div>
                <p className="text-neutral-400 text-sm">
                  View on-chain attestations on Arbitrum Sepolia
                </p>
              </a>

              <Link
                href="/benchmarks"
                className="group bg-[#1a1a1a] rounded-xl p-6 border border-[#2a2a2a] hover:border-yellow-600 transition"
              >
                <div className="flex items-center gap-3 mb-3">
                  <FileText className="w-6 h-6 text-yellow-400" />
                  <h3 className="text-xl font-bold group-hover:text-yellow-400 transition">
                    Gas Benchmarks
                  </h3>
                </div>
                <p className="text-neutral-400 text-sm">
                  Detailed gas cost comparison across all proof systems
                </p>
              </Link>

              <Link
                href="/demo"
                className="group bg-[#1a1a1a] rounded-xl p-6 border border-[#2a2a2a] hover:border-green-500 transition"
              >
                <div className="flex items-center gap-3 mb-3">
                  <Rocket className="w-6 h-6 text-yellow-400" />
                  <h3 className="text-xl font-bold group-hover:text-yellow-400 transition">
                    Interactive Demo
                  </h3>
                </div>
                <p className="text-neutral-400 text-sm">
                  Try the complete workflow in your browser
                </p>
              </Link>
            </div>
          </section>

          {/* CTA */}
          <div className="bg-gradient-to-r from-yellow-400 via-yellow-500 to-orange-600 rounded-2xl p-12 text-center">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              Ready to Build?
            </h2>
            <p className="text-lg mb-8 text-blue-100">
              Join the zero-knowledge proof revolution on Arbitrum
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link
                href="/demo"
                className="inline-flex items-center justify-center gap-2 px-8 py-3 bg-white text-black hover:bg-slate-100 rounded-lg font-semibold transition"
              >
                Try Demo
                <ArrowRight className="w-5 h-5" />
              </Link>
              <a
                href="https://github.com/draxxycodes/Universal-ZKV"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center justify-center gap-2 px-8 py-3 bg-transparent border-2 border-white hover:bg-white/10 rounded-lg font-semibold transition"
              >
                <Github className="w-5 h-5" />
                View on GitHub
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
