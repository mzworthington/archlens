import path from 'node:path';
import { NodeFileSystemAdapter } from '../analysis/adapters/nodeFileSystem.ts';
import { ConsoleLogger } from '../analysis/adapters/consoleLogger.ts';
import { applyExternalDependenciesPass } from '@archlens/analysis/writers';
import type { ArchlensCliPlan } from './parseArchlensArgv.ts';
import { executeForensicsEnrichRun } from './enrichForensicsRun.ts';

/**
 * Re-run the externals pass on existing blueprint YAML (no source re-scan).
 * Adds missing cross-diagram dependency edges and external proxy nodes.
 */
export async function executeEnrichRun(plan: ArchlensCliPlan): Promise<void> {
  if (plan.runGitForensics) {
    await executeForensicsEnrichRun(plan);
  }

  const outputDir = plan.architecture.outputDir || process.env.ARCHLENS_OUTPUT_DIR || 'blueprints';
  const rootDir = path.resolve(process.cwd(), outputDir);
  const logger = new ConsoleLogger();
  const fileSystem = new NodeFileSystemAdapter();

  logger.info(`Enriching existing blueprints under ${rootDir}…`);

  const result = await applyExternalDependenciesPass(rootDir, fileSystem, logger);

  if (result.schemasScanned === 0) {
    logger.warn(`No blueprint schemas found under ${rootDir}.`);
    process.exit(1);
  }

  if (result.schemasUpdated === 0) {
    logger.info(
      `No dependency changes needed (${result.schemasScanned} schema(s) already enriched).`
    );
  } else {
    logger.info(
      `Enriched ${result.schemasUpdated} of ${result.schemasScanned} schema(s) with external deps and couplings.`
    );
  }
}
