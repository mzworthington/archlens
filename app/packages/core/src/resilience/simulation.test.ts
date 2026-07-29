import { describe, expect, it } from 'vitest';
import type { SystemSchema } from '../models/schema';
import { detectSpofs } from './simulation';
import { runResilienceSimulation } from './simulation';

const ecommerceSchema: SystemSchema = {
  name: 'E-Commerce',
  version: '1.0.0',
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
    expect(result.heatHops.get('shop/payment')).toBe(0);
    expect(result.heatHops.get('shop/web')).toBeGreaterThan(0);
    expect(result.impactedDomains).toContain('shop');
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

  it('keeps entry-point SLA healthy when a publisher faults but marks integrity on async peers', () => {
    const schema: SystemSchema = {
      name: 'Pub-Sub',
      version: '1.0.0',
      level: 'container',
      nodes: [
        { entityRef: 'shop/web', name: 'Web', type: 'web-app' },
        { entityRef: 'shop/orders', name: 'Orders', type: 'microservice' },
        { entityRef: 'shop/events', name: 'Events', type: 'event-broker' },
        { entityRef: 'shop/worker', name: 'Worker', type: 'background-worker' },
      ],
      dependencies: [
        { from: 'shop/orders', to: 'shop/events', type: 'publish-subscribe' },
        { from: 'shop/worker', to: 'shop/events', type: 'publish-subscribe' },
      ],
    };

    const result = runResilienceSimulation(schema, {
      faults: [{ nodeId: 'shop/orders', faultType: 'region-outage' }],
      entryPoints: ['shop/web'],
    });

    expect(result.entryPointSlas['shop/web']).toBe(100);
    expect(result.overallSla).toBe(100);
    expect(result.integrityHeat.get('shop/worker')).toBeGreaterThan(0);
    expect(result.overallIntegrity).toBeLessThan(100);
    expect(result.advice.some(line => /miss new events/i.test(line))).toBe(true);
  });

  it('groups workspace-qualified refs by parent diagram, not workspace root', () => {
    const schema: SystemSchema = {
      name: 'Large Graph',
      version: '1.0.0',
      level: 'container',
      entityRef: 'blueprint/chaoslens-stress/large-graph',
      nodes: [
        {
          entityRef: 'blueprint/chaoslens-stress/large-graph/edge-mobile-01',
          name: 'Edge',
          type: 'web-app',
        },
        {
          entityRef: 'blueprint/chaoslens-stress/large-graph/bff-retail',
          name: 'BFF',
          type: 'rest-api',
        },
        {
          entityRef: 'blueprint/chaoslens-stress/large-graph/domain-orders',
          name: 'Orders',
          type: 'microservice',
        },
      ],
      dependencies: [
        {
          from: 'blueprint/chaoslens-stress/large-graph/edge-mobile-01',
          to: 'blueprint/chaoslens-stress/large-graph/bff-retail',
          type: 'direct-call',
        },
        {
          from: 'blueprint/chaoslens-stress/large-graph/bff-retail',
          to: 'blueprint/chaoslens-stress/large-graph/domain-orders',
          type: 'direct-call',
        },
      ],
    };

    const result = runResilienceSimulation(schema, {
      faults: [
        {
          nodeId: 'blueprint/chaoslens-stress/large-graph/domain-orders',
          faultType: 'region-outage',
        },
      ],
      entryPoints: ['blueprint/chaoslens-stress/large-graph/edge-mobile-01'],
    });

    expect(result.impactedDomains).toEqual(['large-graph']);
    expect(result.impactedDomains).not.toContain('blueprint');
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
              resilience: { circuitBreaker: true },
            }
          : n
      ),
    };

    expect(detectSpofs(schema)).not.toContain('shop/api');
  });
});
