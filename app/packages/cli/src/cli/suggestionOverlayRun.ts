import type { ObjectStoragePort } from '@archlens/storage';
import { ConsoleLogger } from '../analysis/adapters/consoleLogger.ts';
import type {
  CatalogAcceptOverlayCliPlan,
  CatalogRejectOverlayCliPlan,
} from './parseArchlensArgv.ts';
import { resolvePublishObjectStorage } from './publish/publishRemoteCatalog.ts';
import {
  readOverlayFileFromDisk,
  runAcceptOverlay,
  runRejectOverlay,
} from './suggestionOverlayCommands.ts';

export async function executeAcceptOverlayRun(plan: CatalogAcceptOverlayCliPlan): Promise<void> {
  const logger = new ConsoleLogger();
  logger.info(`Accepting suggestion overlay from ${plan.overlayFile}…`);

  const outcome = await runAcceptOverlay(plan, {
    readOverlayFile: readOverlayFileFromDisk,
    resolveStorage: (acceptPlan): ObjectStoragePort | null =>
      resolvePublishObjectStorage({
        provider: acceptPlan.storageProvider,
        bucket: acceptPlan.bucket,
        accountId: acceptPlan.accountId,
        keyPrefix: acceptPlan.keyPrefix,
      }),
  });

  switch (outcome.kind) {
    case 'storage-not-configured':
      logger.error(
        'Object storage is not configured. Set OBJECT_STORAGE_PROVIDER and provider credentials (see docs/cloudflare-secrets.md).'
      );
      process.exit(1);
      return;
    case 'estate-mismatch':
      logger.error(
        `Overlay estateId "${outcome.overlayEstateId}" does not match --estate=${plan.estateId}.`
      );
      process.exit(1);
      return;
    case 'dry-run':
      process.stdout.write(
        `${JSON.stringify(
          {
            dryRun: true,
            overlayId: outcome.overlay.overlayId,
            estateId: outcome.overlay.estateId,
            kind: outcome.overlay.kind,
            targetPath: outcome.overlay.targetPath,
            keyPrefix: plan.keyPrefix,
          },
          null,
          2
        )}\n`
      );
      process.exit(0);
      return;
    case 'uploaded':
      logger.info(`Uploaded overlay ${outcome.result.overlayId} → ${outcome.result.key}`);
      process.stdout.write(`${JSON.stringify({ dryRun: false, ...outcome.result }, null, 2)}\n`);
      process.exit(0);
      return;
  }
}

export async function executeRejectOverlayRun(plan: CatalogRejectOverlayCliPlan): Promise<void> {
  const logger = new ConsoleLogger();
  logger.info(`Rejecting suggestion overlay ${plan.overlayId}…`);

  const outcome = await runRejectOverlay(plan, {
    resolveStorage: (rejectPlan): ObjectStoragePort | null =>
      resolvePublishObjectStorage({
        provider: rejectPlan.storageProvider,
        bucket: rejectPlan.bucket,
        accountId: rejectPlan.accountId,
        keyPrefix: rejectPlan.keyPrefix,
      }),
  });

  switch (outcome.kind) {
    case 'storage-not-configured':
      logger.error(
        'Object storage is not configured. Set OBJECT_STORAGE_PROVIDER and provider credentials (see docs/cloudflare-secrets.md).'
      );
      process.exit(1);
      return;
    case 'dry-run':
      process.stdout.write(
        `${JSON.stringify(
          { dryRun: true, overlayId: outcome.overlayId, keyPrefix: plan.keyPrefix },
          null,
          2
        )}\n`
      );
      process.exit(0);
      return;
    case 'rejected':
      logger.info(`Tombstoned overlay ${outcome.result.overlayId} → ${outcome.result.key}`);
      process.stdout.write(`${JSON.stringify({ dryRun: false, ...outcome.result }, null, 2)}\n`);
      process.exit(0);
      return;
  }
}
