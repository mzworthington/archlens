import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { buildRecommendations } from '../recommendations/buildRecommendations';
import { runEstateResilience } from '../recommendations/runEstateResilience';
import { runResilienceSimulation } from '../resilience/simulation';
import { parseSchemaFromYaml } from '../rules/graph';

const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../../../..');
const FIXTURE_DIR = path.join(REPO_ROOT, 'blueprints/golden-journey');
const CHECKOUT_API = 'golden-paths/golden-journey/checkout-platform/checkout-api';
const PAYMENT_GATEWAY = 'golden-paths/golden-journey/payment-gateway';

function loadFixture(relativePath: string) {
  return parseSchemaFromYaml(fs.readFileSync(path.join(FIXTURE_DIR, relativePath), 'utf8'));
}

describe('golden-journey estate fixture', () => {
  it('loads estate, platform, and component YAML', () => {
    expect(() => loadFixture('containers.yaml')).not.toThrow();
    expect(() => loadFixture('web-components.yaml')).not.toThrow();
    expect(() => loadFixture('mobile-components.yaml')).not.toThrow();
    expect(() => loadFixture('catalog-platform/containers.yaml')).not.toThrow();
    expect(() => loadFixture('catalog-platform/catalog-api-components.yaml')).not.toThrow();
    expect(() => loadFixture('identity-platform/containers.yaml')).not.toThrow();
    expect(() => loadFixture('identity-platform/sso-api-components.yaml')).not.toThrow();
    expect(() => loadFixture('checkout-platform/containers.yaml')).not.toThrow();
    expect(() => loadFixture('checkout-platform/checkout-api-components.yaml')).not.toThrow();
    expect(() => loadFixture('checkout-platform/order-events-components.yaml')).not.toThrow();
    expect(() => loadFixture('billing-platform/containers.yaml')).not.toThrow();
    expect(() => loadFixture('billing-platform/billing-worker-components.yaml')).not.toThrow();
  });

  it('component diagrams expose richer internal graphs', () => {
    const checkout = loadFixture('checkout-platform/checkout-api-components.yaml');
    expect(checkout.nodes.length).toBeGreaterThanOrEqual(6);
    expect(checkout.dependencies.length).toBeGreaterThanOrEqual(8);

    const web = loadFixture('web-components.yaml');
    expect(web.nodes.length).toBeGreaterThanOrEqual(5);

    const orderEvents = loadFixture('checkout-platform/order-events-components.yaml');
    expect(orderEvents.dependencies.some(d => d.type === 'publish-subscribe')).toBe(true);
  });

  it('models temporal coupling on Payment Client for Coupling lens demos', () => {
    const checkout = loadFixture('checkout-platform/checkout-api-components.yaml');
    const paymentClient = checkout.nodes.find(
      node => node.entityRef === `${CHECKOUT_API}/payment-client`
    );
    expect(paymentClient?.forensics?.coupledFiles?.length).toBeGreaterThanOrEqual(2);

    const coupledPaths = paymentClient?.forensics?.coupledFiles?.map(c => c.path) ?? [];
    expect(coupledPaths).toContain('src/Checkout.Api/Controllers/OrderController.cs');
    expect(coupledPaths).toContain('src/Billing.Worker/Clients/PaymentRetryClient.cs');

    const billing = loadFixture('billing-platform/billing-worker-components.yaml');
    const paymentRetry = billing.nodes.find(node =>
      node.entityRef?.endsWith('/payment-retry-client')
    );
    expect(
      paymentRetry?.forensics?.coupledFiles?.some(
        c => c.path === 'src/Checkout.Api/Clients/PaymentGatewayClient.cs'
      )
    ).toBe(true);
  });

  it('models product personas linked to each platform on the estate', () => {
    const schema = loadFixture('containers.yaml');
    const personas = schema.nodes.filter(node => node.type === 'person');
    expect(personas.map(p => p.name)).toEqual(
      expect.arrayContaining(['Shopper', 'Member', 'Buyer', 'Subscriber'])
    );
    expect(
      schema.dependencies.some(
        d =>
          d.from === 'golden-paths/golden-journey/shopper' &&
          d.to === 'golden-paths/golden-journey/catalog-platform'
      )
    ).toBe(true);
    expect(
      schema.dependencies.some(
        d =>
          d.from === 'golden-paths/golden-journey/member' &&
          d.to === 'golden-paths/golden-journey/identity-platform'
      )
    ).toBe(true);
    expect(
      schema.dependencies.some(
        d =>
          d.from === 'golden-paths/golden-journey/buyer' &&
          d.to === 'golden-paths/golden-journey/checkout-platform'
      )
    ).toBe(true);
    expect(
      schema.dependencies.some(
        d =>
          d.from === 'golden-paths/golden-journey/subscriber' &&
          d.to === 'golden-paths/golden-journey/billing-platform'
      )
    ).toBe(true);
  });

  it('links product personas to the estate in context diagram', () => {
    const schema = loadFixture('context.yaml');
    const personas = schema.nodes.filter(node => node.type === 'person');
    expect(personas.map(p => p.name)).toEqual(
      expect.arrayContaining(['Shopper', 'Member', 'Buyer', 'Subscriber'])
    );
    const personaDeps = schema.dependencies.filter(d => d.from.includes('/golden-journey/'));
    expect(personaDeps.every(d => d.to === 'golden-paths/golden-journey')).toBe(true);
    expect(
      schema.nodes.some(
        node => node.entityRef === PAYMENT_GATEWAY && node.external && node.type === 'gateway-api'
      )
    ).toBe(true);
    expect(
      schema.dependencies.some(
        d => d.from === 'golden-paths/golden-journey' && d.to === PAYMENT_GATEWAY
      )
    ).toBe(true);
  });

  it('models related product groups in one estate diagram', () => {
    const schema = loadFixture('containers.yaml');
    const groups = schema.nodes.filter(node => node.type === 'group');
    expect(groups.map(g => g.name)).toEqual(
      expect.arrayContaining([
        'Catalog Platform',
        'Identity Platform',
        'Checkout Platform',
        'Billing Platform',
      ])
    );
    expect(
      schema.nodes.some(
        node =>
          node.parentEntityRef === 'golden-paths/golden-journey/checkout-platform' &&
          node.entityRef === CHECKOUT_API
      )
    ).toBe(true);
  });

  it('ranks add-circuit-breaker on Checkout API after Payment Gateway outage', () => {
    const schema = loadFixture('containers.yaml');
    const simulation = runResilienceSimulation(schema, {
      faults: [{ nodeId: PAYMENT_GATEWAY, faultType: 'region-outage' }],
      entryPoints: ['golden-paths/golden-journey/web', 'golden-paths/golden-journey/mobile'],
    });

    const recommendations = buildRecommendations({ schema, simulation });
    const checkoutBreaker = recommendations.find(
      r => r.kind === 'add-circuit-breaker' && r.targetEntityRef === CHECKOUT_API
    );

    expect(checkoutBreaker).toBeDefined();
    expect(checkoutBreaker?.targetName).toBe('Checkout API');
    expect(checkoutBreaker?.evidence.simulation?.dependencyEntityRef).toBe(PAYMENT_GATEWAY);
    expect(checkoutBreaker?.evidence.simulation?.dependencyOwnership).toBe('third-party');
    expect(checkoutBreaker?.detail).toMatch(/third-party/i);
    expect(recommendations[0]?.kind).toBe('add-circuit-breaker');
  });

  it('does not target personas with circuit-breaker advice on the context diagram', () => {
    const schema = loadFixture('context.yaml');
    const simulation = runResilienceSimulation(schema, {
      faults: [{ nodeId: 'golden-paths/golden-journey', faultType: 'region-outage' }],
    });
    const recommendations = buildRecommendations({ schema, simulation });
    const personaRefs = [
      'golden-paths/golden-journey/shopper',
      'golden-paths/golden-journey/member',
      'golden-paths/golden-journey/buyer',
      'golden-paths/golden-journey/subscriber',
    ];

    expect(recommendations.some(r => r.kind === 'add-circuit-breaker')).toBe(false);
    for (const ref of personaRefs) {
      expect(recommendations.some(r => r.targetEntityRef === ref)).toBe(false);
    }
  });

  it('propagates blast through checkout group boundary to entry points', () => {
    const schema = loadFixture('containers.yaml');
    const simulation = runResilienceSimulation(schema, {
      faults: [{ nodeId: PAYMENT_GATEWAY, faultType: 'region-outage' }],
      entryPoints: ['golden-paths/golden-journey/web', 'golden-paths/golden-journey/mobile'],
    });

    expect(simulation.heat.get('golden-paths/golden-journey/web')).toBeGreaterThan(0);
    expect(simulation.heat.get('golden-paths/golden-journey/mobile')).toBeGreaterThan(0);
    expect(simulation.heat.get(CHECKOUT_API)).toBeGreaterThan(0);
  });

  it('estate resilience sweep includes the golden journey estate', () => {
    const schema = loadFixture('containers.yaml');
    const report = runEstateResilience([
      {
        path: 'golden-journey/containers.yaml',
        relativePath: 'golden-journey/containers.yaml',
        schema,
      },
    ]);

    expect(report.recommendations.some(r => r.kind === 'add-circuit-breaker')).toBe(true);
    expect(report.recommendations.some(r => r.targetEntityRef === CHECKOUT_API)).toBe(true);
  });
});
