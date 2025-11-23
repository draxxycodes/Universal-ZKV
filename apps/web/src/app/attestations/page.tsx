'use client';

import Link from 'next/link';
import { useState } from 'react';
import { Search, ExternalLink, CheckCircle, Clock } from 'lucide-react';

export default function AttestationsPage() {
  const [searchQuery, setSearchQuery] = useState('');

  // Mock data - in production, fetch from blockchain
  const recentAttestations = [
    { hash: '0x1234...5678', proofType: 'groth16', timestamp: '2 hours ago', txHash: '0xabcd...ef01' },
    { hash: '0x2345...6789', proofType: 'plonk', timestamp: '5 hours ago', txHash: '0xbcde...f012' },
    { hash: '0x3456...789a', proofType: 'stark', timestamp: '1 day ago', txHash: '0xcdef...0123' },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-900 to-slate-800 text-white">
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
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-12">
            <h1 className="text-4xl md:text-5xl font-bold mb-4">Attestation Explorer</h1>
            <p className="text-xl text-slate-300">View on-chain proof attestations</p>
          </div>

          {/* Search */}
          <div className="bg-slate-800 rounded-xl p-6 mb-8 border border-slate-700">
            <div className="relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
              <input
                type="text"
                placeholder="Search by proof hash or transaction hash..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-12 pr-4 py-3 bg-slate-700 rounded-lg border border-slate-600 focus:border-blue-500 outline-none"
              />
            </div>
          </div>

          {/* Network Stats */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <div className="bg-slate-800 rounded-xl p-6 border border-slate-700 text-center">
              <CheckCircle className="w-10 h-10 text-green-400 mx-auto mb-3" />
              <div className="text-3xl font-bold mb-1">1,234</div>
              <div className="text-sm text-slate-400">Total Attestations</div>
            </div>
            <div className="bg-slate-800 rounded-xl p-6 border border-slate-700 text-center">
              <Clock className="w-10 h-10 text-blue-400 mx-auto mb-3" />
              <div className="text-3xl font-bold mb-1">295k</div>
              <div className="text-sm text-slate-400">Avg Gas Used</div>
            </div>
            <div className="bg-slate-800 rounded-xl p-6 border border-slate-700 text-center">
              <CheckCircle className="w-10 h-10 text-purple-400 mx-auto mb-3" />
              <div className="text-3xl font-bold mb-1">99.8%</div>
              <div className="text-sm text-slate-400">Success Rate</div>
            </div>
          </div>

          {/* Recent Attestations */}
          <div className="bg-slate-800 rounded-xl p-6 border border-slate-700">
            <h2 className="text-2xl font-bold mb-6">Recent Attestations</h2>
            <div className="space-y-4">
              {recentAttestations.map((attestation, idx) => (
                <div key={idx} className="flex items-center justify-between p-4 bg-slate-700 rounded-lg hover:bg-slate-600 transition">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                        attestation.proofType === 'groth16' ? 'bg-blue-500/20 text-blue-400' :
                        attestation.proofType === 'plonk' ? 'bg-purple-500/20 text-purple-400' :
                        'bg-pink-500/20 text-pink-400'
                      }`}>
                        {attestation.proofType.toUpperCase()}
                      </span>
                      <span className="text-slate-400 text-sm">{attestation.timestamp}</span>
                    </div>
                    <div className="font-mono text-sm text-slate-300">
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
                <span className="text-slate-400">Network:</span>
                <span className="font-semibold">Arbitrum Sepolia</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-400">Address:</span>
                <a
                  href="https://sepolia.arbiscan.io/address/0x36e937ebcf56c5dec6ecb0695001becc87738177"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-mono text-sm text-blue-400 hover:text-blue-300 flex items-center gap-2"
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
