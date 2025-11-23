import type { Metadata } from "next";
import "./globals.css";
import { Providers } from "./providers";
import { Toaster } from "react-hot-toast";

export const metadata: Metadata = {
  title: "Universal ZK Verifier - UZKV",
  description: "Production-ready zero-knowledge proof verification on Arbitrum Stylus. Supporting Groth16, PLONK, and STARK proof systems.",
  keywords: ["zero-knowledge", "zk-proof", "groth16", "plonk", "stark", "arbitrum", "stylus"],
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
