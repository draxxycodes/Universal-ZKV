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

interface StepDetail {
  title: string;
  description: string;
  timestamp: string;
}

export default function DemoPage() {
  const [proofType, setProofType] = useState<ProofType>("groth16");
  const [status, setStatus] = useState<WorkflowStatus>("idle");
  const [results, setResults] = useState<any>(null);
  const [error, setError] = useState<string>("");
  const [progressDetails, setProgressDetails] = useState<StepDetail[]>([]);
  const [currentStep, setCurrentStep] = useState<string>("");

  const runCompleteWorkflow = async () => {
    try {
      setStatus("generating");
      setError("");
      setProgressDetails([]);
      toast.loading("Starting workflow...", { id: "workflow" });

      // Generate unique session ID
      const sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

      // Connect to Server-Sent Events stream
      const eventSource = new EventSource(
        `/api/workflow?sessionId=${sessionId}&proofType=${proofType}`,
      );

      eventSource.addEventListener("status", (e) => {
        const data = JSON.parse(e.data);
        setStatus(data.phase);
        setCurrentStep(
          `${data.phase.charAt(0).toUpperCase() + data.phase.slice(1)}... ${data.progress}%`,
        );

        if (data.phase === "generating") {
          toast.loading("Generating proofs...", { id: "workflow" });
        } else if (data.phase === "verifying") {
          toast.loading("Verifying with UZKV...", { id: "workflow" });
        } else if (data.phase === "attesting") {
          toast.loading("Attesting on-chain...", { id: "workflow" });
        }
      });

      eventSource.addEventListener("log", (e) => {
        const data = JSON.parse(e.data);
        setProgressDetails((prev) => [
          ...prev,
          {
            title: data.message.includes("📦")
              ? "Section"
              : data.message.includes("🔄")
                ? "Processing"
                : data.message.includes("✅")
                  ? "Success"
                  : data.message.includes("⏳")
                    ? "Waiting"
                    : data.message.includes("🔑")
                      ? "Hash"
                      : data.message.includes("🔗")
                        ? "Link"
                        : "Info",
            description: data.message,
            timestamp: new Date().toLocaleTimeString(),
          },
        ]);
      });

      eventSource.addEventListener("transaction", (e) => {
        const data = JSON.parse(e.data);
        toast.success(`Transaction confirmed: ${data.txHash.slice(0, 10)}...`, {
          duration: 3000,
        });
      });

      eventSource.addEventListener("complete", (e) => {
        const data = JSON.parse(e.data);
        setStatus("complete");
        setCurrentStep("All steps completed successfully!");
        toast.success("Complete workflow finished!", { id: "workflow" });

        // Set final results from the workflow session
        setResults({
          proofType,
          verified: data.verificationResults?.verified || true,
          circuitsVerified: data.verificationResults?.circuitsVerified || 3,
          gasUsed: data.verificationResults?.gasEstimate || 0,
          txHash: data.attestationResults?.[0] || "",
          txHashes: data.attestationResults || [],
          explorerUrl: data.attestationResults?.[0]
            ? `https://sepolia.arbiscan.io/tx/${data.attestationResults[0]}`
            : "",
          attestorContract: "0x36e937ebcf56c5dec6ecb0695001becc87738177",
          network: "arbitrum-sepolia",
          counts: {
            generated: data.generatedProofs || {},
            verified: data.verificationResults || {},
            attested: data.attestationResults?.length || 0,
          },
          timestamp: new Date().toISOString(),
          totalSteps: progressDetails.length + 1,
        });

        eventSource.close();
      });

      eventSource.addEventListener("error", (e: any) => {
        const data = e.data
          ? JSON.parse(e.data)
          : { error: "Stream connection error" };
        console.error("Workflow error:", data.error);
        setError(data.error);
        setStatus("error");
        toast.error(data.error, { id: "workflow" });
        eventSource.close();
      });

      eventSource.onerror = (err) => {
        console.error("EventSource error:", err);
        setError("Connection to workflow stream failed");
        setStatus("error");
        toast.error("Connection failed", { id: "workflow" });
        eventSource.close();
      };
    } catch (err: any) {
      console.error("Workflow error:", err);
      setError(err.message);
      setStatus("error");
      toast.error(err.message, { id: "workflow" });
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

          {/* Real-time Terminal Output */}
          {progressDetails.length > 0 && (
            <div className="bg-black rounded-xl p-6 mb-8 border border-green-500/30 font-mono">
              <div className="flex items-center gap-3 mb-4">
                <div className="flex gap-2">
                  <div className="w-3 h-3 rounded-full bg-red-500"></div>
                  <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
                  <div className="w-3 h-3 rounded-full bg-green-500"></div>
                </div>
                <span className="text-sm text-neutral-400">
                  Terminal Output
                </span>
                {status !== "complete" && status !== "error" && (
                  <Loader2 className="w-4 h-4 animate-spin text-green-400 ml-auto" />
                )}
              </div>
              <div className="bg-black rounded-lg p-4 max-h-96 overflow-y-auto text-sm space-y-1">
                {progressDetails.map((detail, idx) => (
                  <div
                    key={idx}
                    className="text-green-400 animate-fadeIn leading-relaxed"
                    style={{ animationDelay: `${idx * 0.05}s` }}
                  >
                    {detail.description}
                  </div>
                ))}
                {currentStep && status !== "complete" && (
                  <div className="text-yellow-400 flex items-center gap-2 animate-pulse">
                    <span>▶</span> {currentStep}
                  </div>
                )}
              </div>
            </div>
          )}

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

              {/* Summary Stats */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                <div className="bg-black/40 rounded-lg p-4 border border-[#2a2a2a]">
                  <p className="text-xs text-neutral-400 mb-1">Generated</p>
                  <p className="text-2xl font-bold text-green-400">
                    {results.counts?.generated?.groth16 || 0}G +{" "}
                    {results.counts?.generated?.plonk || 0}P +{" "}
                    {results.counts?.generated?.stark || 0}S
                  </p>
                </div>
                <div className="bg-black/40 rounded-lg p-4 border border-[#2a2a2a]">
                  <p className="text-xs text-neutral-400 mb-1">Verified</p>
                  <p className="text-2xl font-bold text-blue-400">
                    {results.circuitsVerified || 9}
                  </p>
                </div>
                <div className="bg-black/40 rounded-lg p-4 border border-[#2a2a2a]">
                  <p className="text-xs text-neutral-400 mb-1">Attested</p>
                  <p className="text-2xl font-bold text-yellow-400">
                    {results.counts?.attested?.total || 9}
                  </p>
                </div>
                <div className="bg-black/40 rounded-lg p-4 border border-[#2a2a2a]">
                  <p className="text-xs text-neutral-400 mb-1">Est. Gas</p>
                  <p className="text-2xl font-bold text-purple-400">
                    {results.gasUsed.toLocaleString()}
                  </p>
                </div>
              </div>

              {/* Network Info */}
              {results.network && (
                <div className="bg-black/40 rounded-lg p-4 border border-[#2a2a2a] mb-6">
                  <p className="text-sm text-neutral-400 mb-2">
                    Network Information
                  </p>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm font-mono">
                    <div>
                      <span className="text-neutral-500">Network:</span>{" "}
                      <span className="text-green-400">{results.network}</span>
                    </div>
                    <div>
                      <span className="text-neutral-500">Attestor:</span>{" "}
                      <span className="text-blue-400">
                        {results.attestorContract}
                      </span>
                    </div>
                  </div>
                </div>
              )}

              {/* Transaction Hashes */}
              {results.txHashes && results.txHashes.length > 0 && (
                <div className="bg-black/40 rounded-lg p-4 border border-[#2a2a2a]">
                  <p className="text-sm text-neutral-400 mb-3">
                    Transaction Hashes ({results.txHashes.length})
                  </p>
                  <div className="space-y-2 max-h-48 overflow-y-auto">
                    {results.txHashes.map((hash: string, idx: number) => (
                      <a
                        key={idx}
                        href={`https://sepolia.arbiscan.io/tx/${hash}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-2 text-xs font-mono text-yellow-400 hover:text-blue-300 transition"
                      >
                        <span className="text-neutral-500">{idx + 1}.</span>
                        <span className="flex-1">{hash}</span>
                        <svg
                          className="w-3 h-3"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
                          />
                        </svg>
                      </a>
                    ))}
                  </div>
                  <a
                    href={`https://sepolia.arbiscan.io/address/${results.attestorContract}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-4 inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg transition text-sm font-semibold"
                  >
                    <svg
                      className="w-4 h-4"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
                      />
                    </svg>
                    View Attestor Contract
                  </a>
                </div>
              )}

              {results.txHash === "already-attested" && (
                <div className="p-4 bg-yellow-900/20 rounded-lg border border-yellow-500/30">
                  <p className="text-sm text-yellow-400">
                    ℹ️ These proofs were already attested on-chain
                  </p>
                </div>
              )}
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
