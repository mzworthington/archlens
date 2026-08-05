/**
 * Pure catalog retention planning (ADR-0010 snapshots + ADR-0014 fragments).
 * No I/O — callers list keys, read manifests, then delete planned keys.
 */

export type CatalogPrunePolicy = {
  /** Keep at least this many newest snapshot revisions (by publishedAt). */
  keepSnapshotCount: number;
  /** Also keep any snapshot published within this many days of `now`. */
  keepSnapshotDays: number;
  /** Keep this many newest runs per fragmentKey. */
  keepFragmentRunsPerKey: number;
};

export const DEFAULT_CATALOG_PRUNE_POLICY: CatalogPrunePolicy = {
  keepSnapshotCount: 7,
  keepSnapshotDays: 14,
  keepFragmentRunsPerKey: 2,
};

export type CatalogPruneSnapshotMeta = {
  revisionId: string;
  publishedAt: string;
};

export type CatalogPruneFragmentRunMeta = {
  fragmentKey: string;
  runId: string;
  publishedAt: string;
};

export type CatalogPruneInput = {
  latestRevision: string | null;
  snapshots: readonly CatalogPruneSnapshotMeta[];
  fragmentRuns: readonly CatalogPruneFragmentRunMeta[];
  objectKeys: readonly string[];
  policy: CatalogPrunePolicy;
  now: Date;
};

export type CatalogPrunePlan = {
  keepSnapshotRevisions: string[];
  deleteSnapshotRevisions: string[];
  keepFragmentRuns: Array<{ fragmentKey: string; runId: string }>;
  deleteFragmentRuns: Array<{ fragmentKey: string; runId: string }>;
  deleteKeys: string[];
  protectedKeyCount: number;
};

export type GroupedCatalogKeys = {
  snapshotKeysByRevision: Map<string, string[]>;
  fragmentKeysByRun: Map<string, string[]>;
  protectedKeys: string[];
};

const SNAPSHOT_KEY = /^snapshots\/([^/]+)\/(.*)$/;
const FRAGMENT_KEY = /^fragments\/([^/]+)\/([^/]+)\/(.*)$/;

function isProtectedKey(key: string): boolean {
  return key === 'latest/manifest.json' || key.startsWith('latest/') || key.startsWith('overlays/');
}

function fragmentRunMapKey(fragmentKey: string, runId: string): string {
  return `${fragmentKey}/${runId}`;
}

export function groupCatalogKeysForPrune(objectKeys: readonly string[]): GroupedCatalogKeys {
  const snapshotKeysByRevision = new Map<string, string[]>();
  const fragmentKeysByRun = new Map<string, string[]>();
  const protectedKeys: string[] = [];

  for (const key of [...objectKeys].sort((a, b) => a.localeCompare(b))) {
    if (isProtectedKey(key)) {
      protectedKeys.push(key);
      continue;
    }
    const snapshot = SNAPSHOT_KEY.exec(key);
    if (snapshot) {
      const revisionId = snapshot[1]!;
      const list = snapshotKeysByRevision.get(revisionId) ?? [];
      list.push(key);
      snapshotKeysByRevision.set(revisionId, list);
      continue;
    }
    const fragment = FRAGMENT_KEY.exec(key);
    if (fragment) {
      const runKey = fragmentRunMapKey(fragment[1]!, fragment[2]!);
      const list = fragmentKeysByRun.get(runKey) ?? [];
      list.push(key);
      fragmentKeysByRun.set(runKey, list);
    }
  }

  return { snapshotKeysByRevision, fragmentKeysByRun, protectedKeys };
}

function comparePublishedAtDesc(
  left: { publishedAt: string; tiebreak: string },
  right: { publishedAt: string; tiebreak: string }
): number {
  const byTime = right.publishedAt.localeCompare(left.publishedAt);
  if (byTime !== 0) return byTime;
  return right.tiebreak.localeCompare(left.tiebreak);
}

function isWithinDayWindow(publishedAt: string, now: Date, keepSnapshotDays: number): boolean {
  const publishedMs = Date.parse(publishedAt);
  if (!Number.isFinite(publishedMs)) return false;
  const windowMs = keepSnapshotDays * 24 * 60 * 60 * 1000;
  return now.getTime() - publishedMs <= windowMs;
}

/**
 * Decide which snapshot revisions and fragment runs to retain.
 * Keep set = latest revision ∪ newest `keepSnapshotCount` ∪ within `keepSnapshotDays`.
 * Fragment runs: newest `keepFragmentRunsPerKey` per fragmentKey (never delete a key's only run).
 */
export function planCatalogPrune(input: CatalogPruneInput): CatalogPrunePlan {
  const grouped = groupCatalogKeysForPrune(input.objectKeys);
  const policy = input.policy;

  const snapshotsById = new Map(input.snapshots.map(s => [s.revisionId, s]));
  for (const revisionId of grouped.snapshotKeysByRevision.keys()) {
    if (!snapshotsById.has(revisionId)) {
      snapshotsById.set(revisionId, {
        revisionId,
        publishedAt: '1970-01-01T00:00:00.000Z',
      });
    }
  }

  const rankedSnapshots = [...snapshotsById.values()].sort((a, b) =>
    comparePublishedAtDesc(
      { publishedAt: a.publishedAt, tiebreak: a.revisionId },
      { publishedAt: b.publishedAt, tiebreak: b.revisionId }
    )
  );

  const keepSnapshotRevisions = new Set<string>();
  if (input.latestRevision) {
    keepSnapshotRevisions.add(input.latestRevision);
  }
  for (const snapshot of rankedSnapshots.slice(0, Math.max(0, policy.keepSnapshotCount))) {
    keepSnapshotRevisions.add(snapshot.revisionId);
  }
  for (const snapshot of rankedSnapshots) {
    if (isWithinDayWindow(snapshot.publishedAt, input.now, policy.keepSnapshotDays)) {
      keepSnapshotRevisions.add(snapshot.revisionId);
    }
  }

  const deleteSnapshotRevisions = rankedSnapshots
    .map(s => s.revisionId)
    .filter(id => !keepSnapshotRevisions.has(id));

  const runsByFragment = new Map<string, CatalogPruneFragmentRunMeta[]>();
  const runsFromInput = new Map(
    input.fragmentRuns.map(run => [fragmentRunMapKey(run.fragmentKey, run.runId), run])
  );
  for (const runKey of grouped.fragmentKeysByRun.keys()) {
    const existing = runsFromInput.get(runKey);
    if (existing) {
      const list = runsByFragment.get(existing.fragmentKey) ?? [];
      list.push(existing);
      runsByFragment.set(existing.fragmentKey, list);
      continue;
    }
    const [fragmentKey, runId] = runKey.split('/') as [string, string];
    const synthesized: CatalogPruneFragmentRunMeta = {
      fragmentKey,
      runId,
      publishedAt: '1970-01-01T00:00:00.000Z',
    };
    const list = runsByFragment.get(fragmentKey) ?? [];
    list.push(synthesized);
    runsByFragment.set(fragmentKey, list);
  }

  const keepFragmentRuns: Array<{ fragmentKey: string; runId: string }> = [];
  const deleteFragmentRuns: Array<{ fragmentKey: string; runId: string }> = [];

  for (const [fragmentKey, runs] of [...runsByFragment.entries()].sort(([a], [b]) =>
    a.localeCompare(b)
  )) {
    const ranked = [...runs].sort((a, b) =>
      comparePublishedAtDesc(
        { publishedAt: a.publishedAt, tiebreak: a.runId },
        { publishedAt: b.publishedAt, tiebreak: b.runId }
      )
    );
    const keepCount = Math.max(1, policy.keepFragmentRunsPerKey);
    for (const [index, run] of ranked.entries()) {
      const ref = { fragmentKey, runId: run.runId };
      if (index < keepCount) keepFragmentRuns.push(ref);
      else deleteFragmentRuns.push(ref);
    }
  }

  const deleteKeys = new Set<string>();
  for (const revisionId of deleteSnapshotRevisions) {
    for (const key of grouped.snapshotKeysByRevision.get(revisionId) ?? []) {
      deleteKeys.add(key);
    }
  }
  for (const run of deleteFragmentRuns) {
    for (const key of grouped.fragmentKeysByRun.get(
      fragmentRunMapKey(run.fragmentKey, run.runId)
    ) ?? []) {
      deleteKeys.add(key);
    }
  }

  for (const key of grouped.protectedKeys) {
    deleteKeys.delete(key);
  }

  return {
    keepSnapshotRevisions: [...keepSnapshotRevisions].sort((a, b) => a.localeCompare(b)),
    deleteSnapshotRevisions,
    keepFragmentRuns,
    deleteFragmentRuns,
    deleteKeys: [...deleteKeys].sort((a, b) => a.localeCompare(b)),
    protectedKeyCount: grouped.protectedKeys.length,
  };
}
