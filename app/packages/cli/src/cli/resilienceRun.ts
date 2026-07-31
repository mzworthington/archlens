import fs from 'node:fs/promises';
import path from 'node:path';
import { parseChaosSpecFromYaml, type ChaosSpecDocument } from '@archlens/core/resilience';
import { runEstateResilience } from '@archlens/core/recommendations';
import { NodeFileSystemAdapter } from '../analysis/adapters/nodeFileSystem.ts';
import { ConsoleLogger } from '../analysis/adapters/consoleLogger.ts';
import type { ResilienceCliPlan } from './parseArchlensArgv.ts';
import { loadBlueprintTree } from './blueprintLoader.ts';
import { formatEstateResilienceResult } from './formatEstateResilienceResult.ts';

async function listYamlFiles(rootDir: string): Promise<string[]> {
  const entries = await fs.readdir(rootDir, { withFileTypes: true });
  const files: string[] = [];

  for (const entry of entries) {
    const absolute = path.join(rootDir, entry.name);
    if (entry.isDirectory()) {
      files.push(...(await listYamlFiles(absolute)));
      continue;
    }
    if (entry.name.endsWith('.yaml') || entry.name.endsWith('.yml')) {
      files.push(absolute);
    }
  }

  return files;
}

async function loadChaosSpecs(rootDir: string): Promise<ChaosSpecDocument[]> {
  const absoluteRoot = path.resolve(rootDir);
  let stat;
  try {
    stat = await fs.stat(absoluteRoot);
  } catch {
    return [];
  }
  if (!stat.isDirectory()) return [];

  const documents: ChaosSpecDocument[] = [];
  for (const filePath of await listYamlFiles(absoluteRoot)) {
    try {
      const raw = await fs.readFile(filePath, 'utf8');
      documents.push(parseChaosSpecFromYaml(raw));
    } catch {
      // Skip non-chaos YAML files in the directory.
    }
  }
  return documents;
}

export async function executeResilienceRun(plan: ResilienceCliPlan): Promise<void> {
  const rootDir = path.resolve(process.cwd(), plan.targetPath);
  const fileSystem = new NodeFileSystemAdapter();
  const logger = new ConsoleLogger();

  logger.info(`Running estate resilience sweep under ${rootDir}…`);

  const { files, parseErrors } = await loadBlueprintTree(rootDir, fileSystem);
  if (parseErrors.length > 0) {
    for (const error of parseErrors) {
      logger.error(`${error.path}: ${error.message}`);
    }
    process.exit(1);
  }

  if (files.length === 0) {
    logger.warn(`No blueprint schemas found under ${rootDir}.`);
    process.exit(1);
  }

  const chaosSpecs = plan.chaosSpecsDir ? await loadChaosSpecs(plan.chaosSpecsDir) : [];
  if (plan.chaosSpecsDir && chaosSpecs.length === 0) {
    logger.warn(`No ChaosSpec YAML files found under ${path.resolve(plan.chaosSpecsDir)}.`);
  }

  const report = runEstateResilience(files, {
    chaosSpecs,
    maxRegionOutageTargets: plan.maxRegionOutageTargets,
    maxFanInProbes: plan.maxFanInProbes,
  });

  process.stdout.write(formatEstateResilienceResult(report, plan.format));

  const belowSlaThreshold = report.summary.worstOverallSla < plan.minSla;
  const hasRecommendations = report.summary.recommendationCount > 0;
  const shouldFail = plan.failOnRecommendations
    ? hasRecommendations || belowSlaThreshold
    : belowSlaThreshold;

  process.exit(shouldFail ? 1 : 0);
}
