interface WorkflowStepProps {
  number: number;
  title: string;
  description: string;
}

export function WorkflowStep({
  number,
  title,
  description,
}: WorkflowStepProps) {
  return (
    <div className="flex gap-6 items-start group">
      <div className="flex-shrink-0 w-14 h-14 bg-gradient-to-br from-yellow-300 via-yellow-400 to-amber-600 rounded-full flex items-center justify-center text-xl font-black shadow-xl shadow-yellow-400/30 text-black group-hover:shadow-yellow-400/60 group-hover:scale-110 transition-all duration-300">
        {number}
      </div>
      <div className="flex-1">
        <h3 className="text-2xl font-bold mb-2 bg-gradient-to-r from-yellow-300 via-yellow-400 to-amber-500 bg-clip-text text-transparent group-hover:from-yellow-200 group-hover:to-yellow-400 transition-all">
          {title}
        </h3>
        <p className="text-neutral-300 text-lg leading-relaxed group-hover:text-neutral-200 transition-colors">
          {description}
        </p>
      </div>
    </div>
  );
}
