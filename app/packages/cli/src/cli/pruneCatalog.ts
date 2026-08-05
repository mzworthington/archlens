import {
  planAndOptionallyPruneRemoteCatalog,
  type ObjectStoragePort,
  type PruneRemoteCatalogResult,
} from '@archlens/storage';
import type { CatalogPruneCliPlan } from './parseArchlensArgv.ts';

export type PruneCatalogDeps = {
  resolveStorage: (plan: CatalogPruneCliPlan) => ObjectStoragePort | null;
  now?: () => Date;
};

export type PruneCatalogOutcome =
  { kind: 'storage-not-configured' } | { kind: 'completed'; result: PruneRemoteCatalogResult };

export async function runPruneCatalog(
  plan: CatalogPruneCliPlan,
  deps: PruneCatalogDeps
): Promise<PruneCatalogOutcome> {
  const storage = deps.resolveStorage(plan);
  if (!storage) return { kind: 'storage-not-configured' };

  const result = await planAndOptionallyPruneRemoteCatalog(storage, {
    dryRun: plan.dryRun,
    now: (deps.now ?? (() => new Date()))(),
    policy: {
      keepSnapshotCount: plan.keepSnapshotCount,
      keepSnapshotDays: plan.keepSnapshotDays,
      keepFragmentRunsPerKey: plan.keepFragmentRuns,
    },
  });

  return { kind: 'completed', result };
}
