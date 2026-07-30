import type { EntityRef } from '@archlens/core';
import { getSchemaEntityRef } from '@archlens/core';
import {
  runResilienceSimulationAsync,
  applyResilienceToNode,
  applySafeguardToggle,
  mergeNodeSafeguards,
  resolveNodeResilience,
  buildSimulationSchemaForFaults,
  chaosSpecDocumentToRuntime,
  parseChaosSpecFromYaml,
  validateChaosSpecForDiagram,
  type ChaosSpecDocument,
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
  /** Loaded ChaosSpec scenario (YAML import); takes precedence over manual fault controls. */
  loadedChaosSpec: ChaosSpecDocument | null;
  isImportChaosSpecOpen: boolean;
  setResilienceMode: (enabled: boolean) => void;
  toggleResilienceMode: () => void;
  setResilienceTelemetryView: (view: TelemetryViewMode) => void;
  setResiliencePanelTab: (tab: ResiliencePanelTab) => void;
  setResilienceFaultType: (faultType: FaultType) => void;
  setResilienceSeverity: (severity: number) => void;
  setResilienceSafeguard: (nodeId: EntityRef, key: keyof NodeSafeguards, enabled: boolean) => void;
  setResilienceMonteCarlo: (patch: Partial<MonteCarloConfig>) => void;
  setIsImportChaosSpecOpen: (open: boolean) => void;
  applyChaosSpecYaml: (yaml: string) => string | null;
  clearLoadedChaosSpec: () => void;
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
  loadedChaosSpec: null,
  isImportChaosSpecOpen: false,
  setResilienceMode: enabled => {
    set({
      isResilienceMode: enabled,
      ...(enabled ? resilienceModePanelPatch() : {}),
      ...(!enabled
        ? {
            resilienceSimulationResult: null,
            resilienceSimulationScope: null,
            resilienceSafeguards: {},
            loadedChaosSpec: null,
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
  setIsImportChaosSpecOpen: open => set({ isImportChaosSpecOpen: open }),
  applyChaosSpecYaml: yaml => {
    const state = get();
    let document: ChaosSpecDocument;
    try {
      document = parseChaosSpecFromYaml(yaml);
    } catch (err) {
      return err instanceof Error ? err.message : 'Invalid ChaosSpec YAML';
    }

    const activeDiagramRef = getSchemaEntityRef(state.schema);
    const validationError = validateChaosSpecForDiagram(document, state.schema, activeDiagramRef);
    if (validationError) return validationError;

    const firstFault = document.faults[0];
    const sessionSafeguards = document.safeguards ?? {};

    set({
      loadedChaosSpec: document,
      isResilienceMode: true,
      ...resilienceModePanelPatch(),
      resilienceSafeguards: sessionSafeguards,
      resilienceMonteCarlo: document.monteCarlo
        ? { ...DEFAULT_RESILIENCE_MONTE_CARLO, ...document.monteCarlo }
        : { ...DEFAULT_RESILIENCE_MONTE_CARLO },
      resilienceFaultType: firstFault.faultType,
      resilienceSeverity: firstFault.severity ?? 1,
      resilienceSimulationResult: null,
      resilienceSimulationScope: null,
      selectedNodeId: firstFault.nodeId,
    });

    void syncResilienceExternalsToCanvas(get, set);
    return null;
  },
  clearLoadedChaosSpec: () =>
    set({
      loadedChaosSpec: null,
      resilienceSimulationResult: null,
      resilienceSimulationScope: null,
    }),
  runResilienceSimulation: () => {
    const {
      schema,
      selectedNodeId,
      loadedSystems,
      loadedChaosSpec,
      resilienceFaultType,
      resilienceSeverity,
      resilienceSafeguards,
      resilienceMonteCarlo,
      logger,
      addExternalDependencies,
    } = get();

    const runtime = loadedChaosSpec ? chaosSpecDocumentToRuntime(loadedChaosSpec) : null;
    const faultTargets = runtime
      ? runtime.spec.faults.map(fault => fault.nodeId)
      : selectedNodeId
        ? [selectedNodeId]
        : [];

    if (faultTargets.length === 0) return;

    const simulationSpec = runtime?.spec ?? {
      faults: [
        {
          nodeId: selectedNodeId!,
          faultType: resilienceFaultType,
          severity: resilienceSeverity,
        },
      ],
      safeguards: resilienceSafeguards,
    };

    const monteCarlo = runtime?.monteCarlo ?? resilienceMonteCarlo;

    const {
      schema: simulationSchema,
      scope,
      materialized,
    } = buildSimulationSchemaForFaults(schema, faultTargets, loadedSystems);

    if (materialized.length > 0) {
      addExternalDependencies(materialized.map(entity => entity.entityRef));
    }

    set({ resilienceSimulationRunning: true, resilienceSimulationScope: scope });
    void runResilienceSimulationAsync(simulationSchema, simulationSpec, {
      monteCarlo,
      logger,
    })
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
