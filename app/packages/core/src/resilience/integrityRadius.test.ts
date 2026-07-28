import { describe, expect, it } from 'vitest';
import type { SystemSchema } from '../models/schema';
import { INTEGRITY_PEER_FACTOR, computeIntegrityRadius } from './integrityRadius';

const pubSubSchema: SystemSchema = {
  name: 'Pub-Sub Integrity',
  version: '1.0.0',
  level: 'container',
  nodes: [
    { entityRef: 'shop/web', name: 'Web App', type: 'web-app' },
    { entityRef: 'shop/orders', name: 'Orders', type: 'microservice' },
    { entityRef: 'shop/events', name: 'Event Bus', type: 'event-broker' },
    { entityRef: 'shop/fulfillment', name: 'Fulfillment Worker', type: 'background-worker' },
    { entityRef: 'shop/billing', name: 'Billing Worker', type: 'background-worker' },
  ],
  dependencies: [
    { from: 'shop/web', to: 'shop/orders', type: 'direct-call' },
    { from: 'shop/orders', to: 'shop/events', type: 'publish-subscribe' },
    { from: 'shop/fulfillment', to: 'shop/events', type: 'publish-subscribe' },
    { from: 'shop/billing', to: 'shop/events', type: 'publish-subscribe' },
    { from: 'shop/billing', to: 'shop/orders', type: 'direct-call' },
  ],
};

describe('computeIntegrityRadius', () => {
  it('marks broker and peer subscribers when a publisher faults', () => {
    const result = computeIntegrityRadius(pubSubSchema, {
      nodeId: 'shop/orders',
      faultType: 'region-outage',
    });

    expect(result.integrityHeat.get('shop/orders')).toBe(1);
    expect(result.integrityHeat.get('shop/events')).toBe(1);
    expect(result.integrityHeat.get('shop/fulfillment')).toBe(INTEGRITY_PEER_FACTOR);
    expect(result.integrityHeat.get('shop/billing')).toBe(INTEGRITY_PEER_FACTOR);
    expect(result.integrityHeat.get('shop/web')).toBeUndefined();
  });

  it('marks all pub-sub clients when the broker faults', () => {
    const result = computeIntegrityRadius(pubSubSchema, {
      nodeId: 'shop/events',
      faultType: 'error-rate',
      severity: 0.8,
    });

    expect(result.integrityHeat.get('shop/events')).toBe(0.8);
    expect(result.integrityHeat.get('shop/orders')).toBe(0.8);
    expect(result.integrityHeat.get('shop/fulfillment')).toBe(0.8);
    expect(result.integrityHeat.get('shop/billing')).toBe(0.8);
  });

  it('returns empty impact when the faulted node is unknown', () => {
    const result = computeIntegrityRadius(pubSubSchema, {
      nodeId: 'shop/missing',
      faultType: 'latency',
    });

    expect(result.integrityImpactedNodes).toHaveLength(0);
    expect(result.integrityHeat.size).toBe(0);
  });
});
