import React from 'react';
import type { MonteCarloConfig } from '@archlens/core/resilience';

const ITERATION_PRESETS = [200, 500, 1000, 2000, 5000, 10_000] as const;

type Props = {
  config: MonteCarloConfig;
  onChange: (patch: Partial<MonteCarloConfig>) => void;
};

export const MonteCarloControls: React.FC<Props> = ({ config, onChange }) => {
  const jitterPercent = Math.round((config.severityJitter ?? 0) * 100);

  return (
    <div className="space-y-4" data-testid="monte-carlo-controls">
      <div>
        <h2 className="text-xs font-mono uppercase tracking-wider text-[#00f0ff] mb-1">
          Monte Carlo
        </h2>
        <p className="text-xs text-slate-500">
          Jittered trials for P5 / mean / P95 SLA bands. Requires the WASM engine.
        </p>
      </div>

      <fieldset className="space-y-2">
        <legend className="text-xs font-mono uppercase tracking-wider text-slate-400 mb-2">
          Iterations
        </legend>
        <select
          value={config.iterations}
          onChange={e => onChange({ iterations: Number(e.target.value) })}
          className="w-full rounded-md border border-slate-700 bg-slate-900 px-2 py-1.5 text-sm text-slate-200"
          data-testid="monte-carlo-iterations"
        >
          {ITERATION_PRESETS.map(value => (
            <option key={value} value={value}>
              {value.toLocaleString()} runs
            </option>
          ))}
        </select>
      </fieldset>

      <fieldset>
        <legend className="text-xs font-mono uppercase tracking-wider text-slate-400 mb-2">
          Random seed
        </legend>
        <input
          type="number"
          min={1}
          step={1}
          value={config.seed ?? 42}
          onChange={e => onChange({ seed: Number(e.target.value) })}
          className="w-full rounded-md border border-slate-700 bg-slate-900 px-2 py-1.5 text-sm text-slate-200 font-mono"
          data-testid="monte-carlo-seed"
        />
      </fieldset>

      <fieldset>
        <legend className="text-xs font-mono uppercase tracking-wider text-slate-400 mb-2">
          Severity jitter (±{jitterPercent}%)
        </legend>
        <input
          type="range"
          min={0}
          max={30}
          value={jitterPercent}
          onChange={e => onChange({ severityJitter: Number(e.target.value) / 100 })}
          className="w-full accent-[#00f0ff]"
          data-testid="monte-carlo-jitter"
        />
      </fieldset>
    </div>
  );
};
