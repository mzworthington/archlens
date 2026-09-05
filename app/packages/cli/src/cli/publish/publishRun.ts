import path from 'node:path';
import { NodeFileSystemAdapter } from '../../analysis/adapters/nodeFileSystem.ts';
import { ConsoleLogger } from '../../analysis/adapters/consoleLogger.ts';
import type { PublishCliPlan } from '../parseArchlensArgv.ts';
import { loadBlueprintTree } from '../blueprintLoader.ts';
import { formatValidationResult } from '../format/formatValidationResult.ts';
import {
  formatPublishDryRunResult,
  formatPublishUploadResult,
} from '../format/formatPublishDryRunResult.ts';
import { resolvePublishObjectStorage } from './publishRemoteCatalog.ts';
import { runPublishCatalog } from './publishCatalog.ts';

export async function executePublishRun(plan: PublishCliPlan): Promise<void> {
  const rootDir = path.resolve(process.cwd(), plan.targetPath);
  const fileSystem = new NodeFileSystemAdapter();
  const logger = new ConsoleLogger();

  logger.info(`Planning remote catalog publish for ${rootDir}…`);

  const outcome = await runPublishCatalog(plan, {
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
    resolveStorage: resolvePublishObjectStorage,
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
      logger.error('Publish skipped because blueprint validation failed.');
      process.exit(1);
      return;
    case 'dry-run':
      process.stdout.write(formatPublishDryRunResult(outcome.result, plan.format));
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
        `Uploaded remote catalog snapshot ${outcome.result.revisionId} (${outcome.result.upload.uploadedObjects} objects).`
      );
      process.stdout.write(formatPublishUploadResult(outcome.result, plan.format));
      process.exit(0);
      return;
  }
}
