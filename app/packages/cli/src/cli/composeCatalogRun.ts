import { ObjectStoragePreconditionFailedError, type ObjectStoragePort } from '@archlens/storage';
import { ConsoleLogger } from '../analysis/adapters/consoleLogger.ts';
import type { CatalogComposeCliPlan } from './parseArchlensArgv.ts';
import { resolvePublishObjectStorage } from './publishRemoteCatalog.ts';
import { runComposeCatalog } from './composeCatalog.ts';
import {
  formatPublishDryRunResult,
  formatPublishUploadResult,
} from './formatPublishDryRunResult.ts';
import { formatValidationResult } from './formatValidationResult.ts';

export async function executeComposeCatalogRun(plan: CatalogComposeCliPlan): Promise<void> {
  const logger = new ConsoleLogger();
  logger.info(`Composing estate catalog for ${plan.estateId} (prefix ${plan.keyPrefix})…`);

  const outcome = await runComposeCatalog(plan, {
    resolveStorage: (composePlan): ObjectStoragePort | null =>
      resolvePublishObjectStorage({
        provider: composePlan.storageProvider,
        bucket: composePlan.bucket,
        accountId: composePlan.accountId,
        keyPrefix: composePlan.keyPrefix,
      }),
  });

  switch (outcome.kind) {
    case 'storage-not-configured':
      logger.error(
        'Object storage is not configured. Set OBJECT_STORAGE_PROVIDER and provider credentials (see docs/cloudflare-secrets.md).'
      );
      process.exit(1);
      return;
    case 'no-fragments':
      if (plan.allowEmpty) {
        logger.info(
          `No fragments for estate "${plan.estateId}" — skipping compose (--allow-empty).`
        );
        process.exit(0);
        return;
      }
      logger.error(
        `No fragments found for estate "${plan.estateId}" under fragments/. Publish fragments first with archlens catalog publish-fragment.`
      );
      process.exit(1);
      return;
    case 'validation-failed':
      process.stdout.write(
        formatValidationResult(outcome.validation, outcome.parseErrors, plan.format)
      );
      logger.error('Compose skipped because blueprint validation failed.');
      process.exit(1);
      return;
    case 'dry-run':
      if (plan.format === 'json') {
        process.stdout.write(
          `${JSON.stringify(
            {
              ...outcome.result,
              contributors: outcome.contributors,
              appliedOverlays: outcome.appliedOverlays.map(o => o.overlayId),
            },
            null,
            2
          )}\n`
        );
      } else {
        process.stdout.write(formatPublishDryRunResult(outcome.result, plan.format));
        logger.info(
          `Contributors: ${outcome.contributors.map(c => `${c.fragmentKey}@${c.runId}`).join(', ')}`
        );
        if (outcome.appliedOverlays.length > 0) {
          logger.info(`Overlays: ${outcome.appliedOverlays.map(o => o.overlayId).join(', ')}`);
        }
      }
      process.exit(0);
      return;
    case 'unchanged':
      logger.info(
        `Latest already at revision ${outcome.revisionId} from ${outcome.contributors.length} fragment(s)` +
          (outcome.appliedOverlays.length > 0
            ? ` + ${outcome.appliedOverlays.length} overlay(s)`
            : '') +
          ' — skipping snapshot upload.'
      );
      if (plan.format === 'json') {
        process.stdout.write(
          `${JSON.stringify(
            {
              dryRun: false,
              unchanged: true,
              revisionId: outcome.revisionId,
              contributors: outcome.contributors,
              appliedOverlays: outcome.appliedOverlays.map(o => o.overlayId),
            },
            null,
            2
          )}\n`
        );
      }
      process.exit(0);
      return;
    case 'uploaded':
      logger.info(
        `Composed revision ${outcome.result.revisionId} from ${outcome.contributors.length} fragment(s)` +
          (outcome.appliedOverlays.length > 0
            ? ` + ${outcome.appliedOverlays.length} overlay(s)`
            : '') +
          (outcome.reusedExistingSnapshot ? ' (reused existing snapshot)' : '') +
          ` (attempt ${outcome.attempts}).`
      );
      process.stdout.write(formatPublishUploadResult(outcome.result, plan.format));
      process.exit(0);
      return;
    case 'cas-conflict':
      logger.error(
        `Failed to update latest/manifest.json after ${outcome.attempts} compare-and-swap attempt(s) (${ObjectStoragePreconditionFailedError.name}).`
      );
      process.exit(1);
      return;
  }
}
