import { describe, expect, it } from 'vitest';
import { GOLDEN_JOURNEY_ENTITY_REF } from '../../../application/store/samplesWorkspace';
import { shouldOfferSampleMapScan } from './sampleMapScanOffer';

describe('shouldOfferSampleMapScan', () => {
  it('offers a scan on the golden-journey map before Chaos', () => {
    expect(
      shouldOfferSampleMapScan({
        isSampleWorkspace: true,
        activeEntityRef: GOLDEN_JOURNEY_ENTITY_REF,
        isResilienceMode: false,
      })
    ).toBe(true);
  });

  it('keeps the offer on a diagram inside the golden-journey estate', () => {
    expect(
      shouldOfferSampleMapScan({
        isSampleWorkspace: true,
        activeEntityRef: 'samples/golden-journey/checkout-platform/checkout-api',
        isResilienceMode: false,
      })
    ).toBe(true);
  });

  it('stays off other samples, a real workspace, and the Chaos lens', () => {
    expect(
      shouldOfferSampleMapScan({
        isSampleWorkspace: true,
        activeEntityRef: 'samples',
        isResilienceMode: false,
      })
    ).toBe(false);
    expect(
      shouldOfferSampleMapScan({
        isSampleWorkspace: false,
        activeEntityRef: GOLDEN_JOURNEY_ENTITY_REF,
        isResilienceMode: false,
      })
    ).toBe(false);
    expect(
      shouldOfferSampleMapScan({
        isSampleWorkspace: true,
        activeEntityRef: GOLDEN_JOURNEY_ENTITY_REF,
        isResilienceMode: true,
      })
    ).toBe(false);
  });
});
