"use client";

import {
  useAccount,
  useConnect,
  useDisconnect,
  useChainId,
  useSwitchChain,
} from "wagmi";
import { arbitrumSepolia } from "viem/chains";
import { formatAddress } from "@/lib/utils";
import { Wallet, LogOut, AlertCircle } from "lucide-react";

export function WalletConnect() {
  const { address, isConnected } = useAccount();
  const { connect, connectors } = useConnect();
  const { disconnect } = useDisconnect();
  const chainId = useChainId();
  const { switchChain } = useSwitchChain();

  const isCorrectNetwork = chainId === arbitrumSepolia.id;

  if (isConnected && address) {
    return (
      <div className="flex items-center gap-3">
        {!isCorrectNetwork && (
          <button
            onClick={() => switchChain({ chainId: arbitrumSepolia.id })}
            className="flex items-center gap-2 px-4 py-2 bg-yellow-600 hover:bg-yellow-700 rounded-lg text-sm font-medium transition"
          >
            <AlertCircle className="w-4 h-4" />
            Switch to Arbitrum Sepolia
          </button>
        )}
        <div className="flex items-center gap-2 px-4 py-2 bg-slate-700 rounded-lg">
          <Wallet className="w-4 h-4 text-green-400" />
          <span className="text-sm font-medium">{formatAddress(address)}</span>
        </div>
        <button
          onClick={() => disconnect()}
          className="p-2 hover:bg-slate-700 rounded-lg transition"
          title="Disconnect"
        >
          <LogOut className="w-4 h-4" />
        </button>
      </div>
    );
  }

  return (
    <button
      onClick={() => connect({ connector: connectors[0] })}
      className="flex items-center gap-2 px-6 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg font-medium transition"
    >
      <Wallet className="w-4 h-4" />
      Connect Wallet
    </button>
  );
}
