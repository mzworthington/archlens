import { describe, expect, it } from 'vitest';
import {
  DEFAULT_CATALOG_PRUNE_POLICY,
  groupCatalogKeysForPrune,
  planCatalogPrune,
  type CatalogPruneInput,
} from './catalogPrune';

function input(
  partial: Partial<CatalogPruneInput> & Pick<CatalogPruneInput, 'objectKeys'>
): CatalogPruneInput {
  return {
    latestRevision: partial.latestRevision ?? null,
    snapshots: partial.snapshots ?? [],
    fragmentRuns: partial.fragmentRuns ?? [],
    objectKeys: partial.objectKeys,
    policy: partial.policy ?? DEFAULT_CATALOG_PRUNE_POLICY,
    now: partial.now ?? new Date('2026-08-05T12:00:00.000Z'),
  };
}

describe('Feature: catalog prune planning', () => {
  it('groups snapshot and fragment keys and leaves latest/overlays alone', () => {
    const grouped = groupCatalogKeysForPrune([
      'latest/manifest.json',
      'overlays/add-x.yaml',
      'snapshots/rev-a/manifest.json',
      'snapshots/rev-a/catalog.json',
      'snapshots/rev-a/app/context.yaml',
      'fragments/archlens/run-1/manifest.json',
      'fragments/archlens/run-1/files/context.yaml',
      'fragments/samples/run-9/manifest.json',
    ]);

    expect([...grouped.snapshotKeysByRevision.keys()].sort()).toEqual(['rev-a']);
    expect(grouped.snapshotKeysByRevision.get('rev-a')).toEqual([
      'snapshots/rev-a/app/context.yaml',
      'snapshots/rev-a/catalog.json',
      'snapshots/rev-a/manifest.json',
    ]);
    expect([...grouped.fragmentKeysByRun.keys()].sort()).toEqual([
      'archlens/run-1',
      'samples/run-9',
    ]);
    expect(grouped.protectedKeys).toEqual(['latest/manifest.json', 'overlays/add-x.yaml']);
  });

  it('always keeps the latest revision even when older than the day window', () => {
    const plan = planCatalogPrune(
      input({
        latestRevision: 'rev-live',
        snapshots: [
          { revisionId: 'rev-live', publishedAt: '2026-01-02T00:00:00.000Z' },
          { revisionId: 'rev-old', publishedAt: '2026-01-01T00:00:00.000Z' },
        ],
        objectKeys: [
          'latest/manifest.json',
          'snapshots/rev-live/manifest.json',
          'snapshots/rev-live/catalog.json',
          'snapshots/rev-old/manifest.json',
          'snapshots/rev-old/catalog.json',
        ],
        policy: { keepSnapshotCount: 1, keepSnapshotDays: 1, keepFragmentRunsPerKey: 2 },
      })
    );

    expect(plan.keepSnapshotRevisions).toEqual(['rev-live']);
    expect(plan.deleteSnapshotRevisions).toEqual(['rev-old']);
    expect(plan.deleteKeys).toEqual([
      'snapshots/rev-old/catalog.json',
      'snapshots/rev-old/manifest.json',
    ]);
    expect(plan.deleteKeys).not.toContain('latest/manifest.json');
  });

  it('keeps snapshots that are within the day window even beyond count', () => {
    const plan = planCatalogPrune(
      input({
        latestRevision: 'rev-7',
        snapshots: [
          { revisionId: 'rev-1', publishedAt: '2026-08-04T10:00:00.000Z' },
          { revisionId: 'rev-2', publishedAt: '2026-08-04T11:00:00.000Z' },
          { revisionId: 'rev-3', publishedAt: '2026-08-04T12:00:00.000Z' },
          { revisionId: 'rev-4', publishedAt: '2026-08-04T13:00:00.000Z' },
          { revisionId: 'rev-5', publishedAt: '2026-08-04T14:00:00.000Z' },
          { revisionId: 'rev-6', publishedAt: '2026-08-04T15:00:00.000Z' },
          { revisionId: 'rev-7', publishedAt: '2026-08-05T10:00:00.000Z' },
          { revisionId: 'rev-ancient', publishedAt: '2026-07-01T00:00:00.000Z' },
        ],
        objectKeys: [
          'snapshots/rev-1/manifest.json',
          'snapshots/rev-2/manifest.json',
          'snapshots/rev-3/manifest.json',
          'snapshots/rev-4/manifest.json',
          'snapshots/rev-5/manifest.json',
          'snapshots/rev-6/manifest.json',
          'snapshots/rev-7/manifest.json',
          'snapshots/rev-ancient/manifest.json',
        ],
        policy: { keepSnapshotCount: 3, keepSnapshotDays: 14, keepFragmentRunsPerKey: 2 },
      })
    );

    expect(plan.keepSnapshotRevisions.sort()).toEqual([
      'rev-1',
      'rev-2',
      'rev-3',
      'rev-4',
      'rev-5',
      'rev-6',
      'rev-7',
    ]);
    expect(plan.deleteSnapshotRevisions).toEqual(['rev-ancient']);
  });

  it('keeps only the newest N fragment runs per fragmentKey', () => {
    const plan = planCatalogPrune(
      input({
        latestRevision: null,
        fragmentRuns: [
          {
            fragmentKey: 'archlens',
            runId: '2026-08-01T00-00-00.000Z',
            publishedAt: '2026-08-01T00:00:00.000Z',
          },
          {
            fragmentKey: 'archlens',
            runId: '2026-08-03T00-00-00.000Z',
            publishedAt: '2026-08-03T00:00:00.000Z',
          },
          {
            fragmentKey: 'archlens',
            runId: '2026-08-05T00-00-00.000Z',
            publishedAt: '2026-08-05T00:00:00.000Z',
          },
          {
            fragmentKey: 'samples',
            runId: 'only',
            publishedAt: '2026-07-01T00:00:00.000Z',
          },
        ],
        objectKeys: [
          'fragments/archlens/2026-08-01T00-00-00.000Z/manifest.json',
          'fragments/archlens/2026-08-01T00-00-00.000Z/files/a.yaml',
          'fragments/archlens/2026-08-03T00-00-00.000Z/manifest.json',
          'fragments/archlens/2026-08-05T00-00-00.000Z/manifest.json',
          'fragments/samples/only/manifest.json',
          'fragments/samples/only/files/b.yaml',
        ],
        policy: { keepSnapshotCount: 7, keepSnapshotDays: 14, keepFragmentRunsPerKey: 2 },
      })
    );

    expect(plan.keepFragmentRuns).toEqual([
      { fragmentKey: 'archlens', runId: '2026-08-05T00-00-00.000Z' },
      { fragmentKey: 'archlens', runId: '2026-08-03T00-00-00.000Z' },
      { fragmentKey: 'samples', runId: 'only' },
    ]);
    expect(plan.deleteFragmentRuns).toEqual([
      { fragmentKey: 'archlens', runId: '2026-08-01T00-00-00.000Z' },
    ]);
    expect(plan.deleteKeys).toEqual([
      'fragments/archlens/2026-08-01T00-00-00.000Z/files/a.yaml',
      'fragments/archlens/2026-08-01T00-00-00.000Z/manifest.json',
    ]);
  });

  it('never schedules latest or overlays for deletion', () => {
    const plan = planCatalogPrune(
      input({
        latestRevision: 'rev-a',
        snapshots: [{ revisionId: 'rev-a', publishedAt: '2026-08-05T00:00:00.000Z' }],
        objectKeys: [
          'latest/manifest.json',
          'overlays/keep-me.yaml',
          'snapshots/rev-a/manifest.json',
        ],
      })
    );

    expect(plan.deleteKeys).toEqual([]);
    expect(plan.protectedKeyCount).toBe(2);
  });
});
