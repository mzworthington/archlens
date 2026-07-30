import React from 'react';
import { Play, ShieldAlert } from 'lucide-react';
import { useBlueprintStore } from '../../../../../application/store/store';

const iconBtnClass =
  'min-h-11 min-w-11 sm:min-h-0 sm:min-w-0 px-3 py-1.5 rounded-lg border transition cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-1.5 text-xs font-semibold';

export const ResilienceToolbarControls: React.FC = () => {
  const {
    isResilienceMode,
    toggleResilienceMode,
    resilienceFaults,
    runResilienceSimulation,
    resilienceSimulationRunning,
  } = useBlueprintStore();

  const canSimulate = resilienceFaults.length > 0;

  return (
    <div className="flex items-center gap-1.5 shrink-0" data-testid="resilience-toolbar-controls">
      <button
        type="button"
        onClick={() => toggleResilienceMode()}
        aria-pressed={isResilienceMode}
        className={`${iconBtnClass} ${
          isResilienceMode
            ? 'border-[#00f0ff]/40 bg-[#00f0ff]/15 text-[#00f0ff]'
            : 'border-slate-800 bg-slate-900 text-slate-400 hover:bg-slate-800 hover:text-slate-200'
        }`}
        aria-label={isResilienceMode ? 'Exit resilience mode' : 'Enter resilience mode'}
      >
        <ShieldAlert className="w-3.5 h-3.5" />
        <span className="hidden sm:inline">Resilience</span>
      </button>
      {isResilienceMode ? (
        <button
          type="button"
          onClick={() => runResilienceSimulation()}
          disabled={!canSimulate || resilienceSimulationRunning}
          className={`${iconBtnClass} border-[#00f0ff]/30 text-[#00f0ff] hover:bg-[#00f0ff]/10 bg-slate-900`}
          aria-label="Run resilience simulation"
        >
          <Play className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">
            {resilienceSimulationRunning ? 'Simulating…' : 'Simulate'}
          </span>
        </button>
      ) : null}
    </div>
  );
};
