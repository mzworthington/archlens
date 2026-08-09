import path from 'node:path';
import {
  parseSchemaFromYaml,
  serializeSchemaToYaml,
  type SystemNode,
  type SystemSchema,
} from '@archlens/core';
import { NodeFileSystemAdapter } from '../analysis/adapters/nodeFileSystem.ts';
import { ConsoleLogger } from '../analysis/adapters/consoleLogger.ts';
import { collectFileMetrics } from '../forensics/collectFileMetrics.ts';
import { attachForensicsToSchema, normalizeFilePath } from '@archlens/analysis/forensics';
import { listBlueprintSchemaPaths } from '@archlens/analysis/writers';
import type { ArchlensCliPlan } from './parseArchlensArgv.ts';

function isComponentSchemaPath(schemaPath: string): boolean {
  return schemaPath.includes('-components.yaml') || schemaPath.endsWith('/components.yaml');
}

function isContainerSchemaPath(schemaPath: string): boolean {
  return schemaPath.endsWith('/containers.yaml') || schemaPath.endsWith('containers.yaml');
}

function collectFilepathsFromSchemas(schemas: SystemSchema[]): string[] {
  const paths = new Set<string>();
  for (const schema of schemas) {
    if (schema.level !== 'component') continue;
    for (const node of schema.nodes) {
      const filepath = node.properties?.filepath;
      if (typeof filepath === 'string') {
        paths.add(normalizeFilePath(filepath));
      }
    }
  }
  return [...paths].sort();
}

/**
 * Re-attach TraceLens metrics onto existing blueprint YAML (no architecture re-scan).
 */
export async function executeForensicsEnrichRun(plan: ArchlensCliPlan): Promise<void> {
  const outputDir = plan.architecture.outputDir || process.env.ARCHLENS_OUTPUT_DIR || 'blueprints';
  const rootDir = path.resolve(process.cwd(), outputDir);
  const logger = new ConsoleLogger();
  const fileSystem = new NodeFileSystemAdapter();

  const schemaPaths = listBlueprintSchemaPaths(rootDir, fileSystem);
  if (schemaPaths.length === 0) {
    logger.warn(`No blueprint schemas found under ${rootDir}.`);
    process.exit(1);
  }

  const loaded: { path: string; schema: SystemSchema }[] = [];
  for (const schemaPath of schemaPaths) {
    const raw = await fileSystem.readSchema(schemaPath);
    loaded.push({ path: schemaPath, schema: parseSchemaFromYaml(raw) });
  }

  const explicitPaths = collectFilepathsFromSchemas(loaded.map(l => l.schema));
  if (explicitPaths.length === 0) {
    logger.warn('No component filepaths found in blueprint YAML.');
    process.exit(1);
  }

  logger.info(`Collecting TraceLens metrics for ${explicitPaths.length} file(s)…`);
  const forensicsByPath = await collectFileMetrics(plan.git, process.cwd(), undefined, {
    explicitPaths,
  });

  const componentNodesBySystemDir = new Map<string, SystemNode[]>();

  let updated = 0;
  for (const entry of loaded) {
    if (!isComponentSchemaPath(entry.path)) continue;
    const enriched = attachForensicsToSchema(entry.schema, forensicsByPath);
    if (JSON.stringify(enriched) === JSON.stringify(entry.schema)) continue;
    await fileSystem.writeSchema(entry.path, serializeSchemaToYaml(enriched));
    updated++;

    const systemDir = path.dirname(entry.path);
    const list = componentNodesBySystemDir.get(systemDir) ?? [];
    list.push(...enriched.nodes);
    componentNodesBySystemDir.set(systemDir, list);
  }

  for (const entry of loaded) {
    if (!isContainerSchemaPath(entry.path)) continue;
    const systemDir = path.dirname(entry.path);
    const componentNodes = componentNodesBySystemDir.get(systemDir) ?? [];
    const enriched = attachForensicsToSchema(entry.schema, forensicsByPath, {
      componentNodes,
    });
    if (JSON.stringify(enriched) === JSON.stringify(entry.schema)) continue;
    await fileSystem.writeSchema(entry.path, serializeSchemaToYaml(enriched));
    updated++;
  }

  logger.info(
    `✅ Refreshed TraceLens metrics on ${updated} schema(s) (${forensicsByPath.size} file metrics).`
  );
}
