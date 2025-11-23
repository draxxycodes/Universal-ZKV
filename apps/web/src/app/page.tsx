import Link from 'next/link';
import { ProofSystemCard } from '@/components/ProofSystemCard';
import { WorkflowStep } from '@/components/WorkflowStep';
import { StatCard } from '@/components/StatCard';
import { ArrowRight, Github, FileText } from 'lucide-react';

export default function HomePage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-900 via-slate-800 to-slate-900 text-white">
      {/* Header */}
      <header className="container mx-auto px-4 py-6">
        <nav className="flex justify-between items-center">
          <div className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-purple-500">
            UZKV
          </div>
          <div className="flex gap-6 items-center">
            <Link href="/demo" className="hover:text-blue-400 transition">
              Demo
            </Link>
            <Link href="/benchmarks" className="hover:text-blue-400 transition">
              Benchmarks
            </Link>
            <Link href="/attestations" className="hover:text-blue-400 transition">
              Attestations
            </Link>
            <a 
              href="https://github.com/draxxycodes/Universal-ZKV" 
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-blue-400 transition"
            >
              <Github className="w-5 h-5" />
            </a>
          </div>
        </nav>
      </header>

      {/* Hero Section */}
      <div className="container mx-auto px-4 py-20">
        <div className="text-center max-w-4xl mx-auto">
          <h1 className="text-5xl md:text-6xl font-bold mb-6 bg-clip-text text-transparent bg-gradient-to-r from-blue-400 via-purple-500 to-pink-500">
            Universal ZK Verifier
          </h1>
          <p className="text-xl md:text-2xl text-slate-300 mb-6">
            One verifier. Three proof systems. Infinite possibilities.
          </p>
          <p className="text-lg text-slate-400 mb-12">
            Production-ready zero-knowledge proof verification on Arbitrum Stylus.
            <br />
            Supporting <span className="text-blue-400 font-semibold">Groth16</span>, {' '}
            <span className="text-purple-400 font-semibold">PLONK</span>, and {' '}
            <span className="text-pink-400 font-semibold">STARK</span> proof systems.
          </p>
          
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link 
              href="/demo"
              className="group px-8 py-4 bg-blue-600 hover:bg-blue-700 rounded-lg font-semibold text-lg transition flex items-center justify-center gap-2"
            >
              Try Live Demo
              <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
            </Link>
            <Link 
              href="/benchmarks"
              className="px-8 py-4 bg-slate-700 hover:bg-slate-600 rounded-lg font-semibold text-lg transition flex items-center justify-center gap-2"
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
            sublabel="vs Solidity"
          />
          <StatCard 
            label="Avg Gas Cost"
            value="~295k"
            sublabel="Highly optimized"
          />
          <StatCard 
            label="Circuits"
            value="270+"
            sublabel="Test coverage"
          />
        </div>
      </div>

      {/* Proof Systems Comparison */}
      <div className="container mx-auto px-4 py-20">
        <h2 className="text-4xl font-bold text-center mb-4">
          Supported Proof Systems
        </h2>
        <p className="text-center text-slate-400 mb-12 text-lg">
          Choose the right proof system for your use case
        </p>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-6xl mx-auto">
          <ProofSystemCard
            name="Groth16"
            gas="~280k"
            color="from-blue-500 to-blue-600"
            features={[
              "Trusted setup required",
              "Smallest proof size",
              "Battle-tested security",
              "Fastest verification"
            ]}
          />
          
          <ProofSystemCard
            name="PLONK"
            gas="~400k"
            color="from-purple-500 to-purple-600"
            features={[
              "Universal setup",
              "Flexible circuits",
              "Moderate gas cost",
              "Modern standard"
            ]}
          />
          
          <ProofSystemCard
            name="STARK"
            gas="~540k"
            color="from-pink-500 to-pink-600"
            features={[
              "Transparent setup",
              "Post-quantum secure",
              "Larger proofs",
              "No trusted setup"
            ]}
          />
        </div>
      </div>

      {/* How It Works */}
      <div className="container mx-auto px-4 py-20 bg-slate-800/30 rounded-3xl my-20">
        <h2 className="text-4xl font-bold text-center mb-4">
          How It Works
        </h2>
        <p className="text-center text-slate-400 mb-12 text-lg">
          Complete workflow from generation to on-chain attestation
        </p>
        
        <div className="max-w-4xl mx-auto">
          <div className="space-y-8">
            <WorkflowStep
              number={1}
              title="Generate Proof"
              description="Create a zero-knowledge proof using your circuit and inputs. Choose from Groth16, PLONK, or STARK proof systems based on your requirements."
            />
            <WorkflowStep
              number={2}
              title="Verify Locally"
              description="Instantly verify proofs off-chain using our universal verifier. Check correctness and get gas estimates before submitting on-chain."
            />
            <WorkflowStep
              number={3}
              title="Attest On-Chain"
              description="Submit proof attestations to Arbitrum Sepolia. Immutable, verifiable record with gas-efficient WASM execution on Stylus."
            />
          </div>
        </div>

        <div className="text-center mt-12">
          <Link 
            href="/demo"
            className="inline-flex items-center gap-2 px-8 py-3 bg-blue-600 hover:bg-blue-700 rounded-lg font-semibold transition"
          >
            Run Complete Workflow
            <ArrowRight className="w-5 h-5" />
          </Link>
        </div>
      </div>

      {/* Architecture Section */}
      <div className="container mx-auto px-4 py-20">
        <h2 className="text-4xl font-bold text-center mb-4">
          Universal Verifier Architecture
        </h2>
        <p className="text-center text-slate-400 mb-12 text-lg">
          Single entry point routing to specialized verifiers
        </p>
        
        <div className="max-w-3xl mx-auto bg-slate-800 rounded-lg p-8 font-mono text-sm overflow-x-auto">
          <pre className="text-slate-300">
{`┌─────────────────────────────────────────┐
│      UniversalVKV (lib.rs)              │
│         Entry Point                     │
└────────────┬────────────────────────────┘
             │
    ┌────────┼────────┐
    │        │        │
┌───▼────┐ ┌▼─────┐ ┌▼─────┐
│Groth16 │ │PLONK │ │STARK │
│Module  │ │Module│ │Module│
│~280k   │ │~400k │ │~540k │
│gas     │ │gas   │ │gas   │
└────────┘ └──────┘ └──────┘`}
          </pre>
        </div>
      </div>

      {/* CTA Section */}
      <div className="container mx-auto px-4 py-20">
        <div className="max-w-3xl mx-auto text-center bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 rounded-2xl p-12">
          <h2 className="text-3xl md:text-4xl font-bold mb-6">
            Ready to Verify Proofs?
          </h2>
          <p className="text-lg mb-8 text-blue-100">
            Experience the complete workflow: Generate → Verify → Attest
          </p>
          <Link 
            href="/demo"
            className="inline-block px-10 py-4 bg-white text-blue-600 hover:bg-slate-100 rounded-lg font-semibold text-lg transition"
          >
            Launch Interactive Demo
          </Link>
        </div>
      </div>

      {/* Footer */}
      <footer className="container mx-auto px-4 py-12 border-t border-slate-700 mt-20">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row justify-between items-center gap-4">
          <div>
            <p className="text-slate-400">
              © 2025 Universal ZK Verifier. Built on Arbitrum Stylus.
            </p>
          </div>
          <div className="flex gap-6">
            <a 
              href="https://github.com/draxxycodes/Universal-ZKV" 
              target="_blank"
              rel="noopener noreferrer"
              className="text-slate-400 hover:text-white transition"
            >
              GitHub
            </a>
            <a 
              href="https://sepolia.arbiscan.io/address/0x36e937ebcf56c5dec6ecb0695001becc87738177" 
              target="_blank"
              rel="noopener noreferrer"
              className="text-slate-400 hover:text-white transition"
            >
              Contract
            </a>
            <Link href="/benchmarks" className="text-slate-400 hover:text-white transition">
              Benchmarks
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
