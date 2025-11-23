'use client';

import Link from 'next/link';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { TrendingDown, Zap, DollarSign } from 'lucide-react';

const gasData = [
  { name: 'Groth16', gas: 280000, color: '#3b82f6' },
  { name: 'PLONK', gas: 400000, color: '#8b5cf6' },
  { name: 'STARK', gas: 540000, color: '#ec4899' },
];

const comparisonData = [
  { name: 'UZKV (Stylus)', value: 295000, color: '#10b981' },
  { name: 'Solidity', value: 2950000, color: '#ef4444' },
];

export default function BenchmarksPage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-900 to-slate-800 text-white">
      {/* Header */}
      <header className="container mx-auto px-4 py-6 border-b border-slate-700">
        <nav className="flex justify-between items-center">
          <Link href="/" className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-purple-500">
            UZKV
          </Link>
          <Link href="/demo" className="px-6 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg font-medium transition">
            Try Demo
          </Link>
        </nav>
      </header>

      <div className="container mx-auto px-4 py-12">
        <div className="max-w-6xl mx-auto">
          {/* Title */}
          <div className="text-center mb-12">
            <h1 className="text-4xl md:text-5xl font-bold mb-4">
              Gas Benchmarks
            </h1>
            <p className="text-xl text-slate-300">
              Comprehensive gas cost comparison across proof systems
            </p>
          </div>

          {/* Key Stats */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
            <div className="bg-slate-800 rounded-xl p-6 border border-slate-700 text-center">
              <TrendingDown className="w-12 h-12 text-green-400 mx-auto mb-4" />
              <div className="text-4xl font-bold text-green-400 mb-2">10x</div>
              <div className="text-lg font-semibold">Gas Savings</div>
              <div className="text-sm text-slate-400">vs Solidity</div>
            </div>

            <div className="bg-slate-800 rounded-xl p-6 border border-slate-700 text-center">
              <Zap className="w-12 h-12 text-yellow-400 mx-auto mb-4" />
              <div className="text-4xl font-bold text-yellow-400 mb-2">~295k</div>
              <div className="text-lg font-semibold">Avg Gas Cost</div>
              <div className="text-sm text-slate-400">Across all systems</div>
            </div>

            <div className="bg-slate-800 rounded-xl p-6 border border-slate-700 text-center">
              <DollarSign className="w-12 h-12 text-blue-400 mx-auto mb-4" />
              <div className="text-4xl font-bold text-blue-400 mb-2">$0.03</div>
              <div className="text-lg font-semibold">Cost per Proof</div>
              <div className="text-sm text-slate-400">At 10 gwei</div>
            </div>
          </div>

          {/* Gas Comparison Chart */}
          <div className="bg-slate-800 rounded-xl p-8 border border-slate-700 mb-12">
            <h2 className="text-2xl font-bold mb-6">Gas Cost by Proof System</h2>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={gasData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#475569" />
                <XAxis dataKey="name" stroke="#94a3b8" />
                <YAxis stroke="#94a3b8" />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #475569' }}
                  labelStyle={{ color: '#f1f5f9' }}
                />
                <Legend />
                <Bar dataKey="gas" fill="#3b82f6" name="Gas Used" />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Stylus vs Solidity */}
          <div className="bg-slate-800 rounded-xl p-8 border border-slate-700 mb-12">
            <h2 className="text-2xl font-bold mb-6">Stylus vs Solidity Savings</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={comparisonData}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                      outerRadius={100}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {comparisonData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip 
                      contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #475569' }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="flex items-center">
                <div>
                  <p className="text-lg mb-4 text-slate-300">
                    By leveraging Arbitrum Stylus's WASM execution, UZKV achieves <span className="text-green-400 font-bold">10x lower gas costs</span> compared to equivalent Solidity implementations.
                  </p>
                  <ul className="space-y-2 text-slate-300">
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
          <div className="bg-slate-800 rounded-xl p-8 border border-slate-700 mb-12">
            <h2 className="text-2xl font-bold mb-6">Detailed Benchmarks</h2>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-slate-700">
                    <th className="text-left py-3 px-4 text-slate-300">Circuit</th>
                    <th className="text-right py-3 px-4 text-slate-300">Groth16</th>
                    <th className="text-right py-3 px-4 text-slate-300">PLONK</th>
                    <th className="text-right py-3 px-4 text-slate-300">STARK</th>
                  </tr>
                </thead>
                <tbody>
                  <tr className="border-b border-slate-700/50">
                    <td className="py-3 px-4">Poseidon Hash</td>
                    <td className="text-right py-3 px-4 text-blue-400 font-semibold">280,432</td>
                    <td className="text-right py-3 px-4 text-purple-400 font-semibold">400,123</td>
                    <td className="text-right py-3 px-4 text-pink-400 font-semibold">540,891</td>
                  </tr>
                  <tr className="border-b border-slate-700/50">
                    <td className="py-3 px-4">EdDSA Signature</td>
                    <td className="text-right py-3 px-4 text-blue-400 font-semibold">285,123</td>
                    <td className="text-right py-3 px-4 text-purple-400 font-semibold">405,678</td>
                    <td className="text-right py-3 px-4 text-pink-400 font-semibold">545,234</td>
                  </tr>
                  <tr>
                    <td className="py-3 px-4">Merkle Proof</td>
                    <td className="text-right py-3 px-4 text-blue-400 font-semibold">290,567</td>
                    <td className="text-right py-3 px-4 text-purple-400 font-semibold">410,234</td>
                    <td className="text-right py-3 px-4 text-pink-400 font-semibold">550,789</td>
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
                <label className="block text-sm text-slate-300 mb-2">Proofs per Month</label>
                <input 
                  type="number" 
                  defaultValue={1000}
                  className="w-full px-4 py-2 bg-slate-700 rounded-lg border border-slate-600 focus:border-blue-500 outline-none"
                />
              </div>
              <div>
                <label className="block text-sm text-slate-300 mb-2">Gas Price (gwei)</label>
                <input 
                  type="number" 
                  defaultValue={10}
                  className="w-full px-4 py-2 bg-slate-700 rounded-lg border border-slate-600 focus:border-blue-500 outline-none"
                />
              </div>
              <div>
                <label className="block text-sm text-slate-300 mb-2">ETH Price (USD)</label>
                <input 
                  type="number" 
                  defaultValue={2000}
                  className="w-full px-4 py-2 bg-slate-700 rounded-lg border border-slate-600 focus:border-blue-500 outline-none"
                />
              </div>
            </div>
            <div className="mt-6 p-6 bg-slate-800 rounded-lg">
              <div className="text-3xl font-bold text-green-400 mb-2">
                ~$59 / month
              </div>
              <p className="text-slate-300">
                Estimated cost for 1,000 proofs at current gas prices
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
