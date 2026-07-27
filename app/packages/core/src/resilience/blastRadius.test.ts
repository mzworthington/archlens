import { describe, expect, it } from 'vitest';
import type { SystemSchema } from '../models/schema';
import { computeBlastRadius } from './blastRadius';

const ecommerceSchema: SystemSchema = {
  name: 'E-Commerce',
  version: '1.0.0',
  level: 'container',
  nodes: [
    { entityRef: 'shop/web', name: 'Web App', type: 'web-app' },
    { entityRef: 'shop/api', name: 'API', type: 'microservice' },
    { entityRef: 'shop/payment', name: 'Payment', type: 'microservice' },
    { entityRef: 'shop/db', name: 'Database', type: 'database' },
  ],
  dependencies: [
    { from: 'shop/web', to: 'shop/api', type: 'direct-call' },
    { from: 'shop/api', to: 'shop/payment', type: 'direct-call' },
    { from: 'shop/api', to: 'shop/db', type: 'read-write' },
  ],
};

describe('computeBlastRadius', () => {
  it('marks the faulted node at full severity and propagates upstream to callers', () => {
    const result = computeBlastRadius(ecommerceSchema, {
      nodeId: 'shop/payment',
      faultType: 'region-outage',
    });

    expect(result.heat.get('shop/payment')).toBe(1);
    expect(result.heatHops.get('shop/payment')).toBe(0);
    expect(result.heat.get('shop/api')).toBeGreaterThan(0);
    expect(result.heatHops.get('shop/api')).toBe(1);
    expect(result.heat.get('shop/web')).toBeGreaterThan(0);
    expect(result.heatHops.get('shop/web')).toBe(2);
    expect(result.heat.get('shop/db')).toBeUndefined();
    expect(result.impactedNodes).toContain('shop/payment');
    expect(result.impactedNodes).toContain('shop/web');
  });

  it('decays heat with distance from the fault origin', () => {
    const result = computeBlastRadius(ecommerceSchema, {
      nodeId: 'shop/payment',
      faultType: 'region-outage',
    });

    const payment = result.heat.get('shop/payment')!;
    const api = result.heat.get('shop/api')!;
    const web = result.heat.get('shop/web')!;

    expect(payment).toBeGreaterThan(api);
    expect(api).toBeGreaterThan(web);
  });

  it('stops upstream propagation when a circuit breaker is enabled on an intermediate node', () => {
    const result = computeBlastRadius(
      ecommerceSchema,
      { nodeId: 'shop/payment', faultType: 'region-outage' },
      { safeguards: { 'shop/api': { circuitBreaker: true } } }
    );

    expect(result.heat.get('shop/api')).toBeGreaterThan(0);
    expect(result.heat.get('shop/web')).toBeUndefined();
    expect(result.propagationStoppedAt).toContain('shop/api');
  });

  it('reduces propagated severity when local cache is enabled on a caller', () => {
    const fault = { nodeId: 'shop/db', faultType: 'error-rate' as const, severity: 0.8 };
    const withoutCache = computeBlastRadius(ecommerceSchema, fault);
    const withCache = computeBlastRadius(ecommerceSchema, fault, {
      safeguards: { 'shop/api': { localCache: true } },
    });

    const apiWithout = withoutCache.heat.get('shop/api') ?? 0;
    const apiWith = withCache.heat.get('shop/api') ?? 0;
    expect(apiWith).toBeLessThan(apiWithout);
  });

  it('returns empty impact when the faulted node is unknown', () => {
    const result = computeBlastRadius(ecommerceSchema, {
      nodeId: 'shop/missing',
      faultType: 'latency',
    });

    expect(result.impactedNodes).toHaveLength(0);
    expect(result.heat.size).toBe(0);
    expect(result.heatHops.size).toBe(0);
  });
});
