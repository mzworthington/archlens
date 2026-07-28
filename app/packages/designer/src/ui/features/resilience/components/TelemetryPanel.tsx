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

function integrityColor(score: number): string {
  if (score >= 95) return 'text-emerald-400';
  if (score >= 80) return 'text-amber-400';
  return 'text-orange-400';
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
          {result.engine ? (
            <span className="ml-2 font-mono text-[10px] uppercase text-slate-500">
              ({result.engine} engine)
            </span>
          ) : null}
        </p>
        {result.engine === 'typescript' ? (
          <p
            className="mt-2 text-xs text-amber-300/90 border border-amber-500/20 bg-amber-500/10 rounded-md px-2 py-1.5"
            data-testid="telemetry-fallback-notice"
          >
            Deterministic fallback — Monte Carlo bands unavailable. Rebuild WASM for the full
            ChaosLens engine.
          </p>
        ) : null}
      </div>

      {result.monteCarlo ? (
        <div>
          <h3 className="text-xs font-mono uppercase tracking-wider text-[#00f0ff] mb-2">
            Monte Carlo ({result.monteCarlo.iterations.toLocaleString()} runs)
          </h3>
          <ul className="space-y-1 text-sm text-slate-200">
            <li className="flex justify-between gap-2">
              <span>Mean SLA</span>
              <span className={`font-mono ${slaColor(result.monteCarlo.overallSlaMean)}`}>
                {result.monteCarlo.overallSlaMean.toFixed(1)}%
              </span>
            </li>
            <li className="flex justify-between gap-2">
              <span>P5 SLA</span>
              <span className={`font-mono ${slaColor(result.monteCarlo.overallSlaP5)}`}>
                {result.monteCarlo.overallSlaP5.toFixed(1)}%
              </span>
            </li>
            <li className="flex justify-between gap-2">
              <span>P95 SLA</span>
              <span className={`font-mono ${slaColor(result.monteCarlo.overallSlaP95)}`}>
                {result.monteCarlo.overallSlaP95.toFixed(1)}%
              </span>
            </li>
          </ul>
        </div>
      ) : null}

      <div>
        <h2 className="text-xs font-mono uppercase tracking-wider text-amber-400 mb-2">
          Data integrity
        </h2>
        <div
          className={`text-3xl font-mono ${integrityColor(result.overallIntegrity)}`}
          data-testid="overall-integrity"
        >
          {result.overallIntegrity.toFixed(1)}%
        </div>
        <p className="text-sm text-slate-400 mt-1">
          Correctness of async streams and peer subscribers — independent of entry-point SLA.
        </p>
        {result.integrityImpactedDomains.length > 0 ? (
          <p className="text-sm text-amber-200/90 mt-2">
            Impacted: {result.integrityImpactedDomains.join(', ')}
          </p>
        ) : null}
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
