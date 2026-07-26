import React from 'react';
import type { SimulationResult } from '@blueprint/core/resilience';

type Props = {
  result: SimulationResult | null;
};

function slaColor(sla: number): string {
  if (sla >= 99) return 'text-emerald-400';
  if (sla >= 95) return 'text-amber-400';
  return 'text-red-400';
}

export const TelemetryPanel: React.FC<Props> = ({ result }) => {
  if (!result) {
    return (
      <div className="text-sm text-slate-400" data-testid="telemetry-panel">
        Run a simulation to see SLA impact and resilience advice.
      </div>
    );
  }

  return (
    <div className="space-y-5" data-testid="telemetry-panel">
      <div>
        <h2 className="text-xs font-mono uppercase tracking-wider text-[#00f0ff] mb-2">
          SLA / SLO
        </h2>
        <div
          className={`text-3xl font-mono ${slaColor(result.overallSla)}`}
          data-testid="overall-sla"
        >
          {result.overallSla.toFixed(1)}%
        </div>
        <p className="text-sm text-slate-400 mt-1">
          Weighted entry-point availability after fault injection.
        </p>
      </div>

      <div>
        <h3 className="text-xs font-mono uppercase tracking-wider text-slate-400 mb-2">
          Entry points
        </h3>
        <ul className="space-y-1 text-sm">
          {Object.entries(result.entryPointSlas).map(([id, sla]) => (
            <li key={id} className="flex justify-between gap-2 text-slate-200">
              <span className="truncate">{id}</span>
              <span className={`font-mono ${slaColor(sla)}`}>{sla.toFixed(1)}%</span>
            </li>
          ))}
        </ul>
      </div>

      {result.spofs.length > 0 ? (
        <div>
          <h3 className="text-xs font-mono uppercase tracking-wider text-amber-400 mb-2">
            Single points of failure
          </h3>
          <ul className="text-sm text-amber-200 space-y-1">
            {result.spofs.map(id => (
              <li key={id}>{id}</li>
            ))}
          </ul>
        </div>
      ) : null}

      {result.impactedDomains.length > 0 ? (
        <div>
          <h3 className="text-xs font-mono uppercase tracking-wider text-slate-400 mb-2">
            Impacted domains
          </h3>
          <p className="text-sm text-slate-300">{result.impactedDomains.join(', ')}</p>
        </div>
      ) : null}

      {result.advice.length > 0 ? (
        <div>
          <h3 className="text-xs font-mono uppercase tracking-wider text-slate-400 mb-2">
            Resilience advice
          </h3>
          <ul className="text-sm text-slate-300 space-y-2 list-disc pl-4">
            {result.advice.map((line, index) => (
              <li key={index}>{line}</li>
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  );
};
