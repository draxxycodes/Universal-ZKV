"use client";

import Link from "next/link";
import { useState } from "react";
import { Search, ExternalLink, CheckCircle, Clock } from "lucide-react";

export default function AttestationsPage() {
  const [searchQuery, setSearchQuery] = useState("");

  // Mock data - in production, fetch from blockchain
  const recentAttestations = [
    {
      hash: "0x1234...5678",
      proofType: "groth16",
      timestamp: "2 hours ago",
      txHash: "0xabcd...ef01",
    },
    {
      hash: "0x2345...6789",
      proofType: "plonk",
      timestamp: "5 hours ago",
      txHash: "0xbcde...f012",
    },
    {
      hash: "0x3456...789a",
      proofType: "stark",
      timestamp: "1 day ago",
      txHash: "0xcdef...0123",
    },
  ];

  return (
    <div className="min-h-screen bg-black text-white">
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
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-12">
            <h1 className="text-4xl md:text-5xl font-bold mb-4">
              Attestation Explorer
            </h1>
            <p className="text-xl text-neutral-300">
              View on-chain proof attestations
            </p>
          </div>

          {/* Search */}
          <div className="bg-[#1a1a1a] rounded-xl p-6 mb-8 border border-[#2a2a2a]">
            <div className="relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-neutral-400" />
              <input
                type="text"
                placeholder="Search by proof hash or transaction hash..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-12 pr-4 py-3 bg-[#252525] rounded-lg border border-[#404040] focus:border-blue-500 outline-none"
              />
            </div>
          </div>

          {/* Network Stats */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
            <div className="bg-[#1a1a1a] rounded-xl p-6 border border-[#2a2a2a] text-center">
              <CheckCircle className="w-10 h-10 text-yellow-400 mx-auto mb-3" />
              <div className="text-3xl font-bold mb-1">23+</div>
              <div className="text-sm text-neutral-400">Total Attestations</div>
            </div>
            <div className="bg-[#1a1a1a] rounded-xl p-6 border border-[#2a2a2a] text-center">
              <Clock className="w-10 h-10 text-yellow-400 mx-auto mb-3" />
              <div className="text-3xl font-bold mb-1">~50k</div>
              <div className="text-sm text-neutral-400">
                Gas per Attestation
              </div>
            </div>
            <div className="bg-[#1a1a1a] rounded-xl p-6 border border-[#2a2a2a] text-center">
              <CheckCircle className="w-10 h-10 text-yellow-400 mx-auto mb-3" />
              <div className="text-3xl font-bold mb-1">8 KB</div>
              <div className="text-sm text-neutral-400">Contract Size</div>
            </div>
            <div className="bg-[#1a1a1a] rounded-xl p-6 border border-[#2a2a2a] text-center">
              <CheckCircle className="w-10 h-10 text-yellow-400 mx-auto mb-3" />
              <div className="text-3xl font-bold mb-1">SHA-256</div>
              <div className="text-sm text-neutral-400">Hash Algorithm</div>
            </div>
          </div>

          {/* How Attestation Works */}
          <div className="bg-[#1a1a1a] rounded-xl p-8 border border-[#2a2a2a] mb-8">
            <h2 className="text-2xl font-bold mb-4">How Attestation Works</h2>
            <div className="space-y-4 text-neutral-300">
              <div className="flex gap-4">
                <div className="flex-shrink-0 w-8 h-8 rounded-full bg-blue-500 flex items-center justify-center font-bold">
                  1
                </div>
                <div>
                  <h3 className="font-bold mb-1">Local Verification (UZKV)</h3>
                  <p className="text-sm text-neutral-400">
                    Proof is verified locally using Rust UZKV module (39.5 KB).
                    Ensures correctness before on-chain submission.
                  </p>
                </div>
              </div>
              <div className="flex gap-4">
                <div className="flex-shrink-0 w-8 h-8 rounded-full bg-purple-500 flex items-center justify-center font-bold">
                  2
                </div>
                <div>
                  <h3 className="font-bold mb-1">Calculate Hash</h3>
                  <p className="text-sm text-neutral-400">
                    SHA-256 hash of the proof is calculated. This creates a
                    unique fingerprint for each proof.
                  </p>
                </div>
              </div>
              <div className="flex gap-4">
                <div className="flex-shrink-0 w-8 h-8 rounded-full bg-pink-500 flex items-center justify-center font-bold">
                  3
                </div>
                <div>
                  <h3 className="font-bold mb-1">Submit to Attestor</h3>
                  <p className="text-sm text-neutral-400">
                    Hash is submitted to lightweight Attestor contract (8 KB) on
                    Arbitrum Sepolia. Only ~50k gas per attestation.
                  </p>
                </div>
              </div>
              <div className="flex gap-4">
                <div className="flex-shrink-0 w-8 h-8 rounded-full bg-green-500 flex items-center justify-center font-bold">
                  4
                </div>
                <div>
                  <h3 className="font-bold mb-1">Duplicate Prevention</h3>
                  <p className="text-sm text-neutral-400">
                    Contract checks if hash already exists. Prevents duplicate
                    attestations and saves gas.
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Recent Attestations */}
          <div className="bg-[#1a1a1a] rounded-xl p-6 border border-[#2a2a2a]">
            <h2 className="text-2xl font-bold mb-6">Recent Attestations</h2>
            <div className="space-y-4">
              {recentAttestations.map((attestation, idx) => (
                <div
                  key={idx}
                  className="flex items-center justify-between p-4 bg-[#252525] rounded-lg hover:bg-[#2a2a2a] transition"
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <span
                        className={`px-3 py-1 rounded-full text-xs font-semibold ${
                          attestation.proofType === "groth16"
                            ? "bg-blue-500/20 text-yellow-400"
                            : attestation.proofType === "plonk"
                              ? "bg-purple-500/20 text-yellow-400"
                              : "bg-pink-500/20 text-yellow-400"
                        }`}
                      >
                        {attestation.proofType.toUpperCase()}
                      </span>
                      <span className="text-neutral-400 text-sm">
                        {attestation.timestamp}
                      </span>
                    </div>
                    <div className="font-mono text-sm text-neutral-300">
                      Proof: {attestation.hash}
                    </div>
                  </div>
                  <a
                    href={`https://sepolia.arbiscan.io/tx/${attestation.txHash}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg transition text-sm font-medium"
                  >
                    View TX
                    <ExternalLink className="w-4 h-4" />
                  </a>
                </div>
              ))}
            </div>
          </div>

          {/* Contract Info */}
          <div className="mt-8 bg-gradient-to-r from-blue-900/30 to-purple-900/30 rounded-xl p-6 border border-blue-500/30">
            <h3 className="text-lg font-bold mb-4">Attestor Contract</h3>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-neutral-400">Network:</span>
                <span className="font-semibold">Arbitrum Sepolia</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-neutral-400">Address:</span>
                <a
                  href="https://sepolia.arbiscan.io/address/0x36e937ebcf56c5dec6ecb0695001becc87738177"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-mono text-sm text-yellow-400 hover:text-blue-300 flex items-center gap-2"
                >
                  0x36e9...8177
                  <ExternalLink className="w-4 h-4" />
                </a>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
