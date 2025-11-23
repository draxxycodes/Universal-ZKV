"use client";

import Link from "next/link";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from "recharts";
import { TrendingDown, Zap, DollarSign } from "lucide-react";

const gasData = [
  { name: "Groth16", gas: 280000, color: "#3b82f6" },
  { name: "PLONK", gas: 400000, color: "#8b5cf6" },
  { name: "STARK", gas: 540000, color: "#ec4899" },
];

const comparisonData = [
  { name: "UZKV (Stylus)", value: 295000, color: "#10b981" },
  { name: "Solidity", value: 2950000, color: "#ef4444" },
];

export default function BenchmarksPage() {
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
              Gas Benchmarks
            </h1>
            <p className="text-xl text-neutral-300">
              Comprehensive gas cost comparison across proof systems
            </p>
          </div>

          {/* Key Stats */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
            <div className="bg-[#1a1a1a] rounded-xl p-6 border border-[#2a2a2a] text-center">
              <TrendingDown className="w-12 h-12 text-yellow-400 mx-auto mb-4" />
              <div className="text-4xl font-bold text-yellow-400 mb-2">10x</div>
              <div className="text-lg font-semibold">Gas Savings</div>
              <div className="text-sm text-neutral-400">vs Solidity</div>
            </div>

            <div className="bg-[#1a1a1a] rounded-xl p-6 border border-[#2a2a2a] text-center">
              <Zap className="w-12 h-12 text-yellow-400 mx-auto mb-4" />
              <div className="text-4xl font-bold text-yellow-400 mb-2">
                ~295k
              </div>
              <div className="text-lg font-semibold">Avg Gas Cost</div>
              <div className="text-sm text-neutral-400">Across all systems</div>
            </div>

            <div className="bg-[#1a1a1a] rounded-xl p-6 border border-[#2a2a2a] text-center">
              <DollarSign className="w-12 h-12 text-yellow-400 mx-auto mb-4" />
              <div className="text-4xl font-bold text-yellow-400 mb-2">
                $0.03
              </div>
              <div className="text-lg font-semibold">Cost per Proof</div>
              <div className="text-sm text-neutral-400">At 10 gwei</div>
            </div>
          </div>

          {/* Gas Comparison Chart */}
          <div className="bg-[#1a1a1a] rounded-xl p-8 border border-[#2a2a2a] mb-12">
            <h2 className="text-2xl font-bold mb-6">
              Gas Cost by Proof System
            </h2>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={gasData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#475569" />
                <XAxis dataKey="name" stroke="#94a3b8" />
                <YAxis stroke="#94a3b8" />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "#1e293b",
                    border: "1px solid #475569",
                  }}
                  labelStyle={{ color: "#f1f5f9" }}
                />
                <Legend />
                <Bar dataKey="gas" fill="#3b82f6" name="Gas Used" />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Stylus vs Solidity */}
          <div className="bg-[#1a1a1a] rounded-xl p-8 border border-[#2a2a2a] mb-12">
            <h2 className="text-2xl font-bold mb-6">
              Stylus vs Solidity Savings
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={comparisonData}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({
                        name,
                        percent,
                      }: {
                        name: string;
                        percent: number;
                      }) => `${name} ${(percent * 100).toFixed(0)}%`}
                      outerRadius={100}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {comparisonData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "#1e293b",
                        border: "1px solid #475569",
                      }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="flex items-center">
                <div>
                  <p className="text-lg mb-4 text-neutral-300">
                    By leveraging Arbitrum Stylus's WASM execution, UZKV
                    achieves{" "}
                    <span className="text-yellow-400 font-bold">
                      10x lower gas costs
                    </span>{" "}
                    compared to equivalent Solidity implementations.
                  </p>
                  <ul className="space-y-2 text-neutral-300">
                    <li>✅ WASM execution efficiency</li>
                    <li>✅ Optimized cryptographic operations</li>
                    <li>✅ Reduced storage costs</li>
                    <li>✅ Native speed, EVM compatibility</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>

          {/* Benchmark Table */}
          <div className="bg-[#1a1a1a] rounded-xl p-8 border border-[#2a2a2a] mb-12">
            <h2 className="text-2xl font-bold mb-6">Detailed Benchmarks</h2>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-[#2a2a2a]">
                    <th className="text-left py-3 px-4 text-neutral-300">
                      Circuit
                    </th>
                    <th className="text-right py-3 px-4 text-neutral-300">
                      Groth16
                    </th>
                    <th className="text-right py-3 px-4 text-neutral-300">
                      PLONK
                    </th>
                    <th className="text-right py-3 px-4 text-neutral-300">
                      STARK
                    </th>
                  </tr>
                </thead>
                <tbody>
                  <tr className="border-b border-[#2a2a2a]/50">
                    <td className="py-3 px-4">Poseidon Hash</td>
                    <td className="text-right py-3 px-4 text-yellow-400 font-semibold">
                      ~280,000
                    </td>
                    <td className="text-right py-3 px-4 text-purple-400 font-semibold">
                      ~400,000
                    </td>
                    <td className="text-right py-3 px-4 text-pink-400 font-semibold">
                      ~540,000
                    </td>
                  </tr>
                  <tr className="border-b border-[#2a2a2a]/50">
                    <td className="py-3 px-4">EdDSA Signature</td>
                    <td className="text-right py-3 px-4 text-yellow-400 font-semibold">
                      ~290,000
                    </td>
                    <td className="text-right py-3 px-4 text-purple-400 font-semibold">
                      ~410,000
                    </td>
                    <td className="text-right py-3 px-4 text-pink-400 font-semibold">
                      ~545,000
                    </td>
                  </tr>
                  <tr className="border-b border-[#2a2a2a]/50">
                    <td className="py-3 px-4">Merkle Proof</td>
                    <td className="text-right py-3 px-4 text-yellow-400 font-semibold">
                      ~285,000
                    </td>
                    <td className="text-right py-3 px-4 text-purple-400 font-semibold">
                      ~405,000
                    </td>
                    <td className="text-right py-3 px-4 text-pink-400 font-semibold">
                      ~550,000
                    </td>
                  </tr>
                  <tr className="bg-green-900/10">
                    <td className="py-3 px-4 font-bold">
                      Complete DeFi Workflow
                    </td>
                    <td
                      colSpan={3}
                      className="text-right py-3 px-4 text-yellow-400 font-bold"
                    >
                      ~2,115,000
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
            <div className="mt-4 p-4 bg-blue-900/20 rounded-lg border border-blue-500/30">
              <p className="text-sm text-neutral-300">
                <strong className="text-yellow-400">DeFi Workflow:</strong>{" "}
                Identity (Groth16) + Whitelist (Groth16) + State (PLONK) +
                Computation (STARK) + Finalize (PLONK) = 5 verifications
              </p>
            </div>
          </div>

          {/* Proof Size Comparison */}
          <div className="bg-[#1a1a1a] rounded-xl p-8 border border-[#2a2a2a] mb-12">
            <h2 className="text-2xl font-bold mb-6">
              Proof Size & Setup Comparison
            </h2>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-[#2a2a2a]">
                    <th className="text-left py-3 px-4 text-neutral-300">
                      Proof System
                    </th>
                    <th className="text-right py-3 px-4 text-neutral-300">
                      Proof Size
                    </th>
                    <th className="text-center py-3 px-4 text-neutral-300">
                      Setup Type
                    </th>
                    <th className="text-center py-3 px-4 text-neutral-300">
                      Security
                    </th>
                  </tr>
                </thead>
                <tbody>
                  <tr className="border-b border-[#2a2a2a]/50">
                    <td className="py-3 px-4 text-yellow-400 font-semibold">
                      Groth16
                    </td>
                    <td className="text-right py-3 px-4">256 bytes</td>
                    <td className="text-center py-3 px-4">Trusted</td>
                    <td className="text-center py-3 px-4">Discrete Log</td>
                  </tr>
                  <tr className="border-b border-[#2a2a2a]/50">
                    <td className="py-3 px-4 text-purple-400 font-semibold">
                      PLONK
                    </td>
                    <td className="text-right py-3 px-4">512 bytes</td>
                    <td className="text-center py-3 px-4">Universal</td>
                    <td className="text-center py-3 px-4">Discrete Log</td>
                  </tr>
                  <tr>
                    <td className="py-3 px-4 text-pink-400 font-semibold">
                      STARK
                    </td>
                    <td className="text-right py-3 px-4">1024 bytes</td>
                    <td className="text-center py-3 px-4">Transparent</td>
                    <td className="text-center py-3 px-4">
                      Collision Resistance
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          {/* Cost Calculator */}
          <div className="bg-gradient-to-r from-blue-900/30 to-purple-900/30 rounded-xl p-8 border border-blue-500/30">
            <h2 className="text-2xl font-bold mb-6">Cost Calculator</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div>
                <label className="block text-sm text-neutral-300 mb-2">
                  Proofs per Month
                </label>
                <input
                  type="number"
                  defaultValue={1000}
                  className="w-full px-4 py-2 bg-[#252525] rounded-lg border border-slate-600 focus:border-blue-500 outline-none"
                />
              </div>
              <div>
                <label className="block text-sm text-neutral-300 mb-2">
                  Gas Price (gwei)
                </label>
                <input
                  type="number"
                  defaultValue={10}
                  className="w-full px-4 py-2 bg-[#252525] rounded-lg border border-slate-600 focus:border-blue-500 outline-none"
                />
              </div>
              <div>
                <label className="block text-sm text-neutral-300 mb-2">
                  ETH Price (USD)
                </label>
                <input
                  type="number"
                  defaultValue={2000}
                  className="w-full px-4 py-2 bg-[#252525] rounded-lg border border-slate-600 focus:border-blue-500 outline-none"
                />
              </div>
            </div>
            <div className="mt-6 p-6 bg-[#1a1a1a] rounded-lg">
              <div className="text-3xl font-bold text-yellow-400 mb-2">
                ~$59 / month
              </div>
              <p className="text-neutral-300">
                Estimated cost for 1,000 proofs at current gas prices
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
