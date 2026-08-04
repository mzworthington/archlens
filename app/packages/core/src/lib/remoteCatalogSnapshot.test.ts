import { describe, expect, it } from 'vitest';
import {
  buildRemoteCatalogSnapshotPlan,
  materializeRemoteCatalogSnapshotBodies,
  parseRemoteCatalogLatestPointer,
  parseRemoteCatalogSnapshotManifest,
  remoteCatalogLatestManifestKey,
  remoteCatalogSnapshotManifestKey,
  remoteCatalogSnapshotPrefix,
  serializeWorkspaceCatalog,
} from './remoteCatalogSnapshot';

const v4 = 'https://archlens.dev/schemas/v4/blueprint.schema.json';

const contextYaml = `
version: ${v4}
level: context
metadata:
  entityRef: golden-paths
  name: Golden Paths
nodes:
  - entityRef: golden-paths/golden-journey
    type: software-system
    name: Golden Journey
dependencies: []
`;

const containersYaml = `
version: ${v4}
level: container
metadata:
  entityRef: golden-paths/golden-journey
  name: Golden Journey Estate
nodes:
  - entityRef: golden-paths/golden-journey/web
    type: web-app
    name: Web
dependencies: []
`;

describe('Feature: Remote catalog snapshot contract (ADR-0010)', () => {
  describe('Scenario: Successful publish builds an immutable snapshot', () => {
    it('builds snapshot manifest, latest pointer, and upload object keys', () => {
      const plan = buildRemoteCatalogSnapshotPlan({
        revisionId: 'abc123def456',
        workspaceName: 'blueprints',
        toolVersion: 'archlens 1.0.0',
        publishedAt: '2026-08-04T12:00:00.000Z',
        yamlObjects: [
          { path: 'golden-journey/context.yaml', content: contextYaml },
          { path: 'golden-journey/containers.yaml', content: containersYaml },
        ],
      });

      expect(plan.snapshotPrefix).toBe('snapshots/abc123def456/');
      expect(plan.snapshotManifest).toEqual({
        revision: 'abc123def456',
        publishedAt: '2026-08-04T12:00:00.000Z',
        toolVersion: 'archlens 1.0.0',
        workspaceName: 'blueprints',
        catalogPath: 'catalog.json',
        objectCount: 2,
      });
      expect(plan.latestPointer).toEqual({
        revision: 'abc123def456',
        publishedAt: '2026-08-04T12:00:00.000Z',
        snapshotPrefix: 'snapshots/abc123def456/',
      });
      expect(plan.catalog.map(entry => entry.path).sort()).toEqual([
        'golden-journey/containers.yaml',
        'golden-journey/context.yaml',
      ]);

      const keys = plan.objects.map(object => object.key).sort();
      expect(keys).toEqual([
        'latest/manifest.json',
        'snapshots/abc123def456/catalog.json',
        'snapshots/abc123def456/golden-journey/containers.yaml',
        'snapshots/abc123def456/golden-journey/context.yaml',
        'snapshots/abc123def456/manifest.json',
      ]);
      expect(keys.every(key => plan.objects.find(object => object.key === key)!.bytes > 0)).toBe(
        true
      );
    });
  });

  describe('Scenario: Invalid corpus is rejected before publish', () => {
    it('normalizes Windows-style paths and rejects duplicates', () => {
      const plan = buildRemoteCatalogSnapshotPlan({
        revisionId: 'rev1',
        workspaceName: 'blueprints',
        toolVersion: 'dev',
        yamlObjects: [{ path: 'golden-journey\\context.yaml', content: contextYaml }],
      });
      expect(plan.yamlObjects[0]?.path).toBe('golden-journey/context.yaml');

      expect(() =>
        buildRemoteCatalogSnapshotPlan({
          revisionId: 'rev1',
          workspaceName: 'blueprints',
          toolVersion: 'dev',
          yamlObjects: [
            { path: 'a.yaml', content: contextYaml },
            { path: 'a.yaml', content: containersYaml },
          ],
        })
      ).toThrow(/duplicate/i);
    });
  });
});

describe('Feature: Parse published catalog manifests', () => {
  it('round-trips a valid snapshot manifest', () => {
    const manifest = {
      revision: 'abc',
      publishedAt: '2026-08-04T12:00:00.000Z',
      toolVersion: 'archlens 1.0.0',
      workspaceName: 'blueprints',
      catalogPath: 'catalog.json',
      objectCount: 3,
    };
    expect(parseRemoteCatalogSnapshotManifest(manifest)).toEqual(manifest);
  });

  it('rejects invalid payloads', () => {
    expect(() => parseRemoteCatalogSnapshotManifest(null)).toThrow(/snapshot manifest/i);
    expect(() => parseRemoteCatalogSnapshotManifest({ revision: '' })).toThrow(/revision/i);
  });
});

describe('parseRemoteCatalogLatestPointer', () => {
  it('round-trips a valid latest pointer', () => {
    const pointer = {
      revision: 'abc',
      publishedAt: '2026-08-04T12:00:00.000Z',
      snapshotPrefix: 'snapshots/abc/',
    };
    expect(parseRemoteCatalogLatestPointer(pointer)).toEqual(pointer);
  });
});

describe('remote catalog path helpers', () => {
  it('builds stable manifest keys', () => {
    expect(remoteCatalogSnapshotPrefix('abc')).toBe('snapshots/abc/');
    expect(remoteCatalogSnapshotManifestKey('abc')).toBe('snapshots/abc/manifest.json');
    expect(remoteCatalogLatestManifestKey()).toBe('latest/manifest.json');
  });
});

describe('serializeWorkspaceCatalog', () => {
  it('emits trailing newline JSON', () => {
    const json = serializeWorkspaceCatalog([
      {
        path: 'a.yaml',
        name: 'A',
        level: 'context',
        entityRef: 'a',
        nodeEntityRefs: [],
      },
    ]);
    expect(json.endsWith('\n')).toBe(true);
    expect(JSON.parse(json.trimEnd())).toHaveLength(1);
  });
});

describe('Feature: Atomic snapshot materialization', () => {
  it('places latest pointer last so upload can cut over safely', () => {
    const plan = buildRemoteCatalogSnapshotPlan({
      revisionId: 'rev1',
      workspaceName: 'blueprints',
      toolVersion: 'dev',
      yamlObjects: [{ path: 'golden-journey/context.yaml', content: contextYaml }],
    });
    const bodies = materializeRemoteCatalogSnapshotBodies(plan);
    expect(bodies.at(-1)?.key).toBe('latest/manifest.json');
    expect(bodies.some(body => body.key === 'snapshots/rev1/catalog.json')).toBe(true);
    expect(bodies.some(body => body.key === 'snapshots/rev1/manifest.json')).toBe(true);
  });
});
