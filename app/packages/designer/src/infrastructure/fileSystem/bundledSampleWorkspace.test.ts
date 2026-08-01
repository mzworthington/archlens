import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { GOLDEN_PATHS_CONTEXT_PATH } from '../../application/store/goldenPathsSample';

const blueprintLoaders = import.meta.glob<string>(
  '../../../public/bundled-blueprints/**/*.{yaml,yml}',
  { query: '?raw', import: 'default' }
);

function relativePathFromGlobKey(key: string): string {
  const marker = '/bundled-blueprints/';
  const idx = key.indexOf(marker);
  if (idx < 0) {
    throw new Error(`Unexpected bundled blueprint glob key: ${key}`);
  }
  return key.slice(idx + marker.length);
}

const manifestPaths = Object.keys(blueprintLoaders).map(relativePathFromGlobKey).sort();

function installBundledBlueprintFetchStub() {
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
      if (relativePath === 'manifest.json') {
        return new Response(JSON.stringify(manifestPaths), { status: 200 });
      }
      const globKey = Object.keys(blueprintLoaders).find(
        key => relativePathFromGlobKey(key) === relativePath
      );
      if (!globKey) {
        throw new Error(`Bundled blueprint not found in test fixtures: ${relativePath}`);
      }
      const content = await blueprintLoaders[globKey]!();
      return new Response(content, { status: 200 });
    })
  );
}

describe('BundledSampleWorkspaceAdapter', () => {
  beforeAll(() => {
    window.location.href = 'http://localhost:5188/';
    installBundledBlueprintFetchStub();
  });

  afterEach(() => {
    vi.resetModules();
  });

  it('loads checked-in blueprints from the repo root', async () => {
    const { BundledSampleWorkspaceAdapter } = await import('./bundledSampleWorkspace');
    const files = await BundledSampleWorkspaceAdapter.readDirectoryFiles();
    expect(files.length).toBeGreaterThan(100);
    expect(files.some(f => f.name === GOLDEN_PATHS_CONTEXT_PATH)).toBe(true);
    expect(files.some(f => f.name === 'blueprint/context.yaml')).toBe(true);
    expect(files.some(f => f.name === 'backstage/context.yaml')).toBe(true);
  });

  it('reads a single blueprint file by relative path', async () => {
    const { BundledSampleWorkspaceAdapter } = await import('./bundledSampleWorkspace');
    const content = await BundledSampleWorkspaceAdapter.readFile('backstage/context.yaml');
    expect(content).toContain('entityRef: backstage');
  });

  it('rejects non-blueprint source paths so callers can fall back to git raw', async () => {
    const { BundledSampleWorkspaceAdapter } = await import('./bundledSampleWorkspace');
    await expect(
      BundledSampleWorkspaceAdapter.readFile('app/packages/designer/src/foo.ts')
    ).rejects.toThrow(/only contains blueprint/i);
  });
});

describe('BundledSampleWorkspaceAdapter fetch resilience', () => {
  const tinyManifest = ['demo/context.yaml', 'demo/containers.yaml'];
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
    let manifestAttempts = 0;
    vi.stubGlobal(
      'fetch',
      vi.fn(async (input: RequestInfo | URL) => {
        const relativePath = relativeFromUrl(input);
        if (relativePath === 'manifest.json') {
          manifestAttempts += 1;
          if (manifestAttempts < 3) {
            throw new TypeError('Failed to fetch');
          }
          return new Response(JSON.stringify(tinyManifest), { status: 200 });
        }
        return new Response(yamlByPath[relativePath], { status: 200 });
      })
    );

    const { BundledSampleWorkspaceAdapter } = await import('./bundledSampleWorkspace');
    const files = await BundledSampleWorkspaceAdapter.readDirectoryFiles();
    expect(files.map(f => f.name)).toEqual([...tinyManifest].sort((a, b) => a.localeCompare(b)));
    expect(manifestAttempts).toBe(3);
  });

  it('clears a failed manifest cache so a later retry can succeed', async () => {
    let manifestAttempts = 0;
    vi.stubGlobal(
      'fetch',
      vi.fn(async (input: RequestInfo | URL) => {
        const relativePath = relativeFromUrl(input);
        if (relativePath === 'manifest.json') {
          manifestAttempts += 1;
          // Exhaust the first open's retry budget, then allow the next open to succeed.
          if (manifestAttempts <= 3) {
            throw new TypeError('Failed to fetch');
          }
          return new Response(JSON.stringify(tinyManifest), { status: 200 });
        }
        return new Response(yamlByPath[relativePath], { status: 200 });
      })
    );

    const { BundledSampleWorkspaceAdapter } = await import('./bundledSampleWorkspace');
    await expect(BundledSampleWorkspaceAdapter.readDirectoryFiles()).rejects.toThrow(
      /Failed to fetch sandbox blueprints/i
    );

    const files = await BundledSampleWorkspaceAdapter.readDirectoryFiles();
    expect(files).toHaveLength(2);
    expect(manifestAttempts).toBe(4);
  });

  it('limits concurrent blueprint downloads', async () => {
    let inFlight = 0;
    let maxInFlight = 0;
    vi.stubGlobal(
      'fetch',
      vi.fn(async (input: RequestInfo | URL) => {
        const relativePath = relativeFromUrl(input);
        if (relativePath === 'manifest.json') {
          const many = Array.from({ length: 40 }, (_, i) => `demo/file-${i}.yaml`);
          return new Response(JSON.stringify(many), { status: 200 });
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

    const { BundledSampleWorkspaceAdapter, BUNDLED_BLUEPRINT_FETCH_CONCURRENCY } =
      await import('./bundledSampleWorkspace');
    await BundledSampleWorkspaceAdapter.readDirectoryFiles();
    expect(maxInFlight).toBeLessThanOrEqual(BUNDLED_BLUEPRINT_FETCH_CONCURRENCY);
    expect(maxInFlight).toBeGreaterThan(1);
  });
});
