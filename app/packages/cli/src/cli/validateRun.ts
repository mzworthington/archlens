import path from 'node:path';
import {
  assessArchitectureHealth,
  compareArchitectureHealth,
  validateBlueprintWorkspace,
} from '@archlens/core';
import { NodeFileSystemAdapter } from '../analysis/adapters/nodeFileSystem.ts';
import { ConsoleLogger } from '../analysis/adapters/consoleLogger.ts';
import type { ValidateCliPlan } from './parseArchlensArgv.ts';
import { loadBlueprintTree } from './blueprintLoader.ts';
import { formatArchitectureHealthResult } from './formatArchitectureHealth.ts';
import { findGitRoot } from './gitProcess.ts';
import { materializeGitBaselineBlueprints } from './materializeGitBaseline.ts';

export async function executeValidateRun(plan: ValidateCliPlan): Promise<void> {
  const rootDir = path.resolve(process.cwd(), plan.targetPath);
  const fileSystem = new NodeFileSystemAdapter();
  const logger = new ConsoleLogger();

  logger.info(`Checking architecture health under ${rootDir}…`);

  const { files, parseErrors } = await loadBlueprintTree(rootDir, fileSystem);
  if (files.length === 0 && parseErrors.length === 0) {
    logger.warn(`No blueprint schemas found under ${rootDir}.`);
    process.exit(1);
  }

  const loaded = files.map(file => ({ path: file.relativePath, schema: file.schema }));
  const report = assessArchitectureHealth(loaded);

  let baselineLabel: string | undefined;
  let regression = undefined;
  let baselineCleanup: (() => Promise<void>) | undefined;

  try {
    if (plan.baselinePath || plan.sinceCommit) {
      let baselineDir: string | undefined = plan.baselinePath
        ? path.resolve(process.cwd(), plan.baselinePath)
        : undefined;

      if (!baselineDir && plan.sinceCommit) {
        const repoRoot = await findGitRoot(process.cwd());
        const relativeBlueprints = path.relative(repoRoot, rootDir) || plan.targetPath;
        const materialization = await materializeGitBaselineBlueprints(
          repoRoot,
          plan.sinceCommit,
          relativeBlueprints
        );
        if (!materialization.ok) {
          logger.error(materialization.reason);
          process.exit(1);
        }
        baselineDir = materialization.directory;
        baselineCleanup = materialization.cleanup;
        baselineLabel = plan.sinceCommit;
      } else if (baselineDir) {
        baselineLabel = plan.baselinePath ?? baselineDir;
      }

      if (baselineDir) {
        const baselineTree = await loadBlueprintTree(baselineDir, fileSystem);
        const baselineReport = assessArchitectureHealth(
          baselineTree.files.map(file => ({ path: file.relativePath, schema: file.schema }))
        );
        regression = compareArchitectureHealth(baselineReport, report);
        logger.info(`Compared health against baseline ${baselineLabel}.`);
      }
    }

    const wantContract = plan.includeContract || parseErrors.length > 0;
    const contract = wantContract
      ? {
          ...validateBlueprintWorkspace(loaded),
          parseErrors,
        }
      : undefined;

    process.stdout.write(
      formatArchitectureHealthResult({
        report,
        format: plan.format,
        baselineLabel,
        regression,
        contract,
      })
    );

    const contractFailed = Boolean(
      contract && (!contract.isValid || contract.parseErrors.length > 0)
    );
    const deteriorated = Boolean(regression?.deteriorated);
    const failed = !report.isHealthy || deteriorated || contractFailed;
    process.exit(failed ? 1 : 0);
  } finally {
    if (baselineCleanup) {
      await baselineCleanup();
    }
  }
}
