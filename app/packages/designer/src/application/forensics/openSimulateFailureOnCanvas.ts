import type { RankedOffender } from './rankOffenders';

export type OpenSimulateFailureActions = {
  selectSystem: (path: string) => Promise<void>;
  setLocation: (path: string) => void;
  simulateResilienceFaultAtNode: (entityRef: string) => void;
};

/**
 * Open the offender on Canvas in ChaosLens mode and run a region-outage simulation.
 */
export async function openSimulateFailureOnCanvas(
  offender: RankedOffender,
  actions: OpenSimulateFailureActions
): Promise<void> {
  actions.setLocation(`/workspace/${offender.diagramEntityRef}`);
  await actions.selectSystem(offender.schemaPath);
  actions.simulateResilienceFaultAtNode(offender.entityRef);
}
