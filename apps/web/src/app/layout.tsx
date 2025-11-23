import type { Metadata } from "next";
import "./globals.css";
import { Providers } from "./providers";
import { Toaster } from "react-hot-toast";

export const metadata: Metadata = {
  title:
    "Universal ZK Verifier (UZKV) - Groth16, PLONK & STARK on Arbitrum Stylus",
  description:
    "Production-ready universal zero-knowledge proof verifier built with Rust Stylus. Verify Groth16, PLONK, and STARK proofs on-chain with 10x gas savings. One contract, three proof systems, infinite possibilities.",
  keywords: [
    "zero-knowledge",
    "zk-proof",
    "groth16",
    "plonk",
    "stark",
    "arbitrum",
    "stylus",
    "rust",
    "wasm",
    "zkp",
    "universal verifier",
    "circom",
    "snarkjs",
    "poseidon",
    "eddsa",
    "merkle proof",
  ],
  authors: [{ name: "Universal ZKV Team" }],
  openGraph: {
    title: "Universal ZK Verifier - UZKV",
    description: "One verifier. Three proof systems. Infinite possibilities.",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Universal ZK Verifier - UZKV",
    description: "Production-ready ZK proof verification on Arbitrum Stylus",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="font-sans antialiased">
        <Providers>
          {children}
          <Toaster position="bottom-right" />
        </Providers>
      </body>
    </html>
  );
}
