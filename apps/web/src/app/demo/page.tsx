"use client";

import { useState } from "react";
import { WalletConnect } from "@/components/WalletConnect";
import { Play, CheckCircle, Loader2, Download } from "lucide-react";
import Link from "next/link";
import toast from "react-hot-toast";

type ProofType = "groth16" | "plonk" | "stark";
type WorkflowStatus =
  | "idle"
  | "generating"
  | "verifying"
  | "attesting"
  | "complete"
  | "error";

export default function DemoPage() {
  const [proofType, setProofType] = useState<ProofType>("groth16");
  const [status, setStatus] = useState<WorkflowStatus>("idle");
  const [results, setResults] = useState<any>(null);
  const [error, setError] = useState<string>("");

  const runCompleteWorkflow = async () => {
    try {
      setStatus("generating");
      setError("");
      toast.loading("Generating proofs...", { id: "workflow" });

      // Step 1: Generate proofs
      const generateRes = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ proofType }),
      });

      if (!generateRes.ok) throw new Error("Generation failed");

      setStatus("verifying");
      toast.loading("Verifying proofs...", { id: "workflow" });

      // Step 2: Verify proofs
      const verifyRes = await fetch("/api/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ proofType }),
      });

      if (!verifyRes.ok) throw new Error("Verification failed");
      const verifyData = await verifyRes.json();

      setStatus("attesting");
      toast.loading("Attesting on-chain...", { id: "workflow" });

      // Step 3: Attest (optional, requires wallet)
      const attestRes = await fetch("/api/attest", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ proofType }),
      });

      const attestData = await attestRes.json();

      setStatus("complete");
      setResults({
        proofType,
        verified: verifyData.verified,
        gasUsed: verifyData.gasEstimate || 0,
        txHash: attestData.txHash,
        timestamp: new Date().toISOString(),
      });

      toast.success("Workflow complete!", { id: "workflow" });
    } catch (err: any) {
      setStatus("error");
      setError(err.message || "Workflow failed");
      toast.error(err.message || "Workflow failed", { id: "workflow" });
    }
  };

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
              <WalletConnect />
            </div>
          </nav>
        </div>
      </header>

      <div className="container mx-auto px-4 py-12">
        <div className="max-w-4xl mx-auto">
          {/* Title */}
          <div className="text-center mb-12">
            <h1 className="text-4xl md:text-5xl font-bold mb-4">
              Interactive Demo
            </h1>
            <p className="text-xl text-neutral-300">
              Run the complete workflow: Generate → Verify → Attest
            </p>
          </div>

          {/* Proof Type Selector */}
          <div className="bg-[#1a1a1a] rounded-xl p-8 mb-8 border border-[#2a2a2a]">
            <h2 className="text-2xl font-bold mb-4">1. Select Proof System</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <button
                onClick={() => setProofType("groth16")}
                className={`p-6 rounded-lg border-2 transition text-left ${
                  proofType === "groth16"
                    ? "border-yellow-400 bg-yellow-400/20"
                    : "border-gray-600 hover:border-yellow-400"
                }`}
              >
                <h3 className="text-xl font-bold mb-2 text-yellow-400">
                  Groth16
                </h3>
                <p className="text-sm text-gray-300 mb-2">~280k gas</p>
                <div className="text-xs text-neutral-400 space-y-1">
                  <p>✓ Trusted setup</p>
                  <p>✓ Smallest proof size</p>
                  <p>✓ Fastest verification</p>
                </div>
              </button>

              <button
                onClick={() => setProofType("plonk")}
                className={`p-6 rounded-lg border-2 transition text-left ${
                  proofType === "plonk"
                    ? "border-yellow-500 bg-yellow-500/20"
                    : "border-gray-600 hover:border-yellow-500"
                }`}
              >
                <h3 className="text-xl font-bold mb-2 text-yellow-400">
                  PLONK
                </h3>
                <p className="text-sm text-gray-300 mb-2">~400k gas</p>
                <div className="text-xs text-neutral-400 space-y-1">
                  <p>✓ Universal setup</p>
                  <p>✓ Flexible circuits</p>
                  <p>✓ Moderate gas cost</p>
                </div>
              </button>

              <button
                onClick={() => setProofType("stark")}
                className={`p-6 rounded-lg border-2 transition text-left ${
                  proofType === "stark"
                    ? "border-yellow-600 bg-yellow-600/20"
                    : "border-gray-600 hover:border-yellow-600"
                }`}
              >
                <h3 className="text-xl font-bold mb-2 text-yellow-400">
                  STARK
                </h3>
                <p className="text-sm text-neutral-300 mb-2">~540k gas</p>
                <div className="text-xs text-neutral-400 space-y-1">
                  <p>✓ Transparent setup</p>
                  <p>✓ Post-quantum secure</p>
                  <p>✓ No trusted setup</p>
                </div>
              </button>
            </div>
          </div>

          {/* Circuit Information */}
          <div className="bg-[#1a1a1a] rounded-xl p-8 mb-8 border border-[#2a2a2a]">
            <h2 className="text-2xl font-bold mb-4">Supported Circuits</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-[#252525] rounded-lg p-4">
                <h3 className="font-bold mb-2 text-yellow-400">
                  Poseidon Hash
                </h3>
                <p className="text-sm text-neutral-300 mb-2">
                  Zero-knowledge hash function verification
                </p>
                <p className="text-xs text-neutral-400">
                  10,000+ valid witnesses
                </p>
              </div>
              <div className="bg-[#252525] rounded-lg p-4">
                <h3 className="font-bold mb-2 text-yellow-400">
                  EdDSA Signature
                </h3>
                <p className="text-sm text-neutral-300 mb-2">
                  Signature verification without revealing keys
                </p>
                <p className="text-xs text-neutral-400">
                  10,000+ valid witnesses
                </p>
              </div>
              <div className="bg-[#252525] rounded-lg p-4">
                <h3 className="font-bold mb-2 text-yellow-400">Merkle Proof</h3>
                <p className="text-sm text-neutral-300 mb-2">
                  Tree membership verification
                </p>
                <p className="text-xs text-neutral-400">
                  10,000+ valid witnesses
                </p>
              </div>
            </div>
            <div className="mt-4 p-4 bg-blue-900/20 rounded-lg border border-yellow-400/30">
              <p className="text-sm text-neutral-300">
                <strong className="text-yellow-400">Fresh Proofs:</strong> Each
                workflow run randomly selects from 30,000+ valid witnesses,
                ensuring unique proofs every time.
              </p>
            </div>
          </div>

          {/* Run Workflow Button */}
          <div className="text-center mb-8">
            <button
              onClick={runCompleteWorkflow}
              disabled={
                status !== "idle" && status !== "complete" && status !== "error"
              }
              className="group px-8 py-4 bg-white text-black hover:bg-gray-200 disabled:bg-gray-800 disabled:text-gray-500 disabled:cursor-not-allowed rounded-lg font-semibold text-lg transition flex items-center gap-3 mx-auto"
            >
              {status === "idle" ||
              status === "complete" ||
              status === "error" ? (
                <>
                  <Play className="w-5 h-5" />
                  Run Complete Workflow
                </>
              ) : (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Processing...
                </>
              )}
            </button>
          </div>

          {/* Workflow Progress */}
          <div className="bg-[#1a1a1a] rounded-xl p-8 border border-[#2a2a2a]">
            <h2 className="text-2xl font-bold mb-6">2. Workflow Progress</h2>
            <div className="space-y-4">
              <WorkflowStepIndicator
                number={1}
                title="Generate Proof"
                status={
                  status === "generating"
                    ? "active"
                    : status === "idle"
                      ? "pending"
                      : "complete"
                }
              />
              <WorkflowStepIndicator
                number={2}
                title="Verify Locally"
                status={
                  status === "verifying"
                    ? "active"
                    : ["idle", "generating"].includes(status)
                      ? "pending"
                      : "complete"
                }
              />
              <WorkflowStepIndicator
                number={3}
                title="Attest On-Chain"
                status={
                  status === "attesting"
                    ? "active"
                    : ["idle", "generating", "verifying"].includes(status)
                      ? "pending"
                      : "complete"
                }
              />
            </div>
          </div>

          {/* Results */}
          {status === "complete" && results && (
            <div className="mt-8 bg-gradient-to-r from-green-900/30 to-blue-900/30 rounded-xl p-8 border border-green-500/30">
              <div className="flex items-center gap-3 mb-6">
                <CheckCircle className="w-8 h-8 text-green-400" />
                <h2 className="text-2xl font-bold">Workflow Complete!</h2>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-neutral-400">Proof System</p>
                  <p className="text-lg font-semibold capitalize">
                    {results.proofType}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-neutral-400">Gas Used</p>
                  <p className="text-lg font-semibold">
                    {results.gasUsed.toLocaleString()}
                  </p>
                </div>
                {results.txHash && (
                  <div className="md:col-span-2">
                    <p className="text-sm text-neutral-400">Transaction</p>
                    <a
                      href={`https://sepolia.arbiscan.io/tx/${results.txHash}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-yellow-400 hover:text-blue-300 font-mono text-sm break-all"
                    >
                      {results.txHash}
                    </a>
                  </div>
                )}
              </div>
              <button
                onClick={() => {
                  const data = JSON.stringify(results, null, 2);
                  const blob = new Blob([data], { type: "application/json" });
                  const url = URL.createObjectURL(blob);
                  const a = document.createElement("a");
                  a.href = url;
                  a.download = `proof-${results.proofType}-${Date.now()}.json`;
                  a.click();
                }}
                className="mt-6 flex items-center gap-2 px-6 py-3 bg-[#252525] hover:bg-slate-600 rounded-lg transition"
              >
                <Download className="w-4 h-4" />
                Download Results
              </button>
            </div>
          )}

          {/* Error */}
          {status === "error" && error && (
            <div className="mt-8 bg-red-900/30 rounded-xl p-8 border border-red-500/30">
              <h3 className="text-xl font-bold text-red-400 mb-2">Error</h3>
              <p className="text-neutral-300">{error}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function WorkflowStepIndicator({
  number,
  title,
  status,
}: {
  number: number;
  title: string;
  status: "pending" | "active" | "complete";
}) {
  return (
    <div className="flex items-center gap-4">
      <div
        className={`flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center font-bold ${
          status === "complete"
            ? "bg-green-600"
            : status === "active"
              ? "bg-blue-600 animate-pulse"
              : "bg-slate-600"
        }`}
      >
        {status === "complete" ? <CheckCircle className="w-5 h-5" /> : number}
      </div>
      <div className="flex-1">
        <p
          className={`font-semibold ${
            status === "active"
              ? "text-yellow-400"
              : status === "complete"
                ? "text-green-400"
                : "text-neutral-400"
          }`}
        >
          {title}
        </p>
      </div>
      {status === "active" && (
        <Loader2 className="w-5 h-5 animate-spin text-yellow-400" />
      )}
    </div>
  );
}
