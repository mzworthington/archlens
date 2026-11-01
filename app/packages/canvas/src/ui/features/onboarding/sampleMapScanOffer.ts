import { GOLDEN_JOURNEY_ENTITY_REF } from '../../../application/store/samplesWorkspace';

export type SampleMapScanOfferInput = {
  isSampleWorkspace: boolean;
  activeEntityRef: string | undefined;
  isResilienceMode: boolean;
};

/** Visible scan affordance on the golden-journey map, before Chaos or Advice. */
export function shouldOfferSampleMapScan(input: SampleMapScanOfferInput): boolean {
  if (!input.isSampleWorkspace || input.isResilienceMode) return false;
  const ref = input.activeEntityRef;
  if (!ref) return false;
  return ref === GOLDEN_JOURNEY_ENTITY_REF || ref.startsWith(`${GOLDEN_JOURNEY_ENTITY_REF}/`);
}
