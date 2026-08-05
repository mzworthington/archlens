import { describe, expect, it, vi } from 'vitest';
import {
  createRemoteCatalogWorkspaceAdapter,
  loadRemoteWorkspaceCatalog,
} from './remoteCatalogWorkspace';

const v4 = 'https://archlens.dev/schemas/v4/blueprint.schema.json';

const contextYaml = `
version: ${v4}
level: context
metadata:
  entityRef: samples
  name: Samples
nodes:
  - entityRef: samples/golden-journey
    type: software-system
    name: Golden Journey
dependencies: []
`;

const catalog = [
  {
    path: 'golden-journey/context.yaml',
    name: 'Samples',
    level: 'context' as const,
    entityRef: 'samples',
    nodeEntityRefs: ['samples/golden-journey'],
  },
];

describe('Feature: Hosted sandbox reads remote catalog', () => {
  it('follows latest pointer → catalog → lazy YAML consume protocol', async () => {
    const fetchImpl = vi.fn(async (input: RequestInfo | URL) => {
      const href = String(input);
      if (href.endsWith('/latest/manifest.json')) {
        return new Response(
          JSON.stringify({
            revision: 'rev1',
            publishedAt: '2026-08-04T12:00:00.000Z',
            snapshotPrefix: 'snapshots/rev1/',
          }),
          { status: 200 }
        );
      }
      if (href.endsWith('/snapshots/rev1/catalog.json')) {
        return new Response(JSON.stringify(catalog), { status: 200 });
      }
      if (href.endsWith('/snapshots/rev1/golden-journey/context.yaml')) {
        return new Response(contextYaml, { status: 200 });
      }
      return new Response('missing', { status: 404 });
    });

    const options = {
      baseUrl: 'https://blueprints.example.dev/',
      workspaceName: 'samples',
      fetchImpl,
    };

    const loadedCatalog = await loadRemoteWorkspaceCatalog(options);
    expect(loadedCatalog).toHaveLength(1);

    const adapter = createRemoteCatalogWorkspaceAdapter(options);
    const content = await adapter.readFile('golden-journey/context.yaml');
    expect(content).toContain('entityRef: samples');
    expect(adapter.getDirectoryName()).toBe('samples');
  });

  it('rejects diagram paths that are not listed in the remote catalog', async () => {
    const fetchImpl = vi.fn(async (input: RequestInfo | URL) => {
      const href = String(input);
      if (href.endsWith('/latest/manifest.json')) {
        return new Response(
          JSON.stringify({
            revision: 'rev1',
            publishedAt: '2026-08-04T12:00:00.000Z',
            snapshotPrefix: 'snapshots/rev1/',
          }),
          { status: 200 }
        );
      }
      if (href.endsWith('/snapshots/rev1/catalog.json')) {
        return new Response(JSON.stringify(catalog), { status: 200 });
      }
      return new Response('missing', { status: 404 });
    });

    const adapter = createRemoteCatalogWorkspaceAdapter({
      baseUrl: 'https://blueprints.example.dev/',
      workspaceName: 'samples',
      fetchImpl,
    });

    await expect(adapter.readFile('missing/context.yaml')).rejects.toThrow(
      /does not contain blueprint path/i
    );
  });
});
