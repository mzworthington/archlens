import path from 'node:path';
import type { ObjectStoragePort } from '@archlens/storage';
import { NodeFileSystemAdapter } from '../analysis/adapters/nodeFileSystem.ts';
import { ConsoleLogger } from '../analysis/adapters/consoleLogger.ts';
import type { CatalogPublishFragmentCliPlan } from './parseArchlensArgv.ts';
import { loadBlueprintTree } from './blueprintLoader.ts';
import { formatValidationResult } from './formatValidationResult.ts';
import { resolvePublishObjectStorage } from './publishRemoteCatalog.ts';
import { runPublishFragment } from './publishFragment.ts';

export async function executePublishFragmentRun(
  plan: CatalogPublishFragmentCliPlan
): Promise<void> {
  const rootDir = path.resolve(process.cwd(), plan.targetPath);
  const fileSystem = new NodeFileSystemAdapter();
  const logger = new ConsoleLogger();

  logger.info(`Planning estate fragment publish for ${rootDir}…`);

  const outcome = await runPublishFragment(plan, {
    loadBlueprintTree: async targetPath => {
      const absoluteRoot = path.resolve(process.cwd(), targetPath);
      const loaded = await loadBlueprintTree(absoluteRoot, fileSystem);
      const files = await Promise.all(
        loaded.files.map(async file => ({
          relativePath: file.relativePath,
          schema: file.schema,
          content: await fileSystem.readSchema(file.path),
        }))
      );
      return { files, parseErrors: loaded.parseErrors };
    },
    resolveStorage: (fragmentPlan): ObjectStoragePort | null =>
      resolvePublishObjectStorage({
        provider: fragmentPlan.storageProvider,
        bucket: fragmentPlan.bucket,
        accountId: fragmentPlan.accountId,
        keyPrefix: fragmentPlan.keyPrefix,
      }),
  });

  switch (outcome.kind) {
    case 'empty-workspace':
      logger.warn(`No blueprint schemas found under ${rootDir}.`);
      process.exit(1);
      return;
    case 'validation-failed':
      process.stdout.write(
        formatValidationResult(outcome.validation, outcome.parseErrors, plan.format)
      );
      logger.error('Fragment publish skipped because blueprint validation failed.');
      process.exit(1);
      return;
    case 'dry-run':
      process.stdout.write(
        `${JSON.stringify(
          {
            dryRun: true,
            estateId: outcome.fragment.estateId,
            fragmentKey: outcome.fragment.fragmentKey,
            runId: outcome.fragment.runId,
            sourceRef: outcome.fragment.sourceRef,
            objectPaths: outcome.fragment.objectPaths,
            keyPrefix: plan.keyPrefix,
          },
          null,
          2
        )}\n`
      );
      process.exit(0);
      return;
    case 'storage-not-configured':
      logger.error(
        'Object storage is not configured. Set OBJECT_STORAGE_PROVIDER and provider credentials (see docs/cloudflare-secrets.md).'
      );
      process.exit(1);
      return;
    case 'uploaded':
      logger.info(
        `Uploaded fragment ${outcome.result.fragmentKey}/${outcome.result.runId} (${outcome.result.uploadedObjects} objects).`
      );
      process.stdout.write(
        `${JSON.stringify(
          {
            dryRun: false,
            ...outcome.result,
            sourceRef: outcome.fragment.sourceRef,
            objectPaths: outcome.fragment.objectPaths,
          },
          null,
          2
        )}\n`
      );
      process.exit(0);
      return;
  }
}
