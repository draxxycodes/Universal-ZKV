import Link from "next/link";
import { Github, Twitter } from "lucide-react";

export function Footer() {
  return (
    <footer className="container mx-auto px-4 py-12 border-t border-[#2a2a2a] mt-20">
      <div className="max-w-6xl mx-auto">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-8">
          {/* About */}
          <div>
            <h3 className="text-2xl font-black mb-4 bg-gradient-to-r from-yellow-400 via-amber-500 to-yellow-600 bg-clip-text text-transparent">
              UZKV
            </h3>
            <p className="text-neutral-400 text-sm">
              Universal zero-knowledge proof verifier supporting Groth16, PLONK,
              and STARK on Arbitrum Stylus.
            </p>
          </div>

          {/* Product */}
          <div>
            <h3 className="text-lg font-bold mb-4">Product</h3>
            <ul className="space-y-2 text-neutral-400 text-sm">
              <li>
                <Link href="/demo" className="hover:text-yellow-400 transition">
                  Interactive Demo
                </Link>
              </li>
              <li>
                <Link
                  href="/benchmarks"
                  className="hover:text-yellow-400 transition"
                >
                  Gas Benchmarks
                </Link>
              </li>
              <li>
                <Link
                  href="/attestations"
                  className="hover:text-yellow-400 transition"
                >
                  Attestation Explorer
                </Link>
              </li>
            </ul>
          </div>

          {/* Documentation */}
          <div>
            <h3 className="text-lg font-bold mb-4">Documentation</h3>
            <ul className="space-y-2 text-neutral-400 text-sm">
              <li>
                <Link
                  href="/docs#quick-start"
                  className="hover:text-yellow-400 transition"
                >
                  Quick Start
                </Link>
              </li>
              <li>
                <Link
                  href="/docs#testing"
                  className="hover:text-yellow-400 transition"
                >
                  Testing Guide
                </Link>
              </li>
              <li>
                <Link
                  href="/docs#usage"
                  className="hover:text-yellow-400 transition"
                >
                  Usage Examples
                </Link>
              </li>
              <li>
                <Link
                  href="/docs#architecture"
                  className="hover:text-yellow-400 transition"
                >
                  Architecture
                </Link>
              </li>
            </ul>
          </div>

          {/* Community */}
          <div>
            <h3 className="text-lg font-bold mb-4">Community</h3>
            <ul className="space-y-2 text-neutral-400 text-sm">
              <li>
                <a
                  href="https://github.com/draxxycodes/Universal-ZKV"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:text-yellow-400 transition flex items-center gap-2"
                >
                  <Github className="w-4 h-4" />
                  GitHub
                </a>
              </li>
              <li>
                <a
                  href="https://sepolia.arbiscan.io/address/0x36e937ebcf56c5dec6ecb0695001becc87738177"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:text-yellow-400 transition"
                >
                  Attestor Contract
                </a>
              </li>
              <li>
                <a
                  href="https://arbitrum.io"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:text-yellow-400 transition"
                >
                  Arbitrum Stylus
                </a>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="flex flex-col md:flex-row justify-between items-center gap-4 pt-8 border-t border-[#2a2a2a]">
          <div className="text-neutral-400 text-sm">
            © 2025 Universal ZK Verifier. Built with ❤️ for the ZK community.
          </div>
          <div className="flex gap-4 text-neutral-400">
            <span className="text-sm">Built on Arbitrum Stylus</span>
            <span className="text-sm">•</span>
            <span className="text-sm">10x Gas Savings</span>
            <span className="text-sm">•</span>
            <span className="text-sm">3 Proof Systems</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
