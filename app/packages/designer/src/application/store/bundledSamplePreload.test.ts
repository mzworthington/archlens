import { describe, expect, it } from 'vitest';
import { BUNDLED_PRELOAD_PREFIXES, listBundledPreloadPaths } from './bundledSamplePreload';

describe('listBundledPreloadPaths', () => {
  it('keeps golden-journey and stress estates only', () => {
    const paths = listBundledPreloadPaths([
      { path: 'golden-journey/context.yaml' },
      { path: 'backstage/context.yaml' },
      { path: 'chaoslens-stress/large-graph-containers.yaml' },
      { path: 'packages/containers.yaml' },
      { path: 'advicelens-stress/containers.yaml' },
      { path: 'plugins/foo-components.yaml' },
    ]);

    expect(paths).toEqual([
      'golden-journey/context.yaml',
      'chaoslens-stress/large-graph-containers.yaml',
      'advicelens-stress/containers.yaml',
    ]);
  });

  it('returns empty when catalog has no preload estates', () => {
    expect(listBundledPreloadPaths([{ path: 'backstage/context.yaml' }])).toEqual([]);
  });

  it('documents the three demo estates (no separate archlens stress tree)', () => {
    expect([...BUNDLED_PRELOAD_PREFIXES]).toEqual([
      'golden-journey/',
      'chaoslens-stress/',
      'advicelens-stress/',
    ]);
  });
});
