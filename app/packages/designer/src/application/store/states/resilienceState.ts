import type { EntityRef } from '@archlens/core';
import {
  runResilienceSimulationAsync,
  applyResilienceToNode,
  applySafeguardToggle,
  mergeNodeSafeguards,
  resolveNodeResilience,
  buildSimulationSchema,
  type FaultType,
  type MonteCarloConfig,
  type NodeSafeguards,
  type SimulationResult,
  type TelemetryViewMode,
} from '@archlens/core/resilience';
import type { BlueprintState } from '../store';
import { isDesktopViewport } from '../layoutUtils';
import { syncResilienceExternalsToCanvas } from '../../resilience/syncResilienceExternals';

function resilienceModePanelPatch(): Partial<BlueprintState> {
  return {
    resiliencePanelTab: 'simulation',
    ...(isDesktopViewport() ? { rightCollapsed: false } : {}),
  };
}

export const DEFAULT_RESILIENCE_MONTE_CARLO: MonteCarloConfig = {
  iterations: 1000,
  seed: 42,
  severityJitter: 0.12,
};

export type ResiliencePanelTab = 'simulation' | 'properties';

export interface ResilienceState {
  isResilienceMode: boolean;
  resilienceTelemetryView: TelemetryViewMode;
  resiliencePanelTab: ResiliencePanelTab;
  resilienceFaultType: FaultType;
  resilienceSeverity: number;
  resilienceSafeguards: Partial<Record<EntityRef, NodeSafeguards>>;
  resilienceMonteCarlo: MonteCarloConfig;
  resilienceSimulationResult: SimulationResult | null;
  resilienceSimulationRunning: boolean;
  /** Entity refs in the last simulation neighborhood (fault target + direct neighbors). */
  resilienceSimulationScope: string[] | null;
  setResilienceMode: (enabled: boolean) => void;
  toggleResilienceMode: () => void;
  setResilienceTelemetryView: (view: TelemetryViewMode) => void;
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
  resilienceTelemetryView: 'sre',
  resiliencePanelTab: 'simulation',
  resilienceFaultType: 'region-outage',
  resilienceSeverity: 1,
  resilienceSafeguards: {},
  resilienceMonteCarlo: { ...DEFAULT_RESILIENCE_MONTE_CARLO },
  resilienceSimulationResult: null,
  resilienceSimulationRunning: false,
  resilienceSimulationScope: null,
  setResilienceMode: enabled => {
    set({
      isResilienceMode: enabled,
      ...(enabled ? resilienceModePanelPatch() : {}),
      ...(!enabled
        ? {
            resilienceSimulationResult: null,
            resilienceSimulationScope: null,
            resilienceSafeguards: {},
            resilienceTelemetryView: 'sre',
          }
        : {}),
    });
    if (enabled) {
      void syncResilienceExternalsToCanvas(get, set);
    }
  },
  toggleResilienceMode: () => {
    get().setResilienceMode(!get().isResilienceMode);
  },
  setResilienceTelemetryView: view => set({ resilienceTelemetryView: view }),
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
      loadedSystems,
      resilienceFaultType,
      resilienceSeverity,
      resilienceSafeguards,
      resilienceMonteCarlo,
      logger,
      addExternalDependencies,
    } = get();
    if (!selectedNodeId) return;

    const {
      schema: simulationSchema,
      scope,
      materialized,
    } = buildSimulationSchema(schema, selectedNodeId, loadedSystems);

    if (materialized.length > 0) {
      addExternalDependencies(materialized.map(entity => entity.entityRef));
    }

    set({ resilienceSimulationRunning: true, resilienceSimulationScope: scope });
    void runResilienceSimulationAsync(
      simulationSchema,
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
        });
      })
      .catch(err => {
        logger.error('ChaosLens resilience simulation failed.', err);
        set({ resilienceSimulationRunning: false });
      });
  },
  clearResilienceSimulation: () =>
    set({ resilienceSimulationResult: null, resilienceSimulationScope: null }),
});
