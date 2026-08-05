import { isResilienceSimulationDiagramLevel } from '@archlens/core/recommendations';
import type { TelemetryViewMode } from '@archlens/core/resilience';
import { syncResilienceExternalsToCanvas } from '../../resilience/syncResilienceExternals';
import { createFaultSafeguardToggleActions } from './resilienceState/faultSafeguardToggles';
import { resilienceModePanelPatch } from './resilienceState/helpers';
import { createSimulationActions } from './resilienceState/simulationActions';
import {
  DEFAULT_RESILIENCE_MONTE_CARLO,
  type ResilienceGet,
  type ResiliencePanelTab,
  type ResilienceSet,
  type ResilienceState,
} from './resilienceState/types';
import { createUrlParseApplyActions } from './resilienceState/urlParseApply';

export {
  DEFAULT_RESILIENCE_MONTE_CARLO,
  type ResiliencePanelTab,
  type ResilienceState,
} from './resilienceState/types';

export const createResilienceState = (set: ResilienceSet, get: ResilienceGet): ResilienceState => ({
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
  isChaosSpecPickerOpen: false,
  setResilienceMode: enabled => {
    if (enabled && !isResilienceSimulationDiagramLevel(get().schema.level)) {
      return;
    }
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
  setResilienceTelemetryView: (view: TelemetryViewMode) => set({ resilienceTelemetryView: view }),
  setResiliencePanelTab: (tab: ResiliencePanelTab) => set({ resiliencePanelTab: tab }),
  ...createUrlParseApplyActions(set, get),
  ...createFaultSafeguardToggleActions(set, get),
  ...createSimulationActions(set, get),
});
