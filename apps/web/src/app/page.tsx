import Link from "next/link";
import Image from "next/image";
import { ProofSystemCard } from "@/components/ProofSystemCard";
import { WorkflowStep } from "@/components/WorkflowStep";
import { StatCard } from "@/components/StatCard";
import { Footer } from "@/components/Footer";
import { ArrowRight, Github, FileText } from "lucide-react";

export default function HomePage() {
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
                href="/docs"
                className="text-neutral-400 hover:text-yellow-400 transition-colors"
              >
                Docs
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
                className="text-neutral-400 hover:text-yellow-400 transition-colors"
              >
                <Github className="w-5 h-5" />
              </a>
            </div>
          </nav>
        </div>
      </header>

      {/* Hero Section */}
      <div className="container mx-auto px-4 py-20 gradient-mesh">
        <div className="text-center max-w-4xl mx-auto">
          <h1 className="text-5xl md:text-6xl font-black mb-6 bg-gradient-to-r from-yellow-300 via-yellow-400 to-amber-500 bg-clip-text text-transparent drop-shadow-2xl">
            Universal ZK Verifier
          </h1>
          <p className="text-xl md:text-2xl text-neutral-200 mb-6 font-medium">
            One verifier. Three proof systems. Infinite possibilities.
          </p>
          <p className="text-lg text-neutral-400 mb-12">
            Production-ready zero-knowledge proof verification on Arbitrum
            Stylus.
            <br />
            Supporting{" "}
            <span className="text-yellow-400 font-bold">Groth16</span>,{" "}
            <span className="text-yellow-400 font-bold">PLONK</span>, and{" "}
            <span className="text-yellow-400 font-bold">STARK</span> proof
            systems.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              href="/demo"
              className="group px-8 py-4 gradient-yellow hover:gradient-yellow-dark text-black rounded-lg font-semibold text-lg transition-all flex items-center justify-center gap-2 hover-lift"
            >
              Try Live Demo
              <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
            </Link>
            <Link
              href="/benchmarks"
              className="px-8 py-4 bg-[#1a1a1a] border-2 border-yellow-400/30 hover:border-yellow-400 rounded-lg font-semibold text-lg transition-all flex items-center justify-center gap-2 hover-lift"
            >
              <FileText className="w-5 h-5" />
              View Benchmarks
            </Link>
          </div>
        </div>
      </div>

      {/* Stats Section */}
      <div className="container mx-auto px-4 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 max-w-5xl mx-auto">
          <StatCard
            label="Proof Systems"
            value="3"
            sublabel="Groth16, PLONK, STARK"
          />
          <StatCard
            label="Gas Savings"
            value="10x"
            sublabel="vs Solidity EVM"
          />
          <StatCard
            label="Avg Gas Cost"
            value="~295k"
            sublabel="Production-ready"
          />
          <StatCard
            label="Test Proofs"
            value="30,000+"
            sublabel="Valid witnesses"
          />
        </div>
      </div>

      {/* Why UZKV Section */}
      <div className="container mx-auto px-4 py-20 bg-[#0a0a0a] relative overflow-hidden">
        {/* Ambient background gradient */}
        <div className="absolute inset-0 opacity-30">
          <div className="absolute top-0 left-1/4 w-96 h-96 bg-yellow-400/10 rounded-full blur-3xl" />
          <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-amber-600/10 rounded-full blur-3xl" />
        </div>

        <div className="relative z-10">
          <h2 className="text-4xl font-bold text-center mb-4 bg-gradient-to-r from-yellow-300 via-yellow-400 to-amber-500 bg-clip-text text-transparent">
            Why Universal ZK Verifier?
          </h2>
          <p className="text-center text-neutral-400 mb-12 text-lg">
            Built with Rust Stylus for maximum efficiency and flexibility
          </p>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-6xl mx-auto">
            <div className="relative bg-gradient-to-br from-[#1a1a1a] to-[#0f0f0f] rounded-xl p-8 border border-[#2a2a2a] hover:border-yellow-400/50 transition-all hover-lift shadow-xl shadow-black/50 overflow-hidden group">
              <div className="absolute inset-0 bg-gradient-to-br from-yellow-400/0 to-transparent group-hover:from-yellow-400/5 transition-all duration-300 pointer-events-none" />
              <div className="relative z-10">
                <div className="text-4xl mb-4">🦀</div>
                <h3 className="text-2xl font-bold mb-4 bg-gradient-to-r from-yellow-300 to-yellow-500 bg-clip-text text-transparent">
                  Rust Stylus Power
                </h3>
                <p className="text-neutral-300 mb-4">
                  Compiles to WASM for near-native performance, achieving 10x
                  cheaper computation compared to EVM Solidity.
                </p>
                <ul className="text-neutral-400 space-y-2">
                  <li>• Memory-safe verification</li>
                  <li>• EVM-compatible interface</li>
                  <li>• Optimized cryptography</li>
                </ul>
              </div>
            </div>

            <div className="relative bg-gradient-to-br from-[#1a1a1a] to-[#0f0f0f] rounded-xl p-8 border border-[#2a2a2a] hover:border-yellow-400/50 transition-all hover-lift shadow-xl shadow-black/50 overflow-hidden group">
              <div className="absolute inset-0 bg-gradient-to-br from-yellow-400/0 to-transparent group-hover:from-yellow-400/5 transition-all duration-300 pointer-events-none" />
              <div className="relative z-10">
                <div className="text-4xl mb-4">🔐</div>
                <h3 className="text-2xl font-bold mb-4 bg-gradient-to-r from-yellow-300 to-yellow-500 bg-clip-text text-transparent">
                  Production Security
                </h3>
                <p className="text-neutral-300 mb-4">
                  Enterprise-grade security with comprehensive testing and
                  battle-tested cryptographic libraries.
                </p>
                <ul className="text-neutral-400 space-y-2">
                  <li>• ERC-7201 storage layout</li>
                  <li>• Nullifier system</li>
                  <li>• 30,000+ test witnesses</li>
                </ul>
              </div>
            </div>

            <div className="relative bg-gradient-to-br from-[#1a1a1a] to-[#0f0f0f] rounded-xl p-8 border border-[#2a2a2a] hover:border-yellow-400/50 transition-all hover-lift shadow-xl shadow-black/50 overflow-hidden group">
              <div className="absolute inset-0 bg-gradient-to-br from-yellow-400/0 to-transparent group-hover:from-yellow-400/5 transition-all duration-300 pointer-events-none" />
              <div className="relative z-10">
                <div className="text-4xl mb-4">⚡</div>
                <h3 className="text-2xl font-bold mb-4 bg-gradient-to-r from-yellow-300 to-yellow-500 bg-clip-text text-transparent">
                  True Universal
                </h3>
                <p className="text-neutral-300 mb-4">
                  Single contract interface supporting three different proof
                  systems with intelligent routing.
                </p>
                <ul className="text-neutral-400 space-y-2">
                  <li>• One function for all proofs</li>
                  <li>• Automatic type detection</li>
                  <li>• Flexible circuit support</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Proof Systems Comparison */}
      <div className="container mx-auto px-4 py-20">
        <h2 className="text-4xl font-bold text-center mb-4 bg-gradient-to-r from-yellow-300 via-yellow-400 to-amber-500 bg-clip-text text-transparent">
          Supported Proof Systems
        </h2>
        <p className="text-center text-neutral-400 mb-12 text-lg">
          Choose the right proof system for your use case
        </p>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-6xl mx-auto">
          <ProofSystemCard
            name="Groth16"
            gas="~280k"
            color="from-yellow-400 to-yellow-600"
            features={[
              "Trusted setup required",
              "Smallest proof size",
              "Battle-tested security",
              "Fastest verification",
            ]}
          />

          <ProofSystemCard
            name="PLONK"
            gas="~400k"
            color="from-yellow-500 to-yellow-600"
            features={[
              "Universal setup",
              "Flexible circuits",
              "Moderate gas cost",
              "Modern standard",
            ]}
          />

          <ProofSystemCard
            name="STARK"
            gas="~540k"
            color="from-yellow-600 to-orange-600"
            features={[
              "Transparent setup",
              "Post-quantum secure",
              "Larger proofs",
              "No trusted setup",
            ]}
          />
        </div>
      </div>

      {/* How It Works */}
      <div className="container mx-auto px-4 py-20 bg-gradient-to-br from-[#0a0a0a] to-[#050505] rounded-3xl my-20 relative overflow-hidden border border-[#1a1a1a]">
        {/* Subtle corner gradients */}
        <div className="absolute top-0 right-0 w-64 h-64 bg-yellow-400/5 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-64 h-64 bg-amber-600/5 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10">
          <h2 className="text-4xl font-bold text-center mb-4 bg-gradient-to-r from-yellow-300 via-yellow-400 to-amber-500 bg-clip-text text-transparent">
            How It Works
          </h2>
          <p className="text-center text-neutral-400 mb-12 text-lg">
            Complete workflow from generation to on-chain attestation
          </p>

          <div className="max-w-4xl mx-auto">
            <div className="space-y-8">
              <WorkflowStep
                number={1}
                title="Generate Proof"
                description="Create zero-knowledge proofs using Circom circuits (Poseidon, EdDSA, Merkle). Random witness selection from 30,000+ valid inputs ensures fresh proofs every time."
              />
              <WorkflowStep
                number={2}
                title="Verify Locally (UZKV)"
                description="Universal dispatcher routes proofs to appropriate verifier (Groth16/PLONK/STARK). Rust-powered verification ensures correctness before on-chain submission."
              />
              <WorkflowStep
                number={3}
                title="Attest On-Chain"
                description="Submit SHA-256 proof hashes to Attestor contract on Arbitrum Sepolia. Only ~50k gas per attestation with duplicate prevention built-in."
              />
            </div>
          </div>

          <div className="text-center mt-12">
            <Link
              href="/demo"
              className="inline-flex items-center gap-2 px-8 py-4 bg-gradient-to-r from-yellow-400 via-yellow-500 to-amber-600 hover:from-yellow-300 hover:to-amber-500 rounded-lg font-bold transition-all shadow-xl shadow-yellow-400/20 hover:shadow-yellow-400/40 hover:scale-105 text-black"
            >
              Run Complete Workflow
              <ArrowRight className="w-5 h-5" />
            </Link>
          </div>

          {/* Command Preview */}
          <div className="mt-12 max-w-3xl mx-auto bg-gradient-to-br from-black to-[#0a0a0a] rounded-lg p-6 border border-yellow-400/20 shadow-lg shadow-yellow-400/10">
            <p className="text-neutral-400 text-sm mb-2 font-semibold">
              One-Command Workflow:
            </p>
            <code className="text-yellow-400 font-mono text-lg">
              node scripts/complete-workflow.cjs
            </code>
            <p className="text-neutral-500 text-sm mt-3">
              Generates → Verifies → Attests automatically
            </p>
          </div>
        </div>
      </div>

      {/* Architecture Section */}
      <div className="container mx-auto px-4 py-20">
        <h2 className="text-4xl font-bold text-center mb-4 bg-gradient-to-r from-yellow-300 via-yellow-400 to-amber-500 bg-clip-text text-transparent">
          Universal Verifier Architecture
        </h2>
        <p className="text-center text-neutral-400 mb-12 text-lg">
          Single entry point routing to specialized verifiers
        </p>

        <div className="max-w-5xl mx-auto bg-gradient-to-br from-[#1a1a1a] to-[#0f0f0f] rounded-lg p-8 border border-yellow-400/20 shadow-2xl shadow-yellow-400/10">
          <Image
            src="/architecture.png"
            alt="Universal ZK Verifier Architecture Diagram"
            width={1200}
            height={800}
            className="w-full h-auto rounded-lg"
            priority
          />
        </div>

        <div className="max-w-3xl mx-auto mt-8 text-center">
          <p className="text-neutral-300 text-lg">
            The Universal Verifier routes proofs to specialized modules based on
            type, providing a single interface for Groth16, PLONK, and STARK
            verification.
          </p>
        </div>
      </div>

      {/* Use Cases Section */}
      <div className="container mx-auto px-4 py-20 relative overflow-hidden">
        {/* Background ambient glow */}
        <div className="absolute inset-0 opacity-20">
          <div className="absolute top-1/2 left-1/4 w-96 h-96 bg-yellow-400/10 rounded-full blur-3xl" />
          <div className="absolute top-1/2 right-1/4 w-96 h-96 bg-amber-600/10 rounded-full blur-3xl" />
        </div>

        <div className="relative z-10">
          <h2 className="text-4xl font-bold text-center mb-4 bg-gradient-to-r from-yellow-300 via-yellow-400 to-amber-500 bg-clip-text text-transparent">
            Real-World Use Cases
          </h2>
          <p className="text-center text-neutral-400 mb-12 text-lg">
            Powering privacy and scalability across applications
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-5xl mx-auto">
            <div className="relative bg-gradient-to-br from-[#1a1a1a] to-[#0f0f0f] rounded-xl p-8 border border-[#2a2a2a] hover:border-yellow-400/50 transition-all hover-lift shadow-xl shadow-black/50 overflow-hidden group">
              <div className="absolute inset-0 bg-gradient-to-br from-yellow-400/0 to-transparent group-hover:from-yellow-400/5 transition-all duration-300 pointer-events-none" />
              <div className="relative z-10">
                <h3 className="text-2xl font-bold mb-4 bg-gradient-to-r from-yellow-300 to-yellow-500 bg-clip-text text-transparent">
                  DeFi Protocols
                </h3>
                <p className="text-neutral-300 mb-4">
                  Multi-step verification workflow: Identity (Groth16 + EdDSA) →
                  Whitelist (Groth16 + Merkle) → State Transition (PLONK +
                  Poseidon) → Computation (STARK) → Finalization (PLONK + EdDSA)
                </p>
                <p className="text-yellow-400 text-sm font-semibold">
                  Total: ~2,115k gas for complete DeFi transaction
                </p>
              </div>
            </div>

            <div className="relative bg-gradient-to-br from-[#1a1a1a] to-[#0f0f0f] rounded-xl p-8 border border-[#2a2a2a] hover:border-yellow-400/50 transition-all hover-lift shadow-xl shadow-black/50 overflow-hidden group">
              <div className="absolute inset-0 bg-gradient-to-br from-yellow-400/0 to-transparent group-hover:from-yellow-400/5 transition-all duration-300 pointer-events-none" />
              <div className="relative z-10">
                <h3 className="text-2xl font-bold mb-4 bg-gradient-to-r from-yellow-300 to-yellow-500 bg-clip-text text-transparent">
                  Privacy-Preserving Auth
                </h3>
                <p className="text-neutral-300 mb-4">
                  Verify EdDSA signatures without revealing private keys.
                  Perfect for authentication systems requiring zero-knowledge
                  proofs.
                </p>
                <p className="text-yellow-400 text-sm font-semibold">
                  ~285k gas with Groth16 for fastest verification
                </p>
              </div>
            </div>

            <div className="relative bg-gradient-to-br from-[#1a1a1a] to-[#0f0f0f] rounded-xl p-8 border border-[#2a2a2a] hover:border-yellow-400/50 transition-all hover-lift shadow-xl shadow-black/50 overflow-hidden group">
              <div className="absolute inset-0 bg-gradient-to-br from-yellow-400/0 to-transparent group-hover:from-yellow-400/5 transition-all duration-300 pointer-events-none" />
              <div className="relative z-10">
                <h3 className="text-2xl font-bold mb-4 bg-gradient-to-r from-yellow-300 to-yellow-500 bg-clip-text text-transparent">
                  ZK-Rollups
                </h3>
                <p className="text-neutral-300 mb-4">
                  Use PLONK's universal setup for flexible circuit updates.
                  Poseidon hash integration for efficient state commitments.
                </p>
                <p className="text-yellow-400 text-sm font-semibold">
                  ~400k gas with universal circuit flexibility
                </p>
              </div>
            </div>

            <div className="relative bg-gradient-to-br from-[#1a1a1a] to-[#0f0f0f] rounded-xl p-8 border border-[#2a2a2a] hover:border-yellow-400/50 transition-all hover-lift shadow-xl shadow-black/50 overflow-hidden group">
              <div className="absolute inset-0 bg-gradient-to-br from-yellow-400/0 to-transparent group-hover:from-yellow-400/5 transition-all duration-300 pointer-events-none" />
              <div className="relative z-10">
                <h3 className="text-2xl font-bold mb-4 bg-gradient-to-r from-yellow-300 to-yellow-500 bg-clip-text text-transparent">
                  Post-Quantum Security
                </h3>
                <p className="text-neutral-300 mb-4">
                  STARK proofs provide transparent setup and quantum-resistant
                  security. Ideal for long-term security requirements.
                </p>
                <p className="text-yellow-400 text-sm font-semibold">
                  ~540k gas with no trusted setup needed
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* CTA Section */}
      <div className="container mx-auto px-4 py-20">
        <div className="max-w-3xl mx-auto text-center bg-gradient-to-br from-yellow-400/10 via-amber-500/10 to-orange-600/10 border border-yellow-400/30 rounded-2xl p-12 shadow-2xl shadow-yellow-400/5">
          <h2 className="text-3xl md:text-4xl font-bold mb-6 bg-gradient-to-r from-yellow-400 via-amber-500 to-yellow-600 bg-clip-text text-transparent">
            Ready to Verify Proofs?
          </h2>
          <p className="text-lg mb-8 text-neutral-300">
            Experience the complete workflow: Generate → Verify → Attest
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              href="/demo"
              className="inline-block px-10 py-4 bg-gradient-to-r from-yellow-400 to-amber-500 hover:from-yellow-500 hover:to-amber-600 text-black rounded-lg font-semibold text-lg transition-all hover-lift shadow-lg shadow-yellow-400/20"
            >
              Launch Interactive Demo
            </Link>
            <Link
              href="/docs"
              className="inline-block px-10 py-4 bg-[#1a1a1a] border-2 border-yellow-400/50 hover:border-yellow-400 hover:bg-yellow-400/10 rounded-lg font-semibold text-lg transition-all hover-lift"
            >
              Read Documentation
            </Link>
          </div>
        </div>
      </div>

      {/* Footer */}
      <Footer />
    </div>
  );
}
