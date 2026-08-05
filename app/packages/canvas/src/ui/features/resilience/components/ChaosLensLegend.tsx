import React from 'react';

export const ChaosLensLegend: React.FC = () => {
  return (
    <div
      className="rounded-xl border border-slate-800 bg-slate-950/90 backdrop-blur-md px-3 py-2.5 shadow-lg shadow-black/30 text-[10px] font-mono uppercase tracking-wider space-y-2 max-w-[220px]"
      data-testid="chaoslens-legend"
      aria-label="ChaosLens risk legend"
    >
      <div className="text-[#00f0ff] text-[9px]">Risk encoding</div>
      <ul className="space-y-1.5 normal-case tracking-normal text-slate-300 text-xs">
        <li className="flex items-center gap-2">
          <span
            className="shrink-0 w-8 h-3 rounded-sm border border-red-500/50 bg-slate-900"
            style={{
              boxShadow: '0 0 6px rgba(239, 68, 68, 0.45)',
            }}
            aria-hidden
          />
          <span>Red glow - blast radius (ChaosLens)</span>
        </li>
        <li className="flex items-center gap-2">
          <span
            className="shrink-0 w-8 h-3 rounded-sm border border-slate-700"
            style={{
              backgroundImage:
                'linear-gradient(135deg, rgba(239,68,68,0.45) 0%, rgba(15,23,42,0.95) 100%)',
            }}
            aria-hidden
          />
          <span>Red fill - structural hotspot (TraceLens)</span>
        </li>
        <li className="flex items-center gap-2">
          <span
            className="shrink-0 w-8 h-3 rounded-sm border-2 border-dashed border-amber-500/70 bg-slate-900"
            aria-hidden
          />
          <span>Amber ring - data integrity / stale streams</span>
        </li>
        <li className="flex items-center gap-2">
          <span
            className="shrink-0 w-8 h-3 rounded-sm border-2 border-red-500/80 bg-slate-900"
            aria-hidden
          />
          <span>Red border - fault target</span>
        </li>
      </ul>
    </div>
  );
};
