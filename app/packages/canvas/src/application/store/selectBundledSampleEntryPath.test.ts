import { describe, expect, it } from 'vitest';
import type { WorkspaceCatalogEntry } from '@archlens/core';
import {
  GOLDEN_JOURNEY_CONTAINERS_PATH,
  SAMPLES_CONTEXT_PATH,
  selectBundledSampleEntryPath,
} from './samplesWorkspace';

describe('selectBundledSampleEntryPath', () => {
  it('prefers samples context when present', () => {
    const catalog: WorkspaceCatalogEntry[] = [
      {
        path: SAMPLES_CONTEXT_PATH,
        name: 'Context',
        level: 'context',
        entityRef: 'samples',
        nodeEntityRefs: [],
      },
      {
        path: GOLDEN_JOURNEY_CONTAINERS_PATH,
        name: 'Estate',
        level: 'container',
        entityRef: 'samples/golden-journey',
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
    expect(selectBundledSampleEntryPath(catalog)).toBe(SAMPLES_CONTEXT_PATH);
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
