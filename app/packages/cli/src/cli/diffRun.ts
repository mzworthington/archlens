import path from 'node:path';
import { compareBlueprintTrees, blueprintTreeDiffHasChanges } from '@archlens/core';
import { NodeFileSystemAdapter } from '../analysis/adapters/nodeFileSystem.ts';
import { ConsoleLogger } from '../analysis/adapters/consoleLogger.ts';
import type { DiffCliPlan } from './parseArchlensArgv.ts';
import { loadBlueprintTree } from './blueprintLoader.ts';
import { formatBlueprintTreeDiff } from './format/formatBlueprintTreeDiff.ts';

export async function executeDiffRun(plan: DiffCliPlan): Promise<void> {
  const baselineDir = path.resolve(process.cwd(), plan.baselinePath);
  const currentDir = path.resolve(process.cwd(), plan.currentPath);
  const fileSystem = new NodeFileSystemAdapter();
  const logger = new ConsoleLogger();

  logger.info(`Comparing blueprint trees:\n  baseline: ${baselineDir}\n  current:  ${currentDir}`);

  const [baseline, current] = await Promise.all([
    loadBlueprintTree(baselineDir, fileSystem),
    loadBlueprintTree(currentDir, fileSystem),
  ]);

  if (baseline.parseErrors.length > 0 || current.parseErrors.length > 0) {
    for (const error of [...baseline.parseErrors, ...current.parseErrors]) {
      logger.error(`Failed to parse ${error.path}`, error.message);
    }
    process.exit(1);
  }

  if (baseline.files.length === 0 && current.files.length === 0) {
    logger.warn('No blueprint schemas found in either tree.');
    process.exit(1);
  }

  const treeDiff = compareBlueprintTrees(
    baseline.files.map(file => ({ relativePath: file.relativePath, schema: file.schema })),
    current.files.map(file => ({ relativePath: file.relativePath, schema: file.schema }))
  );

  process.stdout.write(formatBlueprintTreeDiff(treeDiff, plan.format));
  process.exit(blueprintTreeDiffHasChanges(treeDiff) ? 1 : 0);
}
