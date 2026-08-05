export function TraceLensSegmented<T extends string>({
  value,
  onChange,
  options,
}: {
  value: T;
  onChange: (v: T) => void;
  options: { id: T; label: string }[];
}) {
  return (
    <div className="inline-flex rounded-lg border border-[#00f0ff]/15 bg-[#040914]/80 p-0.5">
      {options.map(opt => {
        const active = value === opt.id;
        return (
          <button
            key={opt.id}
            type="button"
            onClick={() => onChange(opt.id)}
            className={`rounded-md px-3 py-1.5 text-xs font-mono uppercase tracking-wider transition-colors ${
              active
                ? 'bg-[#00f0ff]/15 text-[#00f0ff] border border-[#00f0ff]/30'
                : 'text-slate-400 hover:text-slate-100 border border-transparent'
            }`}
          >
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}
