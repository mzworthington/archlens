import { describe, expect, it } from 'vitest';
import type { WorkspaceCatalogEntry } from '@archlens/core';
import {
  GOLDEN_JOURNEY_CONTAINERS_PATH,
  GOLDEN_PATHS_CONTEXT_PATH,
  selectBundledSampleEntryPath,
} from './goldenPathsSample';

describe('selectBundledSampleEntryPath', () => {
  it('prefers golden-journey containers when present', () => {
    const catalog: WorkspaceCatalogEntry[] = [
      {
        path: GOLDEN_PATHS_CONTEXT_PATH,
        name: 'Context',
        level: 'context',
        entityRef: 'golden-paths',
        nodeEntityRefs: [],
      },
      {
        path: GOLDEN_JOURNEY_CONTAINERS_PATH,
        name: 'Estate',
        level: 'container',
        entityRef: 'golden-paths/golden-journey',
        nodeEntityRefs: [],
      },
      {
        path: 'other/context.yaml',
        name: 'Other',
        level: 'context',
        entityRef: 'other',
        nodeEntityRefs: [],
      },
    ];
    expect(selectBundledSampleEntryPath(catalog)).toBe(GOLDEN_JOURNEY_CONTAINERS_PATH);
  });

  it('falls back to context then first entry', () => {
    expect(
      selectBundledSampleEntryPath([
        {
          path: 'foo/containers.yaml',
          name: 'Foo',
          level: 'container',
          entityRef: 'foo',
          nodeEntityRefs: [],
        },
        {
          path: 'bar/context.yaml',
          name: 'Bar',
          level: 'context',
          entityRef: 'bar',
          nodeEntityRefs: [],
        },
      ])
    ).toBe('bar/context.yaml');

    expect(
      selectBundledSampleEntryPath([
        {
          path: 'only.yaml',
          name: 'Only',
          level: 'component',
          entityRef: 'only',
          nodeEntityRefs: [],
        },
      ])
    ).toBe('only.yaml');
  });

  it('throws when catalog is empty', () => {
    expect(() => selectBundledSampleEntryPath([])).toThrow(/no diagrams/i);
  });
});
