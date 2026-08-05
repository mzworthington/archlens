import { describe, expect, it } from 'vitest';
import type { SystemNode, SystemSchema } from '../models/schema';
import { systemSchemaPublicUrl } from '../models/schemaVersion';
import {
  CONTEXT_ACTOR_ROLE,
  CONTEXT_OWNERSHIP_AUTHOR,
  CONTEXT_OWNERSHIP_PROPERTY,
  CONTEXT_OWNERSHIP_SCAN,
  CONTEXT_PERSON_LEAF,
  PERSON_EDGE_DESCRIPTION,
  hydrateContextSchema,
  isAuthorOwnedContextNode,
  isScanOwnedContextNode,
} from './contextHydration';

const VERSION = systemSchemaPublicUrl();

function baseContext(
  nodes: SystemNode[],
  dependencies: SystemSchema['dependencies'] = []
): SystemSchema {
  return {
    entityRef: 'acme',
    name: 'Acme',
    version: VERSION,
    level: 'context',
    nodes,
    dependencies,
  };
}

describe('context ownership helpers', () => {
  it('treats product personas and third-parties as author-owned', () => {
    expect(
      isAuthorOwnedContextNode({
        entityRef: 'acme/buyer',
        type: 'person',
        name: 'Buyer',
        properties: { role: 'product-persona' },
      })
    ).toBe(true);
    expect(
      isAuthorOwnedContextNode({
        entityRef: 'acme/payment-gateway',
        type: 'gateway-api',
        name: 'Payment Gateway',
        external: true,
        properties: { classification: 'third-party' },
      })
    ).toBe(true);
  });

  it('classifies systems by contextOwnership, with sparse unmarked as author', () => {
    expect(
      isAuthorOwnedContextNode({
        entityRef: 'acme/checkout',
        type: 'software-system',
        name: 'Checkout',
        properties: { [CONTEXT_OWNERSHIP_PROPERTY]: CONTEXT_OWNERSHIP_AUTHOR },
      })
    ).toBe(true);
    expect(
      isScanOwnedContextNode({
        entityRef: 'acme/checkout',
        type: 'software-system',
        name: 'Checkout',
        properties: {
          [CONTEXT_OWNERSHIP_PROPERTY]: CONTEXT_OWNERSHIP_SCAN,
          rootPath: 'apps/checkout',
        },
      })
    ).toBe(true);
    expect(
      isAuthorOwnedContextNode({
        entityRef: 'acme/checkout',
        type: 'software-system',
        name: 'Checkout',
      })
    ).toBe(true);
    expect(
      isScanOwnedContextNode({
        entityRef: 'acme/frontend',
        type: 'software-system',
        name: 'Frontend System',
        properties: { rootPath: 'apps/web' },
      })
    ).toBe(true);
  });
});

describe('hydrateContextSchema', () => {
  it('creates a context with scan systems and a fallback context actor when base is missing', () => {
    const { schema, prunedEntityRefs } = hydrateContextSchema({
      base: null,
      landscapeEntityRef: 'acme',
      landscapeName: 'Acme',
      version: VERSION,
      scanSystems: [
        {
          entityRef: 'acme/checkout',
          type: 'software-system',
          name: 'Checkout System',
          properties: { rootPath: 'apps/checkout', productId: 'checkout' },
        },
      ],
      ownershipRootPaths: ['apps/checkout'],
    });

    expect(prunedEntityRefs).toEqual([]);
    expect(schema.level).toBe('context');
    expect(schema.entityRef).toBe('acme');
    const system = schema.nodes.find(n => n.entityRef === 'acme/checkout');
    expect(system?.properties?.[CONTEXT_OWNERSHIP_PROPERTY]).toBe(CONTEXT_OWNERSHIP_SCAN);
    const actor = schema.nodes.find(n => n.entityRef === `acme/${CONTEXT_PERSON_LEAF}`);
    expect(actor?.type).toBe('person');
    expect(actor?.properties?.role).toBe(CONTEXT_ACTOR_ROLE);
    expect(schema.dependencies).toContainEqual({
      from: `acme/${CONTEXT_PERSON_LEAF}`,
      to: 'acme/checkout',
      type: 'direct-call',
      description: PERSON_EDGE_DESCRIPTION,
    });
  });

  it('hydrates a sparse system anchor and preserves personas and third-parties', () => {
    const declared = baseContext(
      [
        {
          entityRef: 'acme/checkout',
          type: 'software-system',
          name: 'Checkout',
        },
        {
          entityRef: 'acme/buyer',
          type: 'person',
          name: 'Buyer',
          properties: { role: 'product-persona' },
        },
        {
          entityRef: 'acme/payment-gateway',
          type: 'gateway-api',
          name: 'Payment Gateway',
          external: true,
          properties: { classification: 'third-party', vendor: 'Stripe' },
        },
      ],
      [
        {
          from: 'acme/buyer',
          to: 'acme/checkout',
          type: 'direct-call',
          description: 'Complete purchase',
        },
        {
          from: 'acme/checkout',
          to: 'acme/payment-gateway',
          type: 'direct-call',
          description: 'Charge card',
        },
      ]
    );

    const { schema } = hydrateContextSchema({
      base: declared,
      landscapeEntityRef: 'acme',
      landscapeName: 'Acme',
      version: VERSION,
      scanSystems: [
        {
          entityRef: 'acme/checkout',
          type: 'software-system',
          name: 'Checkout System',
          properties: { rootPath: 'apps/checkout', productId: 'checkout' },
        },
      ],
      ownershipRootPaths: ['apps/checkout'],
    });

    const checkout = schema.nodes.find(n => n.entityRef === 'acme/checkout');
    expect(checkout?.name).toBe('Checkout');
    expect(checkout?.properties?.rootPath).toBe('apps/checkout');
    expect(checkout?.properties?.[CONTEXT_OWNERSHIP_PROPERTY]).toBe(CONTEXT_OWNERSHIP_AUTHOR);
    expect(schema.nodes.some(n => n.entityRef === 'acme/buyer')).toBe(true);
    expect(schema.nodes.some(n => n.entityRef === 'acme/payment-gateway')).toBe(true);
    expect(schema.nodes.some(n => n.properties?.role === CONTEXT_ACTOR_ROLE)).toBe(false);
    expect(schema.dependencies).toContainEqual({
      from: 'acme/buyer',
      to: 'acme/checkout',
      type: 'direct-call',
      description: 'Complete purchase',
    });
    expect(schema.dependencies).toContainEqual({
      from: 'acme/checkout',
      to: 'acme/payment-gateway',
      type: 'direct-call',
      description: 'Charge card',
    });
    expect(schema.dependencies.some(d => d.description === PERSON_EDGE_DESCRIPTION)).toBe(false);
  });

  it('prunes in-scope scan-owned orphans but not other repos or author anchors', () => {
    const prior = baseContext([
      {
        entityRef: 'acme/checkout',
        type: 'software-system',
        name: 'Checkout',
        properties: { [CONTEXT_OWNERSHIP_PROPERTY]: CONTEXT_OWNERSHIP_AUTHOR },
      },
      {
        entityRef: 'acme/old-api',
        type: 'software-system',
        name: 'Old Api System',
        properties: {
          [CONTEXT_OWNERSHIP_PROPERTY]: CONTEXT_OWNERSHIP_SCAN,
          rootPath: 'apps/old-api',
          productId: 'checkout',
        },
      },
      {
        entityRef: 'acme/frontend',
        type: 'software-system',
        name: 'Frontend System',
        properties: {
          [CONTEXT_OWNERSHIP_PROPERTY]: CONTEXT_OWNERSHIP_SCAN,
          rootPath: 'apps/web',
          productId: 'checkout',
        },
      },
      {
        entityRef: 'acme/buyer',
        type: 'person',
        name: 'Buyer',
        properties: { role: 'product-persona' },
      },
    ]);

    const { schema, prunedEntityRefs } = hydrateContextSchema({
      base: prior,
      landscapeEntityRef: 'acme',
      landscapeName: 'Acme',
      version: VERSION,
      scanSystems: [
        {
          entityRef: 'acme/checkout',
          type: 'software-system',
          name: 'Checkout System',
          properties: { rootPath: 'apps/checkout', productId: 'checkout' },
        },
      ],
      ownershipRootPaths: ['apps/old-api', 'apps/checkout'],
    });

    expect(prunedEntityRefs).toEqual(['acme/old-api']);
    expect(schema.nodes.some(n => n.entityRef === 'acme/old-api')).toBe(false);
    expect(schema.nodes.some(n => n.entityRef === 'acme/frontend')).toBe(true);
    expect(schema.nodes.some(n => n.entityRef === 'acme/checkout')).toBe(true);
    expect(schema.nodes.some(n => n.entityRef === 'acme/buyer')).toBe(true);
  });

  it('upserts proposed third-parties without removing declared ones', () => {
    const declared = baseContext([
      {
        entityRef: 'acme/checkout',
        type: 'software-system',
        name: 'Checkout',
      },
      {
        entityRef: 'acme/payment-gateway',
        type: 'gateway-api',
        name: 'Payment Gateway',
        external: true,
        properties: { classification: 'third-party' },
      },
    ]);

    const { schema } = hydrateContextSchema({
      base: declared,
      landscapeEntityRef: 'acme',
      landscapeName: 'Acme',
      version: VERSION,
      scanSystems: [
        {
          entityRef: 'acme/checkout',
          type: 'software-system',
          name: 'Checkout System',
          properties: { rootPath: 'apps/checkout', productId: 'checkout' },
        },
      ],
      ownershipRootPaths: ['apps/checkout'],
      proposedThirdParties: [
        {
          entityRef: 'acme/payment-gateway',
          type: 'gateway-api',
          name: 'Payment Gateway',
          external: true,
          properties: { classification: 'third-party', vendor: 'Stripe' },
        },
        {
          entityRef: 'acme/email-saas',
          type: 'rest-api',
          name: 'Email SaaS',
          external: true,
          properties: { classification: 'third-party' },
        },
      ],
      proposedDependencies: [
        {
          from: 'acme/checkout',
          to: 'acme/email-saas',
          type: 'direct-call',
          description: 'Send receipts',
        },
      ],
    });

    expect(schema.nodes.some(n => n.entityRef === 'acme/payment-gateway')).toBe(true);
    expect(schema.nodes.some(n => n.entityRef === 'acme/email-saas')).toBe(true);
    expect(schema.dependencies).toContainEqual({
      from: 'acme/checkout',
      to: 'acme/email-saas',
      type: 'direct-call',
      description: 'Send receipts',
    });
  });

  it('drops dangling dependencies when an orphan is pruned', () => {
    const prior = baseContext(
      [
        {
          entityRef: 'acme/checkout',
          type: 'software-system',
          name: 'Checkout',
          properties: { [CONTEXT_OWNERSHIP_PROPERTY]: CONTEXT_OWNERSHIP_AUTHOR },
        },
        {
          entityRef: 'acme/old-api',
          type: 'software-system',
          name: 'Old Api',
          properties: {
            [CONTEXT_OWNERSHIP_PROPERTY]: CONTEXT_OWNERSHIP_SCAN,
            rootPath: 'apps/old-api',
          },
        },
      ],
      [
        {
          from: 'acme/checkout',
          to: 'acme/old-api',
          type: 'direct-call',
          description: 'Legacy hop',
        },
      ]
    );

    const { schema } = hydrateContextSchema({
      base: prior,
      landscapeEntityRef: 'acme',
      landscapeName: 'Acme',
      version: VERSION,
      scanSystems: [
        {
          entityRef: 'acme/checkout',
          type: 'software-system',
          name: 'Checkout',
          properties: { rootPath: 'apps/checkout', productId: 'checkout' },
        },
      ],
      ownershipRootPaths: ['apps/old-api', 'apps/checkout'],
    });

    expect(
      schema.dependencies.some(d => d.to === 'acme/old-api' || d.from === 'acme/old-api')
    ).toBe(false);
  });
});
