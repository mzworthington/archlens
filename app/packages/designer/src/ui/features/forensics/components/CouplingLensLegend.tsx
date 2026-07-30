import React from 'react';

export const CouplingLensLegend: React.FC<{ focusMode: boolean }> = ({ focusMode }) => {
  return (
    <div
      className="rounded-xl border border-amber-900/50 bg-slate-950/90 backdrop-blur-md px-3 py-2.5 shadow-lg shadow-black/30 text-[10px] font-mono uppercase tracking-wider space-y-2 max-w-[240px]"
      data-testid="coupling-lens-legend"
      aria-label="Coupling lens legend"
    >
      <div className="text-amber-300 text-[9px]">Coupling lens active</div>
      <p className="normal-case tracking-normal text-slate-400 text-[10px] leading-snug">
        {focusMode
          ? 'Focusing the selected node and its coupled peers. Other nodes are hidden.'
          : 'Showing temporal coupling across the diagram. Select a node to focus its peers.'}
      </p>
      <ul className="space-y-1.5 normal-case tracking-normal text-slate-300 text-xs">
        <li className="flex items-center gap-2">
          <span
            className="shrink-0 w-8 h-0.5 border-t-2 border-dashed border-amber-400"
            aria-hidden
          />
          <span>Amber dashed - temporal coupling</span>
        </li>
        <li className="flex items-center gap-2">
          <span className="shrink-0 w-8 h-0.5 border-t-2 border-cyan-400" aria-hidden />
          <span>Cyan solid - schema dependency</span>
        </li>
        <li className="flex items-center gap-2">
          <span
            className="shrink-0 w-8 h-3 rounded-sm border-2 border-dashed border-amber-500/70 bg-amber-950/40"
            aria-hidden
          />
          <span>Amber ghost - off-diagram peer</span>
        </li>
      </ul>
    </div>
  );
};
