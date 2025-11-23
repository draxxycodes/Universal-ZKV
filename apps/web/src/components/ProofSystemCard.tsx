import { Check } from 'lucide-react';

interface ProofSystemCardProps {
  name: string;
  gas: string;
  color: string;
  features: string[];
}

export function ProofSystemCard({ name, gas, color, features }: ProofSystemCardProps) {
  return (
    <div className="bg-slate-800 rounded-xl p-6 hover:scale-105 transition-transform duration-200 border border-slate-700">
      <div className={`bg-gradient-to-r ${color} rounded-lg p-4 mb-4 text-center`}>
        <h3 className="text-2xl font-bold">{name}</h3>
        <p className="text-lg opacity-90 mt-1">{gas} gas</p>
      </div>
      
      <ul className="space-y-3">
        {features.map((feature, idx) => (
          <li key={idx} className="flex items-start gap-2">
            <Check className="w-5 h-5 text-green-400 mt-0.5 flex-shrink-0" />
            <span className="text-slate-300">{feature}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
