interface StatCardProps {
  label: string;
  value: string;
  sublabel: string;
}

export function StatCard({ label, value, sublabel }: StatCardProps) {
  return (
    <div className="relative bg-gradient-to-br from-[#1a1a1a] to-[#0f0f0f] rounded-lg p-6 text-center border border-[#2a2a2a] hover:border-yellow-400/60 transition-all hover-lift shadow-lg shadow-black/30 overflow-hidden group">
      {/* Glow effect on hover */}
      <div className="absolute inset-0 bg-gradient-to-br from-yellow-400/0 to-transparent group-hover:from-yellow-400/10 transition-all duration-300 pointer-events-none" />

      <div className="relative z-10">
        <div className="text-5xl font-black text-transparent bg-clip-text bg-gradient-to-r from-yellow-300 via-yellow-400 to-amber-500 mb-2 drop-shadow-lg">
          {value}
        </div>
        <div className="text-lg font-bold text-white mb-1">{label}</div>
        <div className="text-sm text-neutral-400">{sublabel}</div>
      </div>
    </div>
  );
}
