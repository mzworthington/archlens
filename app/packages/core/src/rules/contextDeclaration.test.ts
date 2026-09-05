import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { CONTEXT_OWNERSHIP_AUTHOR, CONTEXT_OWNERSHIP_PROPERTY } from './contextHydration';
import {
  assembleContextDeclaration,
  serializeContextDeclarationToYaml,
} from './contextDeclaration';
import { hydrateContextSchema } from './contextHydration';
import { parseSchemaFromYaml } from './graphParse';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../../../../');

describe('assembleContextDeclaration', () => {
  it('builds personas, system anchors and third-party externals with synthesized edges', () => {
    const schema = assembleContextDeclaration({
      entityRef: 'archlens',
      name: 'ArchLens',
      description: 'Architecture modeling for product estates',
      personas: [
        {
          id: 'architect',
          name: 'Architect',
          description: 'Declare system context and review the landscape',
          product: 'canvas',
        },
        {
          id: 'contributor',
          name: 'Contributor',
          description: 'Scan repositories and maintain BlueprintSpec',
          product: 'cli',
        },
        {
          id: 'operator',
          name: 'Operator',
          description: 'Publish catalog fragments to object storage',
          product: 'catalog',
        },
      ],
      systems: [{ entityRef: 'archlens', name: 'ArchLens' }],
      externals: [
        {
          id: 'blueprint-catalog-r2',
          name: 'Cloudflare R2 Catalog',
          type: 'rest-api',
          vendor: 'Cloudflare R2',
          description: 'Publish and compose blueprint corpora',
        },
      ],
    });

    expect(schema.level).toBe('context');
    expect(schema.entityRef).toBe('archlens');
    expect(schema.nodes.find(n => n.entityRef === 'archlens')?.name).toBe('ArchLens');
    expect(schema.nodes.find(n => n.entityRef === 'archlens/architect')?.properties).toMatchObject({
      role: 'product-persona',
      product: 'canvas',
      [CONTEXT_OWNERSHIP_PROPERTY]: CONTEXT_OWNERSHIP_AUTHOR,
    });
    const bucket = schema.nodes.find(n => n.entityRef === 'archlens/blueprint-catalog-r2');
    expect(bucket?.external).toBe(true);
    expect(bucket?.properties).toMatchObject({
      classification: 'third-party',
      vendor: 'Cloudflare R2',
      [CONTEXT_OWNERSHIP_PROPERTY]: CONTEXT_OWNERSHIP_AUTHOR,
    });
    expect(schema.dependencies).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          from: 'archlens/architect',
          to: 'archlens',
          description: 'Declare system context and review the landscape',
        }),
        expect.objectContaining({
          from: 'archlens',
          to: 'archlens/blueprint-catalog-r2',
          description: 'Publish and compose blueprint corpora',
        }),
      ])
    );
  });

  it('serializes a YAML seed with metadata description', () => {
    const yaml = serializeContextDeclarationToYaml({
      entityRef: 'backstage',
      name: 'Backstage',
      description: 'Developer portal landscape',
      personas: [{ id: 'developer', name: 'Developer', description: 'Browse the portal' }],
      systems: [{ entityRef: 'backstage', name: 'Backstage' }],
    });

    expect(yaml).toContain('level: context');
    expect(yaml).toContain('entityRef: backstage');
    expect(yaml).toContain('description: Developer portal landscape');
    expect(yaml).toContain('role: product-persona');
    expect(yaml).toContain('from: backstage/developer');
  });

  it('derives names from entityRef when omitted', () => {
    const schema = assembleContextDeclaration({
      entityRef: 'acme',
      personas: [{ id: 'buyer', description: 'Complete purchase' }],
      systems: [{ entityRef: 'acme/checkout' }],
      externals: [{ id: 'payment-gateway', type: 'gateway-api', vendor: 'Stripe' }],
    });

    expect(schema.name).toBe('Acme');
    expect(schema.nodes.find(n => n.entityRef === 'acme/checkout')?.name).toBe('Checkout');
    expect(schema.nodes.find(n => n.entityRef === 'acme/buyer')?.name).toBe('Buyer');
    expect(schema.nodes.find(n => n.entityRef === 'acme/payment-gateway')?.name).toBe(
      'Payment Gateway'
    );
  });

  it('hydrates the committed ArchLens blueprints context seed', () => {
    const seedPath = path.join(repoRoot, 'blueprints/archlens/context.yaml');
    const seed = parseSchemaFromYaml(readFileSync(seedPath, 'utf8'));
    expect(seed.nodes.some(n => n.entityRef === 'archlens/architect')).toBe(true);
    expect(seed.nodes.some(n => n.entityRef === 'archlens/blueprint-catalog-r2')).toBe(true);

    const { schema } = hydrateContextSchema({
      base: seed,
      landscapeEntityRef: 'archlens',
      landscapeName: 'ArchLens',
      version: seed.version,
      scanSystems: [
        {
          entityRef: 'archlens',
          type: 'group',
          name: 'ArchLens System',
          properties: { rootPath: '', productId: 'archlens' },
        },
        {
          entityRef: 'archlens/app',
          type: 'software-system',
          name: 'App System',
          parentEntityRef: 'archlens',
          properties: { rootPath: 'app', productId: 'archlens' },
        },
      ],
      ownershipRootPaths: ['app'],
    });

    expect(schema.nodes.some(n => n.entityRef === 'archlens/architect')).toBe(true);
    expect(schema.nodes.some(n => n.entityRef === 'archlens/blueprint-catalog-r2')).toBe(true);
    expect(schema.nodes.some(n => n.entityRef === 'archlens/user')).toBe(false);
    expect(schema.nodes.find(n => n.entityRef === 'archlens')?.name).toBe('ArchLens');
  });
});
