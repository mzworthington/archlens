import type { EntityRef } from '@blueprint/core';
import {
  runResilienceSimulationAsync,
  applyResilienceToNode,
  applySafeguardToggle,
  mergeNodeSafeguards,
  resolveNodeResilience,
  type FaultType,
  type MonteCarloConfig,
  type NodeSafeguards,
  type SimulationResult,
} from '@blueprint/core/resilience';
import type { BlueprintState } from '../store';

export const DEFAULT_RESILIENCE_MONTE_CARLO: MonteCarloConfig = {
  iterations: 1000,
  seed: 42,
  severityJitter: 0.12,
};

export type ResiliencePanelTab = 'simulation' | 'properties';

export interface ResilienceState {
  isResilienceMode: boolean;
  resiliencePanelTab: ResiliencePanelTab;
  resilienceFaultType: FaultType;
  resilienceSeverity: number;
  resilienceSafeguards: Partial<Record<EntityRef, NodeSafeguards>>;
  resilienceMonteCarlo: MonteCarloConfig;
  resilienceSimulationResult: SimulationResult | null;
  resilienceSimulationRunning: boolean;
  setResilienceMode: (enabled: boolean) => void;
  toggleResilienceMode: () => void;
  setResiliencePanelTab: (tab: ResiliencePanelTab) => void;
  setResilienceFaultType: (faultType: FaultType) => void;
  setResilienceSeverity: (severity: number) => void;
  setResilienceSafeguard: (nodeId: EntityRef, key: keyof NodeSafeguards, enabled: boolean) => void;
  setResilienceMonteCarlo: (patch: Partial<MonteCarloConfig>) => void;
  runResilienceSimulation: () => void;
  clearResilienceSimulation: () => void;
}

export const createResilienceState = (
  set: (
    partial: Partial<BlueprintState> | ((state: BlueprintState) => Partial<BlueprintState>)
  ) => void,
  get: () => BlueprintState
): ResilienceState => ({
  isResilienceMode: false,
  resiliencePanelTab: 'simulation',
  resilienceFaultType: 'region-outage',
  resilienceSeverity: 1,
  resilienceSafeguards: {},
  resilienceMonteCarlo: { ...DEFAULT_RESILIENCE_MONTE_CARLO },
  resilienceSimulationResult: null,
  resilienceSimulationRunning: false,
  setResilienceMode: enabled =>
    set({
      isResilienceMode: enabled,
      ...(enabled ? { rightCollapsed: false, resiliencePanelTab: 'simulation' } : {}),
      ...(!enabled
        ? {
            resilienceSimulationResult: null,
            resilienceSafeguards: {},
          }
        : {}),
    }),
  toggleResilienceMode: () =>
    set(state => {
      const enabled = !state.isResilienceMode;
      return {
        isResilienceMode: enabled,
        ...(enabled ? { rightCollapsed: false, resiliencePanelTab: 'simulation' } : {}),
        ...(!enabled
          ? {
              resilienceSimulationResult: null,
              resilienceSafeguards: {},
            }
          : {}),
      };
    }),
  setResiliencePanelTab: tab => set({ resiliencePanelTab: tab }),
  setResilienceFaultType: faultType => set({ resilienceFaultType: faultType }),
  setResilienceSeverity: severity =>
    set({ resilienceSeverity: Math.min(1, Math.max(0, severity)) }),
  setResilienceSafeguard: (nodeId, key, enabled) => {
    const state = get();
    const node = state.schema.nodes.find(n => n.entityRef === nodeId);
    const rfNode = state.nodes.find(n => n.id === nodeId || n.data.entityRef === nodeId);
    const persisted = resolveNodeResilience(node);
    const session = state.resilienceSafeguards[nodeId] ?? {};
    const nextSafeguards = applySafeguardToggle(
      mergeNodeSafeguards(persisted, session),
      key,
      enabled
    );

    set({
      resilienceSafeguards: {
        ...state.resilienceSafeguards,
        [nodeId]: { ...session, [key]: enabled },
      },
    });

    if (rfNode) {
      const { resilience } = applyResilienceToNode(nextSafeguards);
      get().updateNode(rfNode.id, { resilience });
    }
  },
  setResilienceMonteCarlo: patch =>
    set(state => ({
      resilienceMonteCarlo: {
        ...state.resilienceMonteCarlo,
        ...patch,
        ...(patch.iterations != null
          ? { iterations: Math.min(10_000, Math.max(200, patch.iterations)) }
          : {}),
        ...(patch.severityJitter != null
          ? { severityJitter: Math.min(0.3, Math.max(0, patch.severityJitter)) }
          : {}),
        ...(patch.seed != null ? { seed: Math.max(1, Math.floor(patch.seed)) } : {}),
      },
    })),
  runResilienceSimulation: () => {
    const {
      schema,
      selectedNodeId,
      resilienceFaultType,
      resilienceSeverity,
      resilienceSafeguards,
      resilienceMonteCarlo,
      logger,
    } = get();
    if (!selectedNodeId) return;

    set({ resilienceSimulationRunning: true });
    void runResilienceSimulationAsync(
      schema,
      {
        faults: [
          {
            nodeId: selectedNodeId,
            faultType: resilienceFaultType,
            severity: resilienceSeverity,
          },
        ],
        safeguards: resilienceSafeguards,
      },
      { monteCarlo: resilienceMonteCarlo, logger }
    )
      .then((result: SimulationResult) => {
        set({
          resilienceSimulationResult: result,
          resilienceSimulationRunning: false,
          rightCollapsed: false,
        });
      })
      .catch(err => {
        logger.error('ChaosLens resilience simulation failed.', err);
        set({ resilienceSimulationRunning: false });
      });
  },
  clearResilienceSimulation: () => set({ resilienceSimulationResult: null }),
});
