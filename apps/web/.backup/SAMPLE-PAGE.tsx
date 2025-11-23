/**
 * Sample Landing Page Component for Universal ZK Verifier Demo
 * This is a starting template - customize as needed!
 */

import Link from 'next/link';

export default function HomePage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-900 to-slate-800 text-white">
      {/* Hero Section */}
      <div className="container mx-auto px-4 py-20">
        <div className="text-center max-w-4xl mx-auto">
          <h1 className="text-5xl md:text-6xl font-bold mb-6 bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-purple-500">
            Universal ZK Verifier
          </h1>
          <p className="text-xl md:text-2xl text-slate-300 mb-8">
            One verifier. Three proof systems. Infinite possibilities.
          </p>
          <p className="text-lg text-slate-400 mb-12">
            Production-ready zero-knowledge proof verification on Arbitrum Stylus.
            <br />
            Supporting Groth16, PLONK, and STARK proof systems.
          </p>
          
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link 
              href="/demo"
              className="px-8 py-4 bg-blue-600 hover:bg-blue-700 rounded-lg font-semibold text-lg transition"
            >
              Try Live Demo
            </Link>
            <Link 
              href="/benchmarks"
              className="px-8 py-4 bg-slate-700 hover:bg-slate-600 rounded-lg font-semibold text-lg transition"
            >
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
        <h2 className="text-4xl font-bold text-center mb-12">
          Supported Proof Systems
        </h2>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-6xl mx-auto">
          {/* Groth16 */}
          <ProofSystemCard
            name="Groth16"
            gas="~280k"
            color="from-blue-500 to-blue-600"
            features={[
              "Trusted setup required",
              "Smallest proof size",
              "Battle-tested",
              "Fastest verification"
            ]}
          />
          
          {/* PLONK */}
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
          
          {/* STARK */}
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
      <div className="container mx-auto px-4 py-20 bg-slate-800/50">
        <h2 className="text-4xl font-bold text-center mb-12">
          How It Works
        </h2>
        
        <div className="max-w-4xl mx-auto">
          <div className="space-y-8">
            <WorkflowStep
              number={1}
              title="Generate Proof"
              description="Create a zero-knowledge proof using your circuit and inputs. Choose from Groth16, PLONK, or STARK."
            />
            <WorkflowStep
              number={2}
              title="Verify Locally"
              description="Instantly verify proofs off-chain using our universal verifier. Check correctness before submitting on-chain."
            />
            <WorkflowStep
              number={3}
              title="Attest On-Chain"
              description="Submit proof attestations to Arbitrum Sepolia. Immutable, verifiable, and gas-efficient."
            />
          </div>
        </div>
      </div>

      {/* Architecture Section */}
      <div className="container mx-auto px-4 py-20">
        <h2 className="text-4xl font-bold text-center mb-12">
          Universal Verifier Architecture
        </h2>
        
        <div className="max-w-3xl mx-auto bg-slate-800 rounded-lg p-8 font-mono text-sm">
          <pre className="text-slate-300 overflow-x-auto">
{`┌─────────────────────────────────────┐
│      UniversalVKV (lib.rs)          │
│         Entry Point                 │
└────────────┬────────────────────────┘
             │
    ┌────────┼────────┐
    │        │        │
┌───▼───┐ ┌─▼────┐ ┌─▼────┐
│Groth16│ │PLONK │ │STARK │
│Module │ │Module│ │Module│
│~280k  │ │~400k │ │~540k │
└───────┘ └──────┘ └──────┘`}
          </pre>
        </div>
      </div>

      {/* CTA Section */}
      <div className="container mx-auto px-4 py-20">
        <div className="max-w-3xl mx-auto text-center bg-gradient-to-r from-blue-600 to-purple-600 rounded-2xl p-12">
          <h2 className="text-3xl md:text-4xl font-bold mb-6">
            Ready to Verify Proofs?
          </h2>
          <p className="text-lg mb-8 text-blue-100">
            Try the complete workflow: Generate → Verify → Attest
          </p>
          <Link 
            href="/demo"
            className="inline-block px-10 py-4 bg-white text-blue-600 hover:bg-slate-100 rounded-lg font-semibold text-lg transition"
          >
            Launch Demo
          </Link>
        </div>
      </div>

      {/* Footer */}
      <footer className="container mx-auto px-4 py-12 border-t border-slate-700">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row justify-between items-center">
          <div className="mb-4 md:mb-0">
            <p className="text-slate-400">
              © 2025 Universal ZK Verifier. Built on Arbitrum Stylus.
            </p>
          </div>
          <div className="flex gap-6">
            <a href="https://github.com/draxxycodes/Universal-ZKV" className="text-slate-400 hover:text-white transition">
              GitHub
            </a>
            <Link href="/docs" className="text-slate-400 hover:text-white transition">
              Docs
            </Link>
            <a href="https://sepolia.arbiscan.io/address/0x36e937ebcf56c5dec6ecb0695001becc87738177" className="text-slate-400 hover:text-white transition">
              Contract
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
}

// Helper Components

function StatCard({ label, value, sublabel }: { label: string; value: string; sublabel: string }) {
  return (
    <div className="bg-slate-800 rounded-lg p-6 text-center">
      <div className="text-3xl font-bold text-blue-400 mb-2">{value}</div>
      <div className="text-lg font-semibold text-white mb-1">{label}</div>
      <div className="text-sm text-slate-400">{sublabel}</div>
    </div>
  );
}

function ProofSystemCard({ 
  name, 
  gas, 
  color, 
  features 
}: { 
  name: string; 
  gas: string; 
  color: string; 
  features: string[] 
}) {
  return (
    <div className="bg-slate-800 rounded-xl p-6 hover:scale-105 transition-transform">
      <div className={`bg-gradient-to-r ${color} rounded-lg p-4 mb-4`}>
        <h3 className="text-2xl font-bold">{name}</h3>
        <p className="text-lg opacity-90">{gas} gas</p>
      </div>
      
      <ul className="space-y-2">
        {features.map((feature, idx) => (
          <li key={idx} className="flex items-start gap-2">
            <span className="text-green-400 mt-1">✓</span>
            <span className="text-slate-300">{feature}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function WorkflowStep({ 
  number, 
  title, 
  description 
}: { 
  number: number; 
  title: string; 
  description: string 
}) {
  return (
    <div className="flex gap-6 items-start">
      <div className="flex-shrink-0 w-12 h-12 bg-blue-600 rounded-full flex items-center justify-center text-xl font-bold">
        {number}
      </div>
      <div>
        <h3 className="text-2xl font-bold mb-2">{title}</h3>
        <p className="text-slate-300 text-lg">{description}</p>
      </div>
    </div>
  );
}
