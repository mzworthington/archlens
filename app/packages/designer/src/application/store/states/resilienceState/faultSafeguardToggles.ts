import type { EntityRef } from '@archlens/core';
import {
  applyResilienceToNode,
  applySafeguardToggle,
  mergeNodeSafeguards,
  resolveNodeResilience,
  type FaultType,
  type MonteCarloConfig,
  type NodeFaultConfig,
  type NodeSafeguards,
} from '@archlens/core/resilience';
import type { ResilienceGet, ResilienceSet } from './types';
import { upsertFault } from './helpers';

export function createFaultSafeguardToggleActions(set: ResilienceSet, get: ResilienceGet) {
  return {
    setResilienceFaultType: (faultType: FaultType) => {
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
    setResilienceSeverity: (severity: number) => {
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
    updateResilienceFault: (
      nodeId: EntityRef,
      patch: Partial<Pick<NodeFaultConfig, 'faultType' | 'severity'>>
    ) => {
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
    removeResilienceFault: (nodeId: EntityRef) => {
      set(state => ({
        resilienceFaults: state.resilienceFaults.filter(fault => fault.nodeId !== nodeId),
        resilienceSimulationResult: null,
        resilienceSimulationScope: null,
        ...(state.chaosSpecMetadata ? { chaosSpecMetadata: null } : {}),
      }));
    },
    setResilienceSafeguard: (nodeId: EntityRef, key: keyof NodeSafeguards, enabled: boolean) => {
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
    setResilienceMonteCarlo: (patch: Partial<MonteCarloConfig>) =>
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
  };
}
