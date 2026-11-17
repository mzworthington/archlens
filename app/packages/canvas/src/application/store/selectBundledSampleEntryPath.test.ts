import { describe, expect, it } from 'vitest';
import type { WorkspaceCatalogEntry } from '@archlens/core';
import {
  GOLDEN_JOURNEY_CONTAINERS_PATH,
  GOLDEN_JOURNEY_CONTEXT_PATH,
  GOLDEN_JOURNEY_ENTITY_REF,
  SAMPLES_CONTEXT_PATH,
  SAMPLES_ENTITY_REF,
  resolveDemoLandingEntityRef,
  selectBundledSampleEntryPath,
} from './samplesWorkspace';

describe('selectBundledSampleEntryPath', () => {
  it('prefers ArchLens context when present', () => {
    const catalog: WorkspaceCatalogEntry[] = [
      {
        path: SAMPLES_CONTEXT_PATH,
        name: 'ArchLens',
        level: 'context',
        entityRef: 'archlens',
        nodeEntityRefs: [],
      },
      {
        path: GOLDEN_JOURNEY_CONTEXT_PATH,
        name: 'Samples',
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

  it('falls back to golden-journey when ArchLens is absent', () => {
    expect(
      selectBundledSampleEntryPath([
        {
          path: GOLDEN_JOURNEY_CONTEXT_PATH,
          name: 'Samples',
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
      ])
    ).toBe(GOLDEN_JOURNEY_CONTEXT_PATH);
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

describe('resolveDemoLandingEntityRef', () => {
  it('returns ArchLens when the catalog includes it', () => {
    expect(
      resolveDemoLandingEntityRef(
        [
          {
            path: SAMPLES_CONTEXT_PATH,
            name: 'ArchLens',
            level: 'context',
            entityRef: SAMPLES_ENTITY_REF,
            nodeEntityRefs: [],
          },
          {
            path: GOLDEN_JOURNEY_CONTEXT_PATH,
            name: 'Samples',
            level: 'context',
            entityRef: 'samples',
            nodeEntityRefs: [],
          },
        ],
        'samples'
      )
    ).toBe(SAMPLES_ENTITY_REF);
  });

  it('uses the opened diagram when ArchLens is absent', () => {
    expect(
      resolveDemoLandingEntityRef(
        [
          {
            path: GOLDEN_JOURNEY_CONTEXT_PATH,
            name: 'Samples',
            level: 'context',
            entityRef: 'samples',
            nodeEntityRefs: [],
          },
        ],
        'samples'
      )
    ).toBe('samples');
  });

  it('falls back to golden-journey when nothing else is available', () => {
    expect(resolveDemoLandingEntityRef([])).toBe(GOLDEN_JOURNEY_ENTITY_REF);
  });
});
