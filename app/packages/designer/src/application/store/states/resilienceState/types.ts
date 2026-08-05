import type { EntityRef } from '@archlens/core';
import type {
  ChaosSpecMetadata,
  FaultType,
  MonteCarloConfig,
  NodeFaultConfig,
  NodeSafeguards,
  SimulationResult,
  TelemetryViewMode,
} from '@archlens/core/resilience';
import type { BlueprintState } from '../../store';

export const DEFAULT_RESILIENCE_MONTE_CARLO: MonteCarloConfig = {
  iterations: 1000,
  seed: 42,
  severityJitter: 0.12,
};

export type ResiliencePanelTab = 'simulation' | 'properties';

export type ResilienceSet = (
  partial: Partial<BlueprintState> | ((state: BlueprintState) => Partial<BlueprintState>)
) => void;

export type ResilienceGet = () => BlueprintState;

export interface ResilienceState {
  isResilienceMode: boolean;
  resilienceTelemetryView: TelemetryViewMode;
  resiliencePanelTab: ResiliencePanelTab;
  resilienceFaults: NodeFaultConfig[];
  resilienceFaultType: FaultType;
  resilienceSeverity: number;
  resilienceSafeguards: Partial<Record<EntityRef, NodeSafeguards>>;
  resilienceMonteCarlo: MonteCarloConfig;
  resilienceSimulationResult: SimulationResult | null;
  resilienceSimulationRunning: boolean;
  resilienceSimulationScope: string[] | null;
  chaosSpecMetadata: ChaosSpecMetadata | null;
  chaosSpecDialogMode: 'import' | 'export' | null;
  isChaosSpecPickerOpen: boolean;
  setResilienceMode: (enabled: boolean) => void;
  toggleResilienceMode: () => void;
  /** Apply shareable ChaosLens URL scenario (mode + faults). */
  applyResilienceUrlState: (faults: NodeFaultConfig[]) => void;
  setResilienceTelemetryView: (view: TelemetryViewMode) => void;
  setResiliencePanelTab: (tab: ResiliencePanelTab) => void;
  setResilienceFaultType: (faultType: FaultType) => void;
  setResilienceSeverity: (severity: number) => void;
  addResilienceFaultFromDraft: () => void;
  updateResilienceFault: (
    nodeId: EntityRef,
    patch: Partial<Pick<NodeFaultConfig, 'faultType' | 'severity'>>
  ) => void;
  removeResilienceFault: (nodeId: EntityRef) => void;
  setResilienceSafeguard: (nodeId: EntityRef, key: keyof NodeSafeguards, enabled: boolean) => void;
  setResilienceMonteCarlo: (patch: Partial<MonteCarloConfig>) => void;
  openChaosSpecDialog: (mode: 'import' | 'export') => void;
  closeChaosSpecDialog: () => void;
  openChaosSpecPicker: () => void;
  closeChaosSpecPicker: () => void;
  applyChaosSpecYaml: (yaml: string) => string | null;
  clearResilienceScenario: () => void;
  runResilienceSimulation: () => void;
  simulateResilienceFaultAtNode: (nodeId: EntityRef) => void;
  clearResilienceSimulation: () => void;
}
