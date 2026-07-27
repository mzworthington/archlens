import { describe, expect, it } from 'vitest';
import type { SystemSchema } from '../models/schema';
import { detectSpofs } from './simulation';
import { runResilienceSimulation } from './simulation';

const ecommerceSchema: SystemSchema = {
  name: 'E-Commerce',
  apiVersion: 'blueprint.dev/v4', kind: 'Diagram',
  level: 'container',
  nodes: [
    { entityRef: 'shop/web', name: 'Web App', type: 'web-app' },
    { entityRef: 'shop/mobile', name: 'Mobile App', type: 'mobile-app' },
    { entityRef: 'shop/api', name: 'API', type: 'microservice' },
    { entityRef: 'shop/payment', name: 'Payment', type: 'microservice' },
    { entityRef: 'shop/db', name: 'Database', type: 'database' },
  ],
  dependencies: [
    { from: 'shop/web', to: 'shop/api', type: 'direct-call' },
    { from: 'shop/mobile', to: 'shop/api', type: 'direct-call' },
    { from: 'shop/api', to: 'shop/payment', type: 'direct-call' },
    { from: 'shop/api', to: 'shop/db', type: 'read-write' },
  ],
};

describe('runResilienceSimulation', () => {
  it('computes degraded SLA for entry points affected by blast radius', () => {
    const result = runResilienceSimulation(ecommerceSchema, {
      faults: [{ nodeId: 'shop/payment', faultType: 'region-outage' }],
      entryPoints: ['shop/web'],
    });

    expect(result.overallSla).toBeLessThan(100);
    expect(result.entryPointSlas['shop/web']).toBeLessThan(100);
    expect(result.impactedDomains.length).toBeGreaterThan(0);
    expect(result.advice.length).toBeGreaterThan(0);
  });

  it('reports full SLA when no faults are configured', () => {
    const result = runResilienceSimulation(ecommerceSchema, {
      faults: [],
      entryPoints: ['shop/web'],
    });

    expect(result.overallSla).toBe(100);
    expect(result.entryPointSlas['shop/web']).toBe(100);
  });

  it('merges blast radius across multiple simultaneous faults', () => {
    const single = runResilienceSimulation(ecommerceSchema, {
      faults: [{ nodeId: 'shop/payment', faultType: 'latency', severity: 0.5 }],
      entryPoints: ['shop/web'],
    });
    const dual = runResilienceSimulation(ecommerceSchema, {
      faults: [
        { nodeId: 'shop/payment', faultType: 'latency', severity: 0.5 },
        { nodeId: 'shop/db', faultType: 'error-rate', severity: 0.5 },
      ],
      entryPoints: ['shop/web'],
    });

    expect(dual.overallSla).toBeLessThanOrEqual(single.overallSla);
  });
});

describe('detectSpofs', () => {
  it('flags shared dependencies with multiple callers and no circuit breaker', () => {
    const spofs = detectSpofs(ecommerceSchema);
    expect(spofs).toContain('shop/api');
    expect(spofs).not.toContain('shop/web');
  });

  it('excludes nodes that already have a circuit breaker safeguard configured', () => {
    const schema: SystemSchema = {
      ...ecommerceSchema,
      nodes: ecommerceSchema.nodes.map(n =>
        n.entityRef === 'shop/api'
          ? {
              ...n,
              properties: {
                resilience: JSON.stringify({ safeguards: { circuitBreaker: true } }),
              },
            }
          : n
      ),
    };

    expect(detectSpofs(schema)).not.toContain('shop/api');
  });
});
