import React, { useMemo } from 'react';
import type {
  ChaosSpecMetadata,
  FaultType,
  MonteCarloConfig,
  NodeFaultConfig,
  NodeSafeguards,
  TelemetryViewMode,
} from '@archlens/core/resilience';
import { FaultScenarioList } from '../../../resilience/components/FaultScenarioList';
import { FaultControls } from '../../../resilience/components/FaultControls';
import { MonteCarloControls } from '../../../resilience/components/MonteCarloControls';
import { TelemetryPanel } from '../../../resilience/components/TelemetryPanel';
import { ExecutiveTelemetryPanel } from '../../../resilience/components/ExecutiveTelemetryPanel';
import { TelemetryViewToggle } from '../../../resilience/components/TelemetryViewToggle';
import type { SimulationResult } from '@archlens/core/resilience';
import type { EntityRef, SystemNode } from '@archlens/core';

type Props = {
  telemetryView: TelemetryViewMode;
  schemaNodes: SystemNode[];
  selectedNodeId: EntityRef | null;
  selectedNodeLabel: string | null;
  chaosSpecMetadata: ChaosSpecMetadata | null;
  faults: NodeFaultConfig[];
  faultType: FaultType;
  severity: number;
  safeguards: NodeSafeguards;
  monteCarlo: MonteCarloConfig;
  simulationResult: SimulationResult | null;
  onTelemetryViewChange: (view: TelemetryViewMode) => void;
  onSelectFault: (nodeId: EntityRef) => void;
  onRemoveFault: (nodeId: EntityRef) => void;
  onFaultTypeChange: (faultType: FaultType) => void;
  onSeverityChange: (severity: number) => void;
  onSafeguardChange: (key: keyof NodeSafeguards, enabled: boolean) => void;
  onAddFaultToScenario: () => void;
  onMonteCarloChange: (patch: Partial<MonteCarloConfig>) => void;
  onLoadChaosSpec: () => void;
  onExportChaosSpec: () => void;
  onClearScenario: () => void;
  sandboxMode?: boolean;
};

export const ResilienceSection: React.FC<Props> = props => {
  const nodeNameByRef = useMemo(
    () => new Map(props.schemaNodes.map(node => [node.entityRef, node.name])),
    [props.schemaNodes]
  );
  const isFaultInScenario = props.faults.some(fault => fault.nodeId === props.selectedNodeId);

  return (
    <div className="space-y-6" data-testid="resilience-section">
      {props.sandboxMode ? (
        <div
          className="rounded-lg border border-cyan-900/40 bg-cyan-950/20 px-3 py-2.5 text-xs text-cyan-100/90 leading-relaxed"
          data-testid="chaoslens-sandbox-note"
        >
          Demo sandbox mode: ChaosLens runs on bundled diagrams without opening a folder. Cross-repo
          simulation scope is limited to loaded blueprints — open a folder workspace for full-repo
          blast radius.
        </div>
      ) : null}
      <div className="rounded-xl border border-slate-800 bg-slate-950/50 p-3 space-y-2">
        {props.chaosSpecMetadata ? (
          <div data-testid="loaded-chaos-spec-banner" className="space-y-2">
            <div className="flex items-start justify-between gap-2">
              <div>
                <p className="text-[10px] font-mono uppercase tracking-[0.14em] text-[#00f0ff]">
                  Loaded scenario
                </p>
                <p className="text-sm font-semibold text-slate-100">
                  {props.chaosSpecMetadata.name}
                </p>
                <p className="text-xs text-slate-500 mt-1">
                  {props.faults.length} fault{props.faults.length === 1 ? '' : 's'} from ChaosSpec
                </p>
              </div>
              <button
                type="button"
                onClick={props.onClearScenario}
                className="text-[11px] font-semibold text-slate-400 hover:text-slate-200 transition cursor-pointer"
              >
                Clear
              </button>
              <button
                type="button"
                onClick={props.onExportChaosSpec}
                className="text-[11px] font-semibold text-slate-300 hover:text-slate-100 transition cursor-pointer"
                data-testid="export-chaos-spec-button"
              >
                Export
              </button>
            </div>
          </div>
        ) : (
          <div className="flex items-center justify-between gap-2">
            <p className="text-xs text-slate-500 leading-relaxed">
              Load a ChaosSpec YAML scenario, or build a multi-fault run below.
            </p>
            <div className="flex items-center gap-3 shrink-0">
              {props.faults.length > 0 ? (
                <button
                  type="button"
                  onClick={props.onExportChaosSpec}
                  className="text-[11px] font-semibold text-slate-300 hover:text-slate-100 transition cursor-pointer"
                  data-testid="export-chaos-spec-button"
                >
                  Export
                </button>
              ) : null}
              <button
                type="button"
                onClick={props.onLoadChaosSpec}
                className="text-[11px] font-semibold text-[#00f0ff] hover:text-cyan-300 transition cursor-pointer"
                data-testid="load-chaos-spec-button"
              >
                Load ChaosSpec
              </button>
            </div>
          </div>
        )}
      </div>

      <div className="space-y-3">
        <div className="flex items-center justify-between gap-2">
          <h2 className="text-xs font-mono uppercase tracking-wider text-[#00f0ff]">Scenario</h2>
          {props.faults.length > 0 && !props.chaosSpecMetadata ? (
            <button
              type="button"
              onClick={props.onClearScenario}
              className="text-[11px] font-semibold text-slate-400 hover:text-slate-200 transition cursor-pointer"
            >
              Clear all
            </button>
          ) : null}
        </div>
        <FaultScenarioList
          faults={props.faults}
          selectedNodeId={props.selectedNodeId}
          nodeNameByRef={nodeNameByRef}
          onSelectFault={props.onSelectFault}
          onRemoveFault={props.onRemoveFault}
        />
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
          isFaultInScenario={isFaultInScenario}
          onFaultTypeChange={props.onFaultTypeChange}
          onSeverityChange={props.onSeverityChange}
          onSafeguardChange={props.onSafeguardChange}
          onAddToScenario={props.onAddFaultToScenario}
        />
      </div>
      <div className="border-t border-slate-800 pt-6">
        <MonteCarloControls config={props.monteCarlo} onChange={props.onMonteCarloChange} />
      </div>
    </div>
  );
};
