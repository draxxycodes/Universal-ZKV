interface WorkflowStepProps {
  number: number;
  title: string;
  description: string;
}

export function WorkflowStep({ number, title, description }: WorkflowStepProps) {
  return (
    <div className="flex gap-6 items-start">
      <div className="flex-shrink-0 w-12 h-12 bg-gradient-to-br from-blue-600 to-purple-600 rounded-full flex items-center justify-center text-xl font-bold shadow-lg">
        {number}
      </div>
      <div className="flex-1">
        <h3 className="text-2xl font-bold mb-2">{title}</h3>
        <p className="text-slate-300 text-lg leading-relaxed">{description}</p>
      </div>
    </div>
  );
}
