import { describe, expect, it } from 'vitest';
import { InMemoryObjectStorage } from '@archlens/storage';
import { parseSchemaFromYaml } from '@archlens/core';
import { runPublishCatalog } from './publishCatalog.ts';

const v4 = 'https://archlens.dev/schemas/v4/blueprint.schema.json';

const demoYaml = `
version: ${v4}
level: context
metadata:
  entityRef: demo
  name: Demo
nodes: []
dependencies: []
`;

describe('Feature: Publish blueprint catalog from CI', () => {
  it('skips publish when blueprint validation fails', async () => {
    const outcome = await runPublishCatalog(
      { targetPath: 'blueprints', format: 'json', dryRun: true },
      {
        loadBlueprintTree: async () => ({
          files: [],
          parseErrors: [{ path: 'bad.yaml', message: 'parse error' }],
        }),
        resolveStorage: () => new InMemoryObjectStorage(),
      }
    );

    expect(outcome.kind).toBe('validation-failed');
  });

  it('returns a dry-run plan without touching object storage', async () => {
    const storage = new InMemoryObjectStorage();
    const outcome = await runPublishCatalog(
      { targetPath: 'blueprints', format: 'json', dryRun: true },
      {
        loadBlueprintTree: async () => ({
          files: [
            {
              relativePath: 'demo/context.yaml',
              content: demoYaml,
              schema: parseSchemaFromYaml(demoYaml),
            },
          ],
          parseErrors: [],
        }),
        resolveStorage: () => storage,
      }
    );

    expect(outcome.kind).toBe('dry-run');
    if (outcome.kind === 'dry-run') {
      expect(outcome.result.catalogEntryCount).toBe(1);
      expect(outcome.result.objects.some(object => object.key.includes('catalog.json'))).toBe(true);
    }
    expect(storage.putOrder).toHaveLength(0);
  });

  it('uploads through the storage port when dry-run is disabled', async () => {
    const storage = new InMemoryObjectStorage('r2');
    const outcome = await runPublishCatalog(
      { targetPath: 'blueprints', format: 'json', dryRun: false },
      {
        loadBlueprintTree: async () => ({
          files: [
            {
              relativePath: 'demo/context.yaml',
              content: demoYaml,
              schema: parseSchemaFromYaml(demoYaml),
            },
          ],
          parseErrors: [],
        }),
        resolveStorage: () => storage,
      }
    );

    expect(outcome.kind).toBe('uploaded');
    expect(storage.putOrder.at(-1)).toBe('latest/manifest.json');
  });

  it('reports when object storage is not configured', async () => {
    const outcome = await runPublishCatalog(
      { targetPath: 'blueprints', format: 'json', dryRun: false },
      {
        loadBlueprintTree: async () => ({
          files: [
            {
              relativePath: 'demo/context.yaml',
              content: demoYaml,
              schema: parseSchemaFromYaml(demoYaml),
            },
          ],
          parseErrors: [],
        }),
        resolveStorage: () => null,
      }
    );

    expect(outcome.kind).toBe('storage-not-configured');
  });
});
