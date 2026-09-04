import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import type { WorkspaceCatalogEntry } from '@archlens/core';
import { SAMPLES_CONTEXT_PATH } from '../../application/store/samplesWorkspace';

const goldenPathLoaders = import.meta.glob<string>('../../../../../../samples/**/*.{yaml,yml}', {
  query: '?raw',
  import: 'default',
});

function relativePathFromGlobKey(key: string): string {
  const marker = '/samples/';
  const idx = key.indexOf(marker);
  if (idx < 0) {
    throw new Error(`Unexpected samples glob key: ${key}`);
  }
  return key.slice(idx + marker.length);
}

const yamlByRelativePath = Object.fromEntries(
  Object.entries(goldenPathLoaders)
    .filter(([key]) => !key.includes('-overlay.'))
    .map(([key, loader]) => [relativePathFromGlobKey(key), loader])
);

/** Path-only catalog stub from committed samples/. */
function catalogFromGoldenPaths(): WorkspaceCatalogEntry[] {
  return Object.keys(yamlByRelativePath)
    .sort((a, b) => a.localeCompare(b))
    .map(path => ({
      path,
      name:
        path
          .replace(/\.ya?ml$/, '')
          .split('/')
          .pop() || path,
      level: path.includes('/containers')
        ? ('container' as const)
        : path.includes('/components')
          ? ('component' as const)
          : ('context' as const),
      entityRef: path.replace(/\.ya?ml$/, ''),
      nodeEntityRefs: [],
    }));
}

let realCatalog: WorkspaceCatalogEntry[] = [];

function installBundledBlueprintFetchStub(catalog: WorkspaceCatalogEntry[]) {
  vi.stubGlobal(
    'fetch',
    vi.fn(async (input: RequestInfo | URL) => {
      const href = String(input);
      const marker = '/bundled-blueprints/';
      const idx = href.indexOf(marker);
      if (idx < 0) {
        throw new Error(`Unexpected fetch URL in bundled blueprint test: ${href}`);
      }
      const relativePath = href.slice(idx + marker.length);
      if (relativePath === 'catalog.json') {
        return new Response(JSON.stringify(catalog), { status: 200 });
      }
      const loader = yamlByRelativePath[relativePath];
      if (!loader) {
        throw new Error(`Bundled blueprint not found in test fixtures: ${relativePath}`);
      }
      const content = await loader();
      return new Response(content, { status: 200 });
    })
  );
}

describe('BundledSampleWorkspaceAdapter', () => {
  beforeAll(() => {
    window.location.href = 'http://localhost:5188/';
    realCatalog = catalogFromGoldenPaths();
    expect(realCatalog.length).toBeGreaterThan(10);
    installBundledBlueprintFetchStub(realCatalog);
  });

  afterEach(() => {
    vi.resetModules();
  });

  it('exposes the samples catalog for navigation', async () => {
    const { loadBundledWorkspaceCatalog } = await import('./bundledSampleWorkspace');
    const catalog = await loadBundledWorkspaceCatalog();
    expect(catalog.length).toBeGreaterThan(10);
    expect(catalog.some(e => e.path === SAMPLES_CONTEXT_PATH)).toBe(true);
    expect(catalog.some(e => e.path === 'chaoslens-stress/containers.yaml')).toBe(true);
  });

  it('reads a single blueprint file by relative path', async () => {
    const { BundledSampleWorkspaceAdapter } = await import('./bundledSampleWorkspace');
    const content = await BundledSampleWorkspaceAdapter.readFile(SAMPLES_CONTEXT_PATH);
    expect(content).toContain('entityRef:');
  });

  it('rejects non-blueprint source paths so callers can fall back to git raw', async () => {
    const { BundledSampleWorkspaceAdapter } = await import('./bundledSampleWorkspace');
    await expect(
      BundledSampleWorkspaceAdapter.readFile('app/packages/canvas/src/foo.ts')
    ).rejects.toThrow(/only contains blueprint/i);
  });

  it('loads the prebuilt navigation catalog without fetching every YAML', async () => {
    const { loadBundledWorkspaceCatalog } = await import('./bundledSampleWorkspace');
    const fetchMock = fetch as unknown as ReturnType<typeof vi.fn>;
    fetchMock.mockClear();

    const catalog = await loadBundledWorkspaceCatalog();
    expect(catalog.length).toBeGreaterThan(10);
    expect(catalog.some(e => e.path === SAMPLES_CONTEXT_PATH)).toBe(true);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(String(fetchMock.mock.calls[0]?.[0])).toContain('/bundled-blueprints/catalog.json');
  });

  it('warms golden-journey and stress YAML bodies from the catalog', async () => {
    const { warmBundledBlueprintBodies, scheduleBundledBlueprintPreload } =
      await import('./bundledSampleWorkspace');
    const { listBundledPreloadPaths } =
      await import('../../application/store/bundledSamplePreload');
    const fetchMock = fetch as unknown as ReturnType<typeof vi.fn>;
    fetchMock.mockClear();

    const preloadPaths = listBundledPreloadPaths(realCatalog);
    expect(preloadPaths.length).toBeGreaterThan(10);
    expect(
      preloadPaths.every(p => /^(golden-journey|chaoslens-stress|advicelens-stress)\//.test(p))
    ).toBe(true);

    await warmBundledBlueprintBodies(preloadPaths);
    const warmed = fetchMock.mock.calls.map(call => String(call[0]));
    expect(warmed).toHaveLength(preloadPaths.length);
    expect(warmed.every(url => url.includes('/bundled-blueprints/'))).toBe(true);

    vi.stubGlobal('requestIdleCallback', (cb: IdleRequestCallback) => {
      cb({ didTimeout: false, timeRemaining: () => 50 } as IdleDeadline);
      return 1;
    });
    fetchMock.mockClear();
    scheduleBundledBlueprintPreload(realCatalog);
    await vi.waitFor(() => {
      expect(fetchMock.mock.calls.length).toBe(preloadPaths.length);
    });
  });
});

describe('BundledSampleWorkspaceAdapter fetch resilience', () => {
  const tinyCatalog: WorkspaceCatalogEntry[] = [
    {
      path: 'demo/context.yaml',
      name: 'Demo',
      level: 'context',
      entityRef: 'demo',
      nodeEntityRefs: [],
    },
    {
      path: 'demo/containers.yaml',
      name: 'App',
      level: 'container',
      entityRef: 'demo/app',
      nodeEntityRefs: [],
      parentEntityRef: 'demo',
    },
  ];
  const yamlByPath: Record<string, string> = {
    'demo/context.yaml':
      'entityRef: demo\nlevel: context\nname: Demo\nnodes: []\ndependencies: []\n',
    'demo/containers.yaml':
      'entityRef: demo/app\nlevel: container\nname: App\nnodes: []\ndependencies: []\n',
  };

  beforeEach(() => {
    window.location.href = 'http://localhost:5188/';
    vi.resetModules();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.useRealTimers();
    vi.resetModules();
  });

  function relativeFromUrl(input: RequestInfo | URL): string {
    const href = String(input);
    const marker = '/bundled-blueprints/';
    const idx = href.indexOf(marker);
    if (idx < 0) throw new Error(`Unexpected fetch URL: ${href}`);
    return href.slice(idx + marker.length);
  }

  it('retries transient Failed to fetch errors and then succeeds', async () => {
    let catalogAttempts = 0;
    vi.stubGlobal(
      'fetch',
      vi.fn(async (input: RequestInfo | URL) => {
        const relativePath = relativeFromUrl(input);
        if (relativePath === 'catalog.json') {
          catalogAttempts += 1;
          if (catalogAttempts < 3) {
            throw new TypeError('Failed to fetch');
          }
          return new Response(JSON.stringify(tinyCatalog), { status: 200 });
        }
        return new Response(yamlByPath[relativePath], { status: 200 });
      })
    );

    const { BundledSampleWorkspaceAdapter } = await import('./bundledSampleWorkspace');
    const files = await BundledSampleWorkspaceAdapter.readDirectoryFiles();
    expect(files.map(f => f.name)).toEqual(
      [...tinyCatalog.map(e => e.path)].sort((a, b) => a.localeCompare(b))
    );
    expect(catalogAttempts).toBe(3);
  });

  it('clears a failed catalog cache so a later retry can succeed', async () => {
    let catalogAttempts = 0;
    vi.stubGlobal(
      'fetch',
      vi.fn(async (input: RequestInfo | URL) => {
        const relativePath = relativeFromUrl(input);
        if (relativePath === 'catalog.json') {
          catalogAttempts += 1;
          if (catalogAttempts <= 8) {
            throw new TypeError('Failed to fetch');
          }
          return new Response(JSON.stringify(tinyCatalog), { status: 200 });
        }
        return new Response(yamlByPath[relativePath], { status: 200 });
      })
    );

    const { BundledSampleWorkspaceAdapter } = await import('./bundledSampleWorkspace');
    vi.useFakeTimers();
    const firstLoad = BundledSampleWorkspaceAdapter.readDirectoryFiles();
    const firstResult = firstLoad.catch((error: unknown) => error);
    await vi.runAllTimersAsync();
    await expect(firstResult).resolves.toBeInstanceOf(Error);
    await expect(firstResult).resolves.toMatchObject({
      message: expect.stringMatching(/Failed to fetch blueprint catalog/i),
    });
    vi.useRealTimers();

    const files = await BundledSampleWorkspaceAdapter.readDirectoryFiles();
    expect(files).toHaveLength(2);
    expect(catalogAttempts).toBe(9);
  });

  it('limits concurrent blueprint downloads', async () => {
    let inFlight = 0;
    let maxInFlight = 0;
    const manyCatalog: WorkspaceCatalogEntry[] = Array.from({ length: 40 }, (_, i) => ({
      path: `demo/file-${i}.yaml`,
      name: `File ${i}`,
      level: 'context' as const,
      entityRef: `demo-${i}`,
      nodeEntityRefs: [],
    }));
    vi.stubGlobal(
      'fetch',
      vi.fn(async (input: RequestInfo | URL) => {
        const relativePath = relativeFromUrl(input);
        if (relativePath === 'catalog.json') {
          return new Response(JSON.stringify(manyCatalog), { status: 200 });
        }
        inFlight += 1;
        maxInFlight = Math.max(maxInFlight, inFlight);
        await new Promise(resolve => setTimeout(resolve, 5));
        inFlight -= 1;
        return new Response(
          'entityRef: x\nlevel: context\nname: X\nnodes: []\ndependencies: []\n',
          {
            status: 200,
          }
        );
      })
    );

    const { BundledSampleWorkspaceAdapter, CATALOG_BLUEPRINT_FETCH_CONCURRENCY } =
      await import('./bundledSampleWorkspace');
    await BundledSampleWorkspaceAdapter.readDirectoryFiles();
    expect(maxInFlight).toBeLessThanOrEqual(CATALOG_BLUEPRINT_FETCH_CONCURRENCY);
    expect(maxInFlight).toBeGreaterThan(1);
  });
});
