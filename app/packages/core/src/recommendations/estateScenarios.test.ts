import { describe, expect, it } from 'vitest';
import type { SystemSchema } from '../models/schema';
import { buildDefaultEstateScenarios } from './estateScenarios';

const ecommerceSchema: SystemSchema = {
  entityRef: 'chaoslens-stress/ecommerce',
  name: 'E-Commerce',
  version: '1.0.0',
  level: 'container',
  nodes: [
    { entityRef: 'chaoslens-stress/ecommerce/web', name: 'Web', type: 'web-app' },
    {
      entityRef: 'chaoslens-stress/ecommerce/mobile',
      name: 'Mobile',
      type: 'mobile-app',
    },
    { entityRef: 'chaoslens-stress/ecommerce/api', name: 'API', type: 'rest-api' },
    {
      entityRef: 'chaoslens-stress/ecommerce/payment',
      name: 'Payment',
      type: 'microservice',
    },
    { entityRef: 'chaoslens-stress/ecommerce/db', name: 'Database', type: 'database' },
  ],
  dependencies: [
    {
      from: 'chaoslens-stress/ecommerce/web',
      to: 'chaoslens-stress/ecommerce/api',
      type: 'direct-call',
    },
    {
      from: 'chaoslens-stress/ecommerce/mobile',
      to: 'chaoslens-stress/ecommerce/api',
      type: 'direct-call',
    },
    {
      from: 'chaoslens-stress/ecommerce/api',
      to: 'chaoslens-stress/ecommerce/payment',
      type: 'direct-call',
    },
    {
      from: 'chaoslens-stress/ecommerce/api',
      to: 'chaoslens-stress/ecommerce/db',
      type: 'read-write',
    },
  ],
};

describe('buildDefaultEstateScenarios', () => {
  it('includes region-outage scenarios for each service node', () => {
    const scenarios = buildDefaultEstateScenarios(ecommerceSchema);
    const regionOutages = scenarios.filter(scenario => scenario.kind === 'region-outage');
    expect(regionOutages.length).toBe(5);
  });

  it('includes a fan-in latency probe for the shared API dependency', () => {
    const scenarios = buildDefaultEstateScenarios(ecommerceSchema);
    expect(
      scenarios.some(
        scenario =>
          scenario.kind === 'high-fan-in-probe' &&
          scenario.spec.faults[0]?.nodeId === 'chaoslens-stress/ecommerce/api'
      )
    ).toBe(true);
  });

  it('includes publisher outage scenarios for pub-sub publishers', () => {
    const pubSubSchema: SystemSchema = {
      ...ecommerceSchema,
      nodes: [
        { entityRef: 'shop/orders', name: 'Orders', type: 'microservice' },
        { entityRef: 'shop/events', name: 'Events', type: 'event-broker' },
        { entityRef: 'shop/worker', name: 'Worker', type: 'background-worker' },
      ],
      dependencies: [
        { from: 'shop/orders', to: 'shop/events', type: 'publish-subscribe' },
        { from: 'shop/worker', to: 'shop/events', type: 'publish-subscribe' },
      ],
    };

    const scenarios = buildDefaultEstateScenarios(pubSubSchema);
    expect(scenarios.some(scenario => scenario.kind === 'publisher-outage')).toBe(true);
  });
});
