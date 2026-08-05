import type { ObjectStoragePort } from '@archlens/storage';
import { ConsoleLogger } from '../analysis/adapters/consoleLogger.ts';
import type { CatalogPruneCliPlan } from './parseArchlensArgv.ts';
import { resolvePublishObjectStorage } from './publishRemoteCatalog.ts';
import { runPruneCatalog } from './pruneCatalog.ts';

export async function executePruneCatalogRun(plan: CatalogPruneCliPlan): Promise<void> {
  const logger = new ConsoleLogger();
  logger.info(
    `Planning catalog prune for estate "${plan.estateId}" (prefix ${plan.keyPrefix}; keep snapshots=${plan.keepSnapshotCount}/days=${plan.keepSnapshotDays}, fragment runs=${plan.keepFragmentRuns})…`
  );

  const outcome = await runPruneCatalog(plan, {
    resolveStorage: (prunePlan): ObjectStoragePort | null =>
      resolvePublishObjectStorage({
        provider: prunePlan.storageProvider,
        bucket: prunePlan.bucket,
        accountId: prunePlan.accountId,
        keyPrefix: prunePlan.keyPrefix,
      }),
  });

  switch (outcome.kind) {
    case 'storage-not-configured':
      logger.error(
        'Object storage is not configured. Set OBJECT_STORAGE_PROVIDER and provider credentials (see docs/cloudflare-secrets.md).'
      );
      process.exit(1);
      return;
    case 'completed': {
      const { result } = outcome;
      const summary = {
        dryRun: result.dryRun,
        latestRevision: result.latestRevision,
        keepSnapshotRevisions: result.plan.keepSnapshotRevisions,
        deleteSnapshotRevisions: result.plan.deleteSnapshotRevisions,
        keepFragmentRuns: result.plan.keepFragmentRuns,
        deleteFragmentRuns: result.plan.deleteFragmentRuns,
        deleteKeyCount: result.plan.deleteKeys.length,
        deletedKeyCount: result.deletedKeys.length,
        protectedKeyCount: result.plan.protectedKeyCount,
        deleteKeys: plan.format === 'json' ? result.plan.deleteKeys : undefined,
      };
      if (plan.format === 'json') {
        process.stdout.write(`${JSON.stringify(summary, null, 2)}\n`);
      } else {
        logger.info(
          `${result.dryRun ? 'Would delete' : 'Deleted'} ${result.plan.deleteKeys.length} object(s); ` +
            `keeping ${result.plan.keepSnapshotRevisions.length} snapshot(s) and ${result.plan.keepFragmentRuns.length} fragment run(s).`
        );
        if (result.plan.deleteSnapshotRevisions.length > 0) {
          logger.info(`Snapshots to drop: ${result.plan.deleteSnapshotRevisions.join(', ')}`);
        }
        if (result.plan.deleteFragmentRuns.length > 0) {
          logger.info(
            `Fragment runs to drop: ${result.plan.deleteFragmentRuns
              .map(run => `${run.fragmentKey}/${run.runId}`)
              .join(', ')}`
          );
        }
      }
      process.exit(0);
      return;
    }
  }
}
