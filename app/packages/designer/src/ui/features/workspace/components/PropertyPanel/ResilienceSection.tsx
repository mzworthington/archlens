import React from 'react';
import type {
  ChaosSpecDocument,
  FaultType,
  MonteCarloConfig,
  NodeSafeguards,
  TelemetryViewMode,
} from '@archlens/core/resilience';
import { FaultControls } from '../../../resilience/components/FaultControls';
import { MonteCarloControls } from '../../../resilience/components/MonteCarloControls';
import { TelemetryPanel } from '../../../resilience/components/TelemetryPanel';
import { ExecutiveTelemetryPanel } from '../../../resilience/components/ExecutiveTelemetryPanel';
import { TelemetryViewToggle } from '../../../resilience/components/TelemetryViewToggle';
import type { SimulationResult } from '@archlens/core/resilience';

type Props = {
  telemetryView: TelemetryViewMode;
  selectedNodeLabel: string | null;
  loadedChaosSpec: ChaosSpecDocument | null;
  faultType: FaultType;
  severity: number;
  safeguards: NodeSafeguards;
  monteCarlo: MonteCarloConfig;
  simulationResult: SimulationResult | null;
  onTelemetryViewChange: (view: TelemetryViewMode) => void;
  onFaultTypeChange: (faultType: FaultType) => void;
  onSeverityChange: (severity: number) => void;
  onSafeguardChange: (key: keyof NodeSafeguards, enabled: boolean) => void;
  onMonteCarloChange: (patch: Partial<MonteCarloConfig>) => void;
  onLoadChaosSpec: () => void;
  onClearChaosSpec: () => void;
};

export const ResilienceSection: React.FC<Props> = props => {
  return (
    <div className="space-y-6" data-testid="resilience-section">
      <div className="rounded-xl border border-slate-800 bg-slate-950/50 p-3 space-y-2">
        {props.loadedChaosSpec ? (
          <div data-testid="loaded-chaos-spec-banner" className="space-y-2">
            <div className="flex items-start justify-between gap-2">
              <div>
                <p className="text-[10px] font-mono uppercase tracking-[0.14em] text-[#00f0ff]">
                  Loaded scenario
                </p>
                <p className="text-sm font-semibold text-slate-100">
                  {props.loadedChaosSpec.metadata.name}
                </p>
                <p className="text-xs text-slate-500 mt-1">
                  {props.loadedChaosSpec.faults.length} fault
                  {props.loadedChaosSpec.faults.length === 1 ? '' : 's'} · Simulate uses the YAML
                  scenario
                </p>
              </div>
              <button
                type="button"
                onClick={props.onClearChaosSpec}
                className="text-[11px] font-semibold text-slate-400 hover:text-slate-200 transition cursor-pointer"
              >
                Clear
              </button>
            </div>
          </div>
        ) : (
          <div className="flex items-center justify-between gap-2">
            <p className="text-xs text-slate-500 leading-relaxed">
              Load a version-controlled ChaosSpec YAML scenario, or configure a one-off fault below.
            </p>
            <button
              type="button"
              onClick={props.onLoadChaosSpec}
              className="shrink-0 text-[11px] font-semibold text-[#00f0ff] hover:text-cyan-300 transition cursor-pointer"
              data-testid="load-chaos-spec-button"
            >
              Load ChaosSpec
            </button>
          </div>
        )}
      </div>
      <TelemetryViewToggle view={props.telemetryView} onViewChange={props.onTelemetryViewChange} />
      {props.telemetryView === 'sre' ? (
        <TelemetryPanel result={props.simulationResult} />
      ) : (
        <ExecutiveTelemetryPanel result={props.simulationResult} />
      )}
      <div className="border-t border-slate-800 pt-6">
        <FaultControls
          selectedNodeLabel={props.selectedNodeLabel}
          faultType={props.faultType}
          severity={props.severity}
          safeguards={props.safeguards}
          onFaultTypeChange={props.onFaultTypeChange}
          onSeverityChange={props.onSeverityChange}
          onSafeguardChange={props.onSafeguardChange}
        />
      </div>
      <div className="border-t border-slate-800 pt-6">
        <MonteCarloControls config={props.monteCarlo} onChange={props.onMonteCarloChange} />
      </div>
    </div>
  );
};
