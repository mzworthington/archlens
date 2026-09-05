import fs from 'node:fs/promises';
import path from 'node:path';
import { parseChaosSpecFromYaml, type ChaosSpecDocument } from '@archlens/core/resilience';
import {
  evaluateAdviceLensGate,
  formatAdviceLensArtifact,
  runEstateResilience,
  serializeEstateResilienceReport,
  type AdviceLensArtifactFormat,
} from '@archlens/core/recommendations';
import { NodeFileSystemAdapter } from '../analysis/adapters/nodeFileSystem.ts';
import { ConsoleLogger } from '../analysis/adapters/consoleLogger.ts';
import type { ResilienceCliPlan, ResilienceOutputFormat } from './parseArchlensArgv.ts';
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
    } catch {}
  }
  return documents;
}

/** Structured artifact format for --output / machine-readable stdout. */
export function resolveAdviceLensArtifactFormat(
  format: ResilienceOutputFormat,
  outputPath?: string
): AdviceLensArtifactFormat {
  if (format === 'yaml') return 'yaml';
  if (format === 'json') return 'json';
  if (outputPath && /\.ya?ml$/i.test(outputPath)) return 'yaml';
  return 'json';
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

  const loadedSystems = files.map(file => ({
    path: file.relativePath,
    name: file.schema.name ?? file.relativePath,
    schema: file.schema,
  }));

  const report = runEstateResilience(files, {
    chaosSpecs,
    maxRegionOutageTargets: plan.maxRegionOutageTargets,
    maxFanInProbes: plan.maxFanInProbes,
    loadedSystems,
  });

  const artifact = serializeEstateResilienceReport(report);
  const artifactFormat = resolveAdviceLensArtifactFormat(plan.format, plan.outputPath);
  const artifactText = formatAdviceLensArtifact(artifact, artifactFormat);

  if (plan.outputPath) {
    const absoluteOutput = path.resolve(process.cwd(), plan.outputPath);
    await fs.mkdir(path.dirname(absoluteOutput), { recursive: true });
    await fs.writeFile(absoluteOutput, artifactText, 'utf8');
    logger.info(`Wrote AdviceLens ${artifactFormat.toUpperCase()} artifact to ${absoluteOutput}`);
  }

  if (plan.format === 'json' || plan.format === 'yaml') {
    process.stdout.write(formatEstateResilienceResult(report, plan.format));
  } else {
    process.stdout.write(formatEstateResilienceResult(report, 'text'));
  }

  const gate = evaluateAdviceLensGate(report.summary, {
    minSla: plan.minSla,
    failOnRecommendations: plan.failOnRecommendations,
  });
  if (!gate.ok) {
    for (const reason of gate.reasons) {
      logger.error(reason);
    }
  }

  process.exit(gate.ok ? 0 : 1);
}
