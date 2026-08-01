import { describe, it, expect } from 'vitest';
import {
  discoverSystems,
  normalizeContextGrouping,
  partitionFilesBySystem,
  planIacContextSystems,
  parseNpmWorkspaces,
  parsePnpmWorkspacePackages,
  pruneEmptyProductHubs,
  resolveProductIdForPath,
  workspaceRootsFromGlobs,
  withProductHub,
} from './systemDiscovery.ts';
import type { SystemDiscoveryFs } from './systemDiscovery.ts';

function memoryFs(opts: {
  texts?: Record<string, string>;
  dirs?: Record<string, string[]>;
}): SystemDiscoveryFs {
  const texts = new Map(Object.entries(opts.texts || {}));
  const dirs = new Map(Object.entries(opts.dirs || {}));
  return {
    exists: p => texts.has(p) || dirs.has(p),
    readText: p => texts.get(p) ?? null,
    listDirectoryNames: p => dirs.get(p) ?? [],
    getAbsolutePath: (...parts) => parts.join('/').replace(/\/+/g, '/'),
  };
}

describe('systemDiscovery', () => {
  it('extracts workspace roots from globs', () => {
    expect(workspaceRootsFromGlobs(['packages/*', 'plugins/*', './apps/*'])).toEqual([
      'packages',
      'plugins',
      'apps',
    ]);
  });

  it('parses npm and pnpm workspace declarations', () => {
    expect(parseNpmWorkspaces(JSON.stringify({ workspaces: ['packages/*', 'plugins/*'] }))).toEqual(
      ['packages/*', 'plugins/*']
    );
    expect(
      parseNpmWorkspaces(JSON.stringify({ workspaces: { packages: ['packages/*'] } }))
    ).toEqual(['packages/*']);
    expect(
      parsePnpmWorkspacePackages(['packages:', "  - 'packages/*'", "  - 'plugins/*'"].join('\n'))
    ).toEqual(['packages/*', 'plugins/*']);
  });

  it('discovers a product hub plus workspace/standalone spokes', () => {
    const fs = memoryFs({
      texts: {
        '/repo/package.json': JSON.stringify({
          name: 'backstage',
          workspaces: ['packages/*', 'plugins/*'],
        }),
        '/repo/microsite/package.json': JSON.stringify({ name: 'microsite' }),
        '/repo/docs-ui/package.json': JSON.stringify({ name: 'docs-ui' }),
      },
      dirs: {
        '/repo': ['packages', 'plugins', 'microsite', 'docs-ui', 'docs', 'node_modules', 'scripts'],
      },
    });

    const systems = discoverSystems('/repo', fs, { fallbackId: 'backstage' });
    expect(systems.map(s => s.id).sort()).toEqual([
      'backstage',
      'docs-ui',
      'microsite',
      'packages',
      'plugins',
    ]);
    expect(systems.find(s => s.id === 'backstage')?.kind).toBe('product');
    expect(systems.every(s => s.productId === 'backstage')).toBe(true);
    expect(systems.find(s => s.id === 'docs')).toBeUndefined();
  });

  it('withProductHub does not link different products together', () => {
    const backstage = withProductHub(
      [
        {
          id: 'packages',
          displayName: 'Packages',
          rootPath: 'packages',
          kind: 'workspace',
          productId: 'packages',
        },
      ],
      'backstage'
    );
    const blueprint = withProductHub(
      [
        {
          id: 'cli',
          displayName: 'Cli',
          rootPath: 'packages/cli',
          kind: 'workspace',
          productId: 'cli',
        },
      ],
      'blueprint'
    );
    expect(backstage[0].productId).toBe('backstage');
    expect(blueprint[0].productId).toBe('blueprint');
    expect(backstage[0].productId).not.toBe(blueprint[0].productId);
  });

  it('respects explicit systems config override and still adds a product hub', () => {
    const fs = memoryFs({ texts: {}, dirs: { '/repo': [] } });
    const systems = discoverSystems('/repo', fs, {
      systems: ['packages', 'microsite'],
      fallbackId: 'backstage',
    });
    expect(systems.map(s => s.id).sort()).toEqual(['backstage', 'microsite', 'packages']);
    expect(systems.find(s => s.id === 'backstage')?.kind).toBe('product');
  });

  it('pins a single-repo scan to a named system under a shared product hub', () => {
    const fs = memoryFs({
      texts: { '/repo/package.json': JSON.stringify({ name: 'frontend-repo' }) },
      dirs: { '/repo': ['src'] },
    });
    const systems = discoverSystems('/repo', fs, {
      systemName: 'frontend-api',
      productName: 'acme',
    });
    expect(systems.map(s => s.id).sort()).toEqual(['acme', 'frontend-api']);
    expect(systems.find(s => s.id === 'acme')?.kind).toBe('product');
    expect(systems.find(s => s.id === 'frontend-api')).toMatchObject({
      displayName: 'Frontend Api',
      productId: 'acme',
    });
    expect(systems.every(s => s.productId === 'acme')).toBe(true);
  });

  it('reads app/package.json when the repo root has no package manifest', () => {
    const fs = memoryFs({
      texts: {
        '/repo/app/package.json': JSON.stringify({ name: 'archlens' }),
      },
      dirs: { '/repo': ['app'] },
    });
    const systems = discoverSystems('/repo', fs, { fallbackId: 'sim' });
    expect(systems.find(s => s.id === 'archlens')).toMatchObject({
      kind: 'product',
      displayName: 'ArchLens',
    });
    expect(systems.find(s => s.id === 'app')?.productId).toBe('archlens');
  });

  it('falls back to a single system when no workspaces or standalone packages exist', () => {
    const fs = memoryFs({
      texts: { '/repo/package.json': JSON.stringify({ name: 'simple-app' }) },
      dirs: { '/repo': ['src'] },
    });
    const systems = discoverSystems('/repo', fs, { fallbackId: 'simple-app' });
    expect(systems).toEqual([
      {
        id: 'simple-app',
        displayName: 'Simple App',
        rootPath: '',
        kind: 'fallback',
        productId: 'simple-app',
      },
    ]);
  });

  it('partitions repo-wide files onto a named multi-repo system instead of the product hub', () => {
    const systems = [
      {
        id: 'acme',
        displayName: 'Acme',
        rootPath: '',
        kind: 'product' as const,
        productId: 'acme',
      },
      {
        id: 'frontend-api',
        displayName: 'Frontend Api',
        rootPath: '',
        kind: 'config' as const,
        productId: 'acme',
      },
    ];
    const buckets = partitionFilesBySystem([{ relativePath: 'src/api.ts' }], systems);
    expect(buckets.get('frontend-api')).toHaveLength(1);
    expect(buckets.get('acme')).toHaveLength(0);
  });

  it('partitions files by longest matching system root', () => {
    const systems = [
      {
        id: 'backstage',
        displayName: 'Backstage',
        rootPath: '',
        kind: 'product' as const,
        productId: 'backstage',
      },
      {
        id: 'packages',
        displayName: 'Packages',
        rootPath: 'packages',
        kind: 'workspace' as const,
        productId: 'backstage',
      },
      {
        id: 'microsite',
        displayName: 'Microsite',
        rootPath: 'microsite',
        kind: 'standalone' as const,
        productId: 'backstage',
      },
    ];
    const buckets = partitionFilesBySystem(
      [
        { relativePath: 'packages/catalog/src/index.ts' },
        { relativePath: 'microsite/src/pages/index.tsx' },
        { relativePath: 'README.md' },
      ],
      systems
    );
    expect(buckets.get('packages')).toHaveLength(1);
    expect(buckets.get('microsite')).toHaveLength(1);
    expect(buckets.get('backstage')?.map(f => f.relativePath)).toEqual(['README.md']);
  });

  it('resolveProductIdForPath uses the same longest-prefix rules as code partitioning', () => {
    const systems = [
      {
        id: 'backstage',
        displayName: 'Backstage',
        rootPath: '',
        kind: 'product' as const,
        productId: 'backstage',
      },
      {
        id: 'packages',
        displayName: 'Packages',
        rootPath: 'packages',
        kind: 'workspace' as const,
        productId: 'backstage',
      },
    ];
    expect(resolveProductIdForPath('packages/catalog/src/index.ts', systems)).toBe('backstage');
    expect(resolveProductIdForPath('contrib/terraform/techdocs-s3-storage', systems)).toBe(
      'backstage'
    );
  });

  it('planIacContextSystems nests sibling modules under their shared parent folder', () => {
    const planned = planIacContextSystems(
      [
        {
          entityRef: 'aws-domain-redirect',
          displayName: 'aws-domain-redirect',
          rootPath: 'aws/aws_domain_redirect',
          productId: 'terraform-examples',
        },
        {
          entityRef: 'aws-lambda-api',
          displayName: 'aws-lambda-api',
          rootPath: 'aws/aws_lambda_api',
          productId: 'terraform-examples',
        },
      ],
      () => false
    );

    expect(planned.find(s => s.entityRef === 'aws')).toMatchObject({
      rootPath: 'aws',
      productId: 'terraform-examples',
    });
    expect(planned.find(s => s.entityRef === 'aws-lambda-api')).toMatchObject({
      parentEntityRef: 'aws',
    });
    expect(planned.find(s => s.entityRef === 'aws-domain-redirect')).toMatchObject({
      parentEntityRef: 'aws',
    });
  });

  it('planIacContextSystems folds modules into the product hub when one exists', () => {
    const planned = planIacContextSystems(
      [
        {
          entityRef: 'aws-domain-redirect',
          displayName: 'aws-domain-redirect',
          rootPath: 'aws/aws_domain_redirect',
          productId: 'terraform-examples',
        },
        {
          entityRef: 'aws-lambda-api',
          displayName: 'aws-lambda-api',
          rootPath: 'aws/aws_lambda_api',
          productId: 'terraform-examples',
        },
      ],
      productId => productId === 'terraform-examples'
    );

    expect(planned.some(s => s.entityRef === 'aws')).toBe(false);
    expect(planned.find(s => s.entityRef === 'aws-lambda-api')).toMatchObject({
      parentEntityRef: 'terraform-examples',
    });
  });

  it('normalizeContextGrouping collapses orphan folder groups and promotes hubs', () => {
    const nodes = normalizeContextGrouping([
      {
        entityRef: 'ctx/terraform-examples',
        type: 'software-system',
        name: 'Terraform Examples',
        properties: { productId: 'terraform-examples' },
      },
      {
        entityRef: 'ctx/aws',
        type: 'group',
        name: 'Aws',
        properties: { productId: 'terraform-examples', rootPath: 'aws' },
      },
      {
        entityRef: 'ctx/aws-lambda-api',
        type: 'software-system',
        name: 'Lambda',
        parentEntityRef: 'ctx/aws',
        properties: { productId: 'terraform-examples' },
      },
    ]);

    expect(nodes.find(n => n.entityRef === 'ctx/aws')).toBeUndefined();
    expect(nodes.find(n => n.entityRef === 'ctx/terraform-examples')?.type).toBe('group');
    expect(nodes.find(n => n.entityRef === 'ctx/aws-lambda-api')?.parentEntityRef).toBe(
      'ctx/terraform-examples'
    );
  });

  it('normalizeContextGrouping drops empty folder groups nested under a product hub', () => {
    const nodes = normalizeContextGrouping([
      {
        entityRef: 'ctx/terraform-examples',
        type: 'group',
        name: 'Terraform Examples',
        properties: { productId: 'terraform-examples' },
      },
      {
        entityRef: 'ctx/aws',
        type: 'group',
        name: 'Aws',
        parentEntityRef: 'ctx/terraform-examples',
        properties: { productId: 'terraform-examples', rootPath: 'aws' },
      },
    ]);

    expect(nodes.find(n => n.entityRef === 'ctx/aws')).toBeUndefined();
    expect(nodes.find(n => n.entityRef === 'ctx/terraform-examples')?.type).toBe('group');
  });

  it('pruneEmptyProductHubs removes orphaned infrastructure frames', () => {
    const nodes = pruneEmptyProductHubs(
      [
        {
          entityRef: 'demo/infrastructure',
          type: 'group',
          name: 'Infrastructure System',
          properties: { productId: 'infrastructure' },
        },
        {
          entityRef: 'demo/backstage',
          type: 'group',
          name: 'Backstage System',
          properties: { productId: 'backstage' },
        },
        {
          entityRef: 'demo/techdocs-s3-storage',
          type: 'software-system',
          name: 'Techdocs',
          parentEntityRef: 'demo/backstage',
          properties: { productId: 'backstage' },
        },
      ],
      ['infrastructure']
    );
    expect(nodes.some(n => n.entityRef === 'demo/infrastructure')).toBe(false);
    expect(nodes.some(n => n.entityRef === 'demo/backstage')).toBe(true);
  });
});
