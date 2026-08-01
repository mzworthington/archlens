import { buildChaosLensUrl } from '../resilience/chaosLensUrl';
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
  actions.setLocation(
    buildChaosLensUrl(offender.diagramEntityRef, {
      faults: [{ nodeId: offender.entityRef, faultType: 'region-outage', severity: 1 }],
    })
  );
  await actions.selectSystem(offender.schemaPath);
  actions.simulateResilienceFaultAtNode(offender.entityRef);
}
