import { getSchemaEntityRef } from '@archlens/core';
import {
  defaultFaultSeverity,
  parseChaosSpecFromYaml,
  validateChaosSpecForDiagram,
  type NodeFaultConfig,
} from '@archlens/core/resilience';
import { isResilienceSimulationDiagramLevel } from '@archlens/core/recommendations';
import { syncResilienceExternalsToCanvas } from '../../../resilience/syncResilienceExternals';
import { DEFAULT_RESILIENCE_MONTE_CARLO, type ResilienceGet, type ResilienceSet } from './types';
import { resilienceModePanelPatch } from './helpers';

export function createUrlParseApplyActions(set: ResilienceSet, get: ResilienceGet) {
  return {
    applyResilienceUrlState: (faults: NodeFaultConfig[]) => {
      if (!isResilienceSimulationDiagramLevel(get().schema.level)) {
        return;
      }
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
    openChaosSpecDialog: (mode: 'import' | 'export') =>
      set({ chaosSpecDialogMode: mode, isChaosSpecPickerOpen: false }),
    closeChaosSpecDialog: () => set({ chaosSpecDialogMode: null }),
    openChaosSpecPicker: () => set({ isChaosSpecPickerOpen: true, chaosSpecDialogMode: null }),
    closeChaosSpecPicker: () => set({ isChaosSpecPickerOpen: false }),
    applyChaosSpecYaml: (yaml: string): string | null => {
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
  };
}
