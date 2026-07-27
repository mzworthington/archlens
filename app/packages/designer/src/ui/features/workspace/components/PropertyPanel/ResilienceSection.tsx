import React from 'react';
import type { FaultType, MonteCarloConfig, NodeSafeguards } from '@blueprint/core/resilience';
import { FaultControls } from '../../../resilience/components/FaultControls';
import { MonteCarloControls } from '../../../resilience/components/MonteCarloControls';
import { TelemetryPanel } from '../../../resilience/components/TelemetryPanel';
import type { SimulationResult } from '@blueprint/core/resilience';

type Props = {
  selectedNodeLabel: string | null;
  faultType: FaultType;
  severity: number;
  safeguards: NodeSafeguards;
  monteCarlo: MonteCarloConfig;
  simulationResult: SimulationResult | null;
  onFaultTypeChange: (faultType: FaultType) => void;
  onSeverityChange: (severity: number) => void;
  onSafeguardChange: (key: keyof NodeSafeguards, enabled: boolean) => void;
  onMonteCarloChange: (patch: Partial<MonteCarloConfig>) => void;
};

export const ResilienceSection: React.FC<Props> = props => {
  return (
    <div className="space-y-6" data-testid="resilience-section">
      <TelemetryPanel result={props.simulationResult} />
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
