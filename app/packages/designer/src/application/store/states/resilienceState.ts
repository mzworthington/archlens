import type { EntityRef } from '@archlens/core';
import { getSchemaEntityRef } from '@archlens/core';
import {
  applyResilienceToNode,
  applySafeguardToggle,
  defaultFaultSeverity,
  mergeNodeSafeguards,
  resolveNodeResilience,
  buildSimulationSchemaForFaults,
  parseChaosSpecFromYaml,
  validateChaosSpecForDiagram,
  type ChaosSpecMetadata,
  type FaultType,
  type MonteCarloConfig,
  type NodeFaultConfig,
  type NodeSafeguards,
  type SimulationResult,
  type TelemetryViewMode,
} from '@archlens/core/resilience';
import { runResilienceSimulationAsync } from '../../resilience/runResilienceSimulationAsync';
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
  applyChaosSpecYaml: (yaml: string) => string | null;
  clearResilienceScenario: () => void;
  runResilienceSimulation: () => void;
  simulateResilienceFaultAtNode: (nodeId: EntityRef) => void;
  clearResilienceSimulation: () => void;
}

function upsertFault(
  faults: NodeFaultConfig[],
  nodeId: EntityRef,
  faultType: FaultType,
  severity: number
): NodeFaultConfig[] {
  const nextFault: NodeFaultConfig = { nodeId, faultType, severity };
  const index = faults.findIndex(fault => fault.nodeId === nodeId);
  if (index === -1) return [...faults, nextFault];
  const updated = [...faults];
  updated[index] = { ...updated[index], ...nextFault };
  return updated;
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
  resilienceFaults: [],
  resilienceFaultType: 'region-outage',
  resilienceSeverity: 1,
  resilienceSafeguards: {},
  resilienceMonteCarlo: { ...DEFAULT_RESILIENCE_MONTE_CARLO },
  resilienceSimulationResult: null,
  resilienceSimulationRunning: false,
  resilienceSimulationScope: null,
  chaosSpecMetadata: null,
  chaosSpecDialogMode: null,
  setResilienceMode: enabled => {
    set({
      isResilienceMode: enabled,
      ...(enabled ? { isTraceLensMode: false, ...resilienceModePanelPatch() } : {}),
      ...(!enabled
        ? {
            resilienceSimulationResult: null,
            resilienceSimulationScope: null,
            resilienceSafeguards: {},
            resilienceFaults: [],
            chaosSpecMetadata: null,
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
  applyResilienceUrlState: faults => {
    const first = faults[0];
    set({
      isResilienceMode: true,
      isTraceLensMode: false,
      ...resilienceModePanelPatch(),
      resilienceFaults: faults,
      ...(first
        ? {
            selectedNodeId: first.nodeId,
            resilienceFaultType: first.faultType,
            resilienceSeverity: first.severity ?? defaultFaultSeverity(first.faultType),
          }
        : {}),
    });
    void syncResilienceExternalsToCanvas(get, set);
  },
  setResilienceTelemetryView: view => set({ resilienceTelemetryView: view }),
  setResiliencePanelTab: tab => set({ resiliencePanelTab: tab }),
  setResilienceFaultType: faultType => {
    const state = get();
    const selectedNodeId = state.selectedNodeId;
    if (!selectedNodeId) {
      set({ resilienceFaultType: faultType });
      return;
    }

    const hasFault = state.resilienceFaults.some(fault => fault.nodeId === selectedNodeId);
    set({
      resilienceFaultType: faultType,
      ...(hasFault
        ? {
            resilienceFaults: upsertFault(
              state.resilienceFaults,
              selectedNodeId,
              faultType,
              state.resilienceSeverity
            ),
          }
        : {}),
    });
  },
  setResilienceSeverity: severity => {
    const clamped = Math.min(1, Math.max(0, severity));
    const state = get();
    const selectedNodeId = state.selectedNodeId;
    if (!selectedNodeId) {
      set({ resilienceSeverity: clamped });
      return;
    }

    const hasFault = state.resilienceFaults.some(fault => fault.nodeId === selectedNodeId);
    set({
      resilienceSeverity: clamped,
      ...(hasFault
        ? {
            resilienceFaults: upsertFault(
              state.resilienceFaults,
              selectedNodeId,
              state.resilienceFaultType,
              clamped
            ),
          }
        : {}),
    });
  },
  addResilienceFaultFromDraft: () => {
    const state = get();
    const selectedNodeId = state.selectedNodeId;
    if (!selectedNodeId) return;

    set({
      resilienceFaults: upsertFault(
        state.resilienceFaults,
        selectedNodeId,
        state.resilienceFaultType,
        state.resilienceSeverity
      ),
      resilienceSimulationResult: null,
      resilienceSimulationScope: null,
    });
  },
  updateResilienceFault: (nodeId, patch) => {
    set(state => ({
      resilienceFaults: state.resilienceFaults.map(fault =>
        fault.nodeId === nodeId ? { ...fault, ...patch } : fault
      ),
      resilienceSimulationResult: null,
      resilienceSimulationScope: null,
      ...(state.selectedNodeId === nodeId
        ? {
            ...(patch.faultType != null ? { resilienceFaultType: patch.faultType } : {}),
            ...(patch.severity != null ? { resilienceSeverity: patch.severity } : {}),
          }
        : {}),
    }));
  },
  removeResilienceFault: nodeId => {
    set(state => ({
      resilienceFaults: state.resilienceFaults.filter(fault => fault.nodeId !== nodeId),
      resilienceSimulationResult: null,
      resilienceSimulationScope: null,
      ...(state.chaosSpecMetadata ? { chaosSpecMetadata: null } : {}),
    }));
  },
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
  openChaosSpecDialog: mode => set({ chaosSpecDialogMode: mode }),
  closeChaosSpecDialog: () => set({ chaosSpecDialogMode: null }),
  applyChaosSpecYaml: yaml => {
    const state = get();
    let document;
    try {
      document = parseChaosSpecFromYaml(yaml);
    } catch (err) {
      return err instanceof Error ? err.message : 'Invalid ChaosSpec YAML';
    }

    const activeDiagramRef = getSchemaEntityRef(state.schema);
    const validationError = validateChaosSpecForDiagram(document, state.schema, activeDiagramRef);
    if (validationError) return validationError;

    const firstFault = document.faults[0];

    set({
      chaosSpecMetadata: document.metadata,
      resilienceFaults: document.faults,
      isResilienceMode: true,
      ...resilienceModePanelPatch(),
      resilienceSafeguards: document.safeguards ?? {},
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
  clearResilienceScenario: () =>
    set({
      chaosSpecMetadata: null,
      resilienceFaults: [],
      resilienceSimulationResult: null,
      resilienceSimulationScope: null,
    }),
  runResilienceSimulation: () => {
    const {
      schema,
      loadedSystems,
      resilienceFaults,
      resilienceSafeguards,
      resilienceMonteCarlo,
      logger,
      resilienceEnginePort,
      addExternalDependencies,
    } = get();

    if (resilienceFaults.length === 0) return;

    const faultTargets = resilienceFaults.map(fault => fault.nodeId);
    const simulationSpec = {
      faults: resilienceFaults,
      safeguards: resilienceSafeguards,
    };

    const {
      schema: simulationSchema,
      scope,
      materialized,
    } = buildSimulationSchemaForFaults(schema, faultTargets, loadedSystems);

    if (materialized.length > 0) {
      addExternalDependencies(
        materialized.map(entity => entity.entityRef),
        simulationSchema.dependencies
      );
    } else if ((simulationSchema.dependencies?.length ?? 0) > 0) {
      // Externals may already be on the canvas from entering resilience mode;
      // still wire any enriched simulation dependency lines that are missing.
      addExternalDependencies([], simulationSchema.dependencies);
    }

    set({ resilienceSimulationRunning: true, resilienceSimulationScope: scope });
    void runResilienceSimulationAsync(simulationSchema, simulationSpec, {
      monteCarlo: resilienceMonteCarlo,
      logger,
      engine: resilienceEnginePort,
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
  simulateResilienceFaultAtNode: nodeId => {
    set({
      selectedNodeId: nodeId,
      isResilienceMode: true,
      ...resilienceModePanelPatch(),
      resilienceFaults: [{ nodeId, faultType: 'region-outage', severity: 1 }],
      resilienceFaultType: 'region-outage',
      resilienceSeverity: 1,
      resilienceSimulationResult: null,
      resilienceSimulationScope: null,
      chaosSpecMetadata: null,
    });
    void syncResilienceExternalsToCanvas(get, set);
    get().runResilienceSimulation();
  },
  clearResilienceSimulation: () =>
    set({ resilienceSimulationResult: null, resilienceSimulationScope: null }),
});
