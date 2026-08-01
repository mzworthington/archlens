import React from 'react';
import { Play, ShieldAlert } from 'lucide-react';
import { useLocation } from 'wouter';
import { useBlueprintStore } from '../../../../../application/store/store';
import { workspaceEntityRefFromPath } from '../../../../../application/navigation/workspaceUrl';
import { isResilienceSimulationDiagramLevel } from '@archlens/core/recommendations';
import { buildChaosLensUrl } from '../../../../../application/resilience/chaosLensUrl';

const lensBtnClass =
  'relative px-2 py-1 rounded-md text-[10px] font-bold tracking-wide transition cursor-pointer flex items-center justify-center gap-1.5 min-w-[2rem]';

const RESILIENCE_UNAVAILABLE_MESSAGE =
  'Resilience simulation applies at the container level. Open the container diagram to model blast radius.';

function ResilienceLensButton() {
  const [location, setLocation] = useLocation();
  const { isResilienceMode, setResilienceMode, resilienceFaults, schema, setNotification } =
    useBlueprintStore();
  const unavailable = !isResilienceSimulationDiagramLevel(schema.level);

  const handleClick = () => {
    if (!isResilienceMode && unavailable) {
      setNotification({
        type: 'info',
        title: 'Resilience lens',
        message: RESILIENCE_UNAVAILABLE_MESSAGE,
      });
      return;
    }

    const next = !isResilienceMode;
    setResilienceMode(next);
    if (next) {
      setLocation(
        buildChaosLensUrl(workspaceEntityRefFromPath(location), { faults: resilienceFaults })
      );
      return;
    }

    const params = new URLSearchParams(window.location.search);
    if (params.get('lens') === 'chaoslens') params.delete('lens');
    params.delete('resilience');
    params.delete('fault');
    params.delete('type');
    params.delete('severity');
    params.delete('faults');
    const query = params.toString();
    setLocation(`${window.location.pathname}${query ? `?${query}` : ''}`, { replace: true });
  };

  return (
    <button
      type="button"
      onClick={handleClick}
      aria-pressed={isResilienceMode && !unavailable}
      data-testid="toolbar-resilience-lens"
      title={
        unavailable && !isResilienceMode
          ? RESILIENCE_UNAVAILABLE_MESSAGE
          : isResilienceMode
            ? 'Exit resilience mode'
            : 'Enter resilience mode'
      }
      aria-label={
        unavailable && !isResilienceMode
          ? 'Resilience lens — unavailable on this diagram level'
          : isResilienceMode
            ? 'Exit resilience mode'
            : 'Enter resilience mode'
      }
      className={`${lensBtnClass} ${
        unavailable && !isResilienceMode
          ? 'text-slate-500 hover:text-slate-300 hover:bg-slate-900'
          : isResilienceMode
            ? 'bg-[#00f0ff]/20 text-[#00f0ff]'
            : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
      }`}
    >
      <ShieldAlert className="w-3.5 h-3.5 shrink-0" aria-hidden />
      <span className="hidden lg:inline">Resilience</span>
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
      <span className="hidden lg:inline">
        {resilienceSimulationRunning ? 'Simulating…' : 'Simulate'}
      </span>
    </button>
  );
}

/** ChaosLens mode toggle — TraceLens lives in the Explorer side panel tabs. */
export const LensToolbarControls: React.FC = () => {
  const isResilienceMode = useBlueprintStore(s => s.isResilienceMode);

  return (
    <div
      className="flex items-center gap-1.5 shrink-0 select-none whitespace-nowrap"
      data-testid="lens-toolbar-controls"
      onPointerDown={e => e.stopPropagation()}
      onClick={e => e.stopPropagation()}
    >
      <ResilienceLensButton />
      {isResilienceMode ? <SimulateButton /> : null}
    </div>
  );
};
