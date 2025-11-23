interface StatCardProps {
  label: string;
  value: string;
  sublabel: string;
}

export function StatCard({ label, value, sublabel }: StatCardProps) {
  return (
    <div className="bg-slate-800 rounded-lg p-6 text-center border border-slate-700 hover:border-blue-500 transition-colors">
      <div className="text-4xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-purple-500 mb-2">
        {value}
      </div>
      <div className="text-lg font-semibold text-white mb-1">{label}</div>
      <div className="text-sm text-slate-400">{sublabel}</div>
    </div>
  );
}
