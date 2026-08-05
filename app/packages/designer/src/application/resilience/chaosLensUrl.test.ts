import { describe, it, expect } from 'vitest';
import {
  buildChaosLensUrl,
  isChaosLensUrl,
  parseChaosLensUrl,
  redirectLegacyResilienceUrl,
} from './chaosLensUrl';

describe('chaosLensUrl', () => {
  it('builds workspace chaos lens URLs', () => {
    expect(buildChaosLensUrl()).toBe('/workspace?lens=chaoslens');
    expect(buildChaosLensUrl(null)).toBe('/workspace?lens=chaoslens');
    expect(buildChaosLensUrl('shop/api')).toBe('/workspace/shop/api?lens=chaoslens');
    expect(
      buildChaosLensUrl('shop', {
        faults: [{ nodeId: 'shop/api', faultType: 'region-outage', severity: 1 }],
      })
    ).toBe('/workspace/shop?lens=chaoslens&fault=shop%2Fapi&type=region-outage');
    expect(
      buildChaosLensUrl('shop', {
        faults: [{ nodeId: 'shop/api', faultType: 'latency', severity: 0.4 }],
      })
    ).toBe('/workspace/shop?lens=chaoslens&fault=shop%2Fapi&type=latency');
    expect(
      buildChaosLensUrl('shop', {
        faults: [{ nodeId: 'shop/api', faultType: 'latency', severity: 0.55 }],
      })
    ).toBe('/workspace/shop?lens=chaoslens&fault=shop%2Fapi&type=latency&severity=0.55');
    expect(
      buildChaosLensUrl('shop', {
        faults: [
          { nodeId: 'shop/api', faultType: 'region-outage', severity: 1 },
          { nodeId: 'shop/web', faultType: 'latency', severity: 0.4 },
        ],
      })
    ).toBe(
      '/workspace/shop?lens=chaoslens&faults=shop%2Fapi%7Eregion-outage%7Cshop%2Fweb%7Elatency'
    );
    expect(buildChaosLensUrl('samples', { browseChaosSpecs: true })).toBe(
      '/workspace/samples?lens=chaoslens&browse=chaosspecs'
    );
  });

  it('parses workspace chaos lens URLs', () => {
    expect(parseChaosLensUrl('/workspace', 'lens=chaoslens')).toEqual({
      entityRef: undefined,
      faults: [],
      browseChaosSpecs: false,
    });
    expect(
      parseChaosLensUrl('/workspace/shop', 'lens=chaoslens&fault=shop/api&type=latency')
    ).toEqual({
      entityRef: 'shop',
      faults: [{ nodeId: 'shop/api', faultType: 'latency', severity: 0.4 }],
      browseChaosSpecs: false,
    });
    expect(
      parseChaosLensUrl(
        '/workspace/shop',
        'lens=chaoslens&fault=shop/api&type=region-outage&severity=1'
      )
    ).toEqual({
      entityRef: 'shop',
      faults: [{ nodeId: 'shop/api', faultType: 'region-outage', severity: 1 }],
      browseChaosSpecs: false,
    });
    expect(
      parseChaosLensUrl(
        '/workspace/shop',
        'lens=chaoslens&faults=shop/api~region-outage|shop/web~latency~0.55'
      )
    ).toEqual({
      entityRef: 'shop',
      faults: [
        { nodeId: 'shop/api', faultType: 'region-outage', severity: 1 },
        { nodeId: 'shop/web', faultType: 'latency', severity: 0.55 },
      ],
      browseChaosSpecs: false,
    });
    expect(parseChaosLensUrl('/workspace/samples', 'lens=chaoslens&browse=chaosspecs')).toEqual({
      entityRef: 'samples',
      faults: [],
      browseChaosSpecs: true,
    });
  });

  it('treats legacy resilience=1 as chaos lens and redirects to sticky lens', () => {
    expect(isChaosLensUrl('/workspace/application', 'resilience=1')).toBe(true);
    expect(redirectLegacyResilienceUrl('/workspace/application', 'resilience=1')).toBe(
      '/workspace/application?lens=chaoslens'
    );
    expect(redirectLegacyResilienceUrl('/workspace/shop', 'resilience=1&foo=bar')).toBe(
      '/workspace/shop?lens=chaoslens&foo=bar'
    );
  });

  it('detects chaos lens routes', () => {
    expect(isChaosLensUrl('/workspace', 'lens=chaoslens')).toBe(true);
    expect(isChaosLensUrl('/workspace/shop', 'lens=chaoslens&fault=shop/api')).toBe(true);
    expect(isChaosLensUrl('/workspace/shop', 'lens=tracelens')).toBe(false);
    expect(isChaosLensUrl('/workspace/shop', '')).toBe(false);
    expect(isChaosLensUrl('/guide', 'lens=chaoslens')).toBe(false);
  });
});
