import type { EntityRef } from '@blueprint/core';
import {
  runResilienceSimulation as simulate,
  type FaultType,
  type NodeSafeguards,
  type SimulationResult,
} from '@blueprint/core/resilience';
import type { BlueprintState } from '../store';

export interface ResilienceState {
  isResilienceMode: boolean;
  resilienceFaultType: FaultType;
  resilienceSeverity: number;
  resilienceSafeguards: Partial<Record<EntityRef, NodeSafeguards>>;
  resilienceSimulationResult: SimulationResult | null;
  setResilienceMode: (enabled: boolean) => void;
  toggleResilienceMode: () => void;
  setResilienceFaultType: (faultType: FaultType) => void;
  setResilienceSeverity: (severity: number) => void;
  setResilienceSafeguard: (nodeId: EntityRef, key: keyof NodeSafeguards, enabled: boolean) => void;
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
  resilienceFaultType: 'region-outage',
  resilienceSeverity: 1,
  resilienceSafeguards: {},
  resilienceSimulationResult: null,
  setResilienceMode: enabled =>
    set({
      isResilienceMode: enabled,
      ...(enabled ? { rightCollapsed: false } : {}),
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
        ...(enabled ? { rightCollapsed: false } : {}),
        ...(!enabled
          ? {
              resilienceSimulationResult: null,
              resilienceSafeguards: {},
            }
          : {}),
      };
    }),
  setResilienceFaultType: faultType => set({ resilienceFaultType: faultType }),
  setResilienceSeverity: severity =>
    set({ resilienceSeverity: Math.min(1, Math.max(0, severity)) }),
  setResilienceSafeguard: (nodeId, key, enabled) =>
    set(state => ({
      resilienceSafeguards: {
        ...state.resilienceSafeguards,
        [nodeId]: { ...state.resilienceSafeguards[nodeId], [key]: enabled },
      },
    })),
  runResilienceSimulation: () => {
    const {
      schema,
      selectedNodeId,
      resilienceFaultType,
      resilienceSeverity,
      resilienceSafeguards,
    } = get();
    if (!selectedNodeId) return;
    const result = simulate(schema, {
      faults: [
        {
          nodeId: selectedNodeId,
          faultType: resilienceFaultType,
          severity: resilienceSeverity,
        },
      ],
      safeguards: resilienceSafeguards,
    });
    set({ resilienceSimulationResult: result, rightCollapsed: false });
  },
  clearResilienceSimulation: () => set({ resilienceSimulationResult: null }),
});
