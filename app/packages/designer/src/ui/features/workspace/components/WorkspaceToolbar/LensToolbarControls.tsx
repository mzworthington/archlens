import React from 'react';
import { Link2, Play, ShieldAlert } from 'lucide-react';
import { useBlueprintStore } from '../../../../../application/store/store';
import {
  countCouplingCapableNodes,
  countCouplingCapableSchemaNodes,
} from '../../../../../application/forensics/resolveCouplingEdges';

const lensBtnClass =
  'relative px-2 py-1 rounded-md text-[10px] font-bold tracking-wide transition cursor-pointer flex items-center justify-center gap-1.5 min-w-[2rem]';

const COUPLING_UNAVAILABLE_MESSAGE =
  'No temporal coupling on this diagram. Zoom into a component diagram with TraceLens data, or run forensics enrichment on your blueprint.';

function CouplingLensButton() {
  const { showCoupling, toggleShowCoupling, setShowCoupling, nodes, schema, setNotification } =
    useBlueprintStore();
  const couplingNodeCount = Math.max(
    countCouplingCapableNodes(nodes),
    countCouplingCapableSchemaNodes(schema.nodes)
  );
  const unavailable = couplingNodeCount === 0;

  const handleClick = () => {
    if (unavailable) {
      setNotification({
        type: 'info',
        title: 'Coupling lens',
        message: COUPLING_UNAVAILABLE_MESSAGE,
      });
      return;
    }
    if (showCoupling) {
      toggleShowCoupling();
    } else {
      setShowCoupling(true);
    }
  };

  return (
    <button
      type="button"
      onClick={handleClick}
      aria-pressed={showCoupling && !unavailable}
      data-testid="toolbar-coupling-lens"
      title={
        unavailable
          ? COUPLING_UNAVAILABLE_MESSAGE
          : showCoupling
            ? 'Turn off coupling lens'
            : 'Show temporal coupling across the diagram'
      }
      aria-label={
        unavailable
          ? 'Coupling lens — no data on this diagram'
          : showCoupling
            ? 'Turn off coupling lens'
            : `Turn on coupling lens (${couplingNodeCount} nodes)`
      }
      className={`${lensBtnClass} ${
        unavailable
          ? 'text-slate-500 hover:text-slate-300 hover:bg-slate-900'
          : showCoupling
            ? 'bg-amber-500/20 text-amber-200'
            : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
      }`}
    >
      <Link2 className="w-3.5 h-3.5 shrink-0" aria-hidden />
      <span className="hidden xl:inline">Coupling</span>
      {couplingNodeCount > 0 ? (
        <span
          className={`tabular-nums text-[9px] font-mono ${
            showCoupling ? 'text-amber-200/90' : 'text-slate-500'
          }`}
        >
          {couplingNodeCount}
        </span>
      ) : null}
    </button>
  );
}

function ResilienceLensButton() {
  const { isResilienceMode, toggleResilienceMode } = useBlueprintStore();

  return (
    <button
      type="button"
      onClick={() => toggleResilienceMode()}
      aria-pressed={isResilienceMode}
      data-testid="toolbar-resilience-lens"
      className={`${lensBtnClass} ${
        isResilienceMode
          ? 'bg-[#00f0ff]/20 text-[#00f0ff]'
          : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
      }`}
      aria-label={isResilienceMode ? 'Exit resilience mode' : 'Enter resilience mode'}
      title={isResilienceMode ? 'Exit resilience mode' : 'Enter resilience mode'}
    >
      <ShieldAlert className="w-3.5 h-3.5 shrink-0" aria-hidden />
      <span className="hidden xl:inline">Resilience</span>
    </button>
  );
}

function SimulateButton() {
  const { resilienceFaults, runResilienceSimulation, resilienceSimulationRunning } =
    useBlueprintStore();
  const canSimulate = resilienceFaults.length > 0;

  return (
    <button
      type="button"
      onClick={() => runResilienceSimulation()}
      disabled={!canSimulate || resilienceSimulationRunning}
      data-testid="toolbar-resilience-simulate"
      className={`${lensBtnClass} border border-[#00f0ff]/25 text-[#00f0ff] hover:bg-[#00f0ff]/10 disabled:opacity-40`}
      aria-label="Run resilience simulation"
      title="Run resilience simulation"
    >
      <Play className="w-3.5 h-3.5 shrink-0" aria-hidden />
      <span className="hidden xl:inline">
        {resilienceSimulationRunning ? 'Simulating…' : 'Simulate'}
      </span>
    </button>
  );
}

/** TraceLens + ChaosLens toggles — grouped like layout controls. */
export const LensToolbarControls: React.FC = () => {
  const isResilienceMode = useBlueprintStore(s => s.isResilienceMode);

  return (
    <div
      className="flex items-center gap-1 bg-slate-900/40 border border-slate-850 px-1.5 py-1 rounded-lg text-xs shrink-0 select-none"
      data-testid="lens-toolbar-controls"
      onPointerDown={e => e.stopPropagation()}
      onClick={e => e.stopPropagation()}
    >
      <span className="text-[10px] uppercase font-bold tracking-wider text-slate-500 hidden lg:inline pl-0.5">
        Lenses
      </span>
      <div
        className="flex items-center gap-0.5 rounded-md border border-slate-850 overflow-hidden"
        role="group"
        aria-label="Diagram lenses"
      >
        <CouplingLensButton />
        <ResilienceLensButton />
      </div>
      {isResilienceMode ? <SimulateButton /> : null}
    </div>
  );
};
