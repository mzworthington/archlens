import path from 'node:path';
import { validateBlueprintWorkspace } from '@archlens/core';
import { NodeFileSystemAdapter } from '../analysis/adapters/nodeFileSystem.ts';
import { ConsoleLogger } from '../analysis/adapters/consoleLogger.ts';
import type { ValidateCliPlan } from './parseArchlensArgv.ts';
import { loadBlueprintTree } from './blueprintLoader.ts';
import { formatValidationResult } from './formatValidationResult.ts';

export async function executeValidateRun(plan: ValidateCliPlan): Promise<void> {
  const rootDir = path.resolve(process.cwd(), plan.targetPath);
  const fileSystem = new NodeFileSystemAdapter();
  const logger = new ConsoleLogger();

  logger.info(`Validating blueprints under ${rootDir}…`);

  const { files, parseErrors } = await loadBlueprintTree(rootDir, fileSystem);
  const result = validateBlueprintWorkspace(
    files.map(file => ({ path: file.relativePath, schema: file.schema }))
  );

  process.stdout.write(formatValidationResult(result, parseErrors, plan.format));

  const isValid = result.isValid && parseErrors.length === 0 && files.length > 0;
  if (files.length === 0 && parseErrors.length === 0) {
    logger.warn(`No blueprint schemas found under ${rootDir}.`);
    process.exit(1);
  }

  process.exit(isValid ? 0 : 1);
}
