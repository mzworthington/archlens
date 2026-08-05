import React, { useMemo } from 'react';
import { buildExecutiveTelemetrySummary, type SimulationResult } from '@archlens/core/resilience';

type Props = {
  result: SimulationResult | null;
};

function riskBadgeClass(level: 'low' | 'medium' | 'high' | 'critical'): string {
  switch (level) {
    case 'low':
      return 'text-emerald-400 border-emerald-500/30 bg-emerald-500/10';
    case 'medium':
      return 'text-amber-400 border-amber-500/30 bg-amber-500/10';
    case 'high':
      return 'text-orange-400 border-orange-500/30 bg-orange-500/10';
    case 'critical':
      return 'text-red-400 border-red-500/30 bg-red-500/10';
  }
}

export const ExecutiveTelemetryPanel: React.FC<Props> = ({ result }) => {
  const summary = useMemo(() => (result ? buildExecutiveTelemetrySummary(result) : null), [result]);

  if (!result || !summary) {
    return (
      <div className="text-sm text-slate-400" data-testid="executive-telemetry-panel">
        Run a simulation to see a business continuity summary.
      </div>
    );
  }

  return (
    <div className="space-y-5" data-testid="executive-telemetry-panel">
      <div>
        <h2 className="text-xs font-mono uppercase tracking-wider text-[#00f0ff] mb-2">
          Business continuity
        </h2>
        <div
          className={`inline-flex items-center rounded-md border px-2.5 py-1 text-xs font-mono uppercase tracking-wider ${riskBadgeClass(summary.riskLevel)}`}
          data-testid="executive-risk-level"
        >
          {summary.riskLabel}
        </div>
        <p className="text-sm text-slate-200 mt-3">{summary.continuitySummary}</p>
      </div>

      <div className="space-y-3">
        <p className="text-sm text-slate-300" data-testid="executive-availability-headline">
          {summary.availabilityHeadline}
        </p>
        <p className="text-sm text-slate-300" data-testid="executive-integrity-headline">
          {summary.integrityHeadline}
        </p>
        {summary.spofSummary ? (
          <p className="text-sm text-amber-200/90" data-testid="executive-spof-summary">
            {summary.spofSummary}
          </p>
        ) : null}
      </div>

      <div
        className="text-xs text-slate-500 border border-slate-800 rounded-md px-3 py-2.5"
        data-testid="executive-journey-deferred"
      >
        Revenue impact and user-journey mapping are planned for a later iteration. Switch to SRE
        view for entity refs, per-entry-point SLAs, and Monte Carlo bands.
      </div>
    </div>
  );
};
