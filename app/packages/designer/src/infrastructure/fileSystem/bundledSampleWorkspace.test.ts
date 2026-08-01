import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
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
});
