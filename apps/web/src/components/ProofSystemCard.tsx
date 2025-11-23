import { Check } from "lucide-react";

interface ProofSystemCardProps {
  name: string;
  gas: string;
  color: string;
  features: string[];
}

export function ProofSystemCard({
  name,
  gas,
  color,
  features,
}: ProofSystemCardProps) {
  return (
    <div className="relative bg-gradient-to-br from-[#1a1a1a] to-[#0f0f0f] rounded-xl p-6 hover-lift border border-[#2a2a2a] hover:border-yellow-400/50 transition-all duration-200 shadow-xl shadow-black/50 overflow-hidden group">
      {/* Subtle gradient overlay on hover */}
      <div className="absolute inset-0 bg-gradient-to-br from-yellow-400/0 to-amber-600/0 group-hover:from-yellow-400/5 group-hover:to-amber-600/5 transition-all duration-300 rounded-xl pointer-events-none" />

      <div className="relative z-10">
        <div className="bg-gradient-to-br from-yellow-400/15 via-amber-500/10 to-yellow-600/15 rounded-lg p-4 mb-4 text-center border border-yellow-400/40 shadow-inner">
          <h3 className="text-2xl font-black bg-gradient-to-r from-yellow-300 to-yellow-500 bg-clip-text text-transparent">
            {name}
          </h3>
          <p className="text-lg text-neutral-200 mt-1 font-semibold">
            {gas} gas
          </p>
        </div>

        <ul className="space-y-3">
          {features.map((feature, idx) => (
            <li key={idx} className="flex items-start gap-2">
              <Check className="w-5 h-5 text-yellow-400 mt-0.5 flex-shrink-0 drop-shadow-sm" />
              <span className="text-neutral-300">{feature}</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
