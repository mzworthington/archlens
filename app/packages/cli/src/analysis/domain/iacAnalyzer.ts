import {
  EntityRef,
  parseSchemaFromYaml,
  systemSchemaPublicUrl,
  type SourceProvenance,
  type SystemSchema,
} from '@blueprint/core';
import { parseIacBatchToSchema } from '@blueprint/core/import-iac';
import { seedPreservedPositions } from '@blueprint/core/layout';
import { BaseWriter } from '../../writers/baseWriter.ts';
import { ContextLevelWriter } from '../../writers/contextLevelWriter.ts';
import type { AnalysisFileSystemPort, LoggerPort } from './ports.ts';
import { throwIfAborted } from './cancellation.ts';
import { discoverPulumiRoots } from './pulumiDiscovery.ts';
import { discoverTerraformRoots } from './terraformDiscovery.ts';
import {
  planIacContextSystems,
  productHubInputsForIac,
  resolveProductIdForPath,
  type DiscoveredSystem,
} from './systemDiscovery.ts';

export type IacAnalyzerDependencies = {
  fileSystem: AnalysisFileSystemPort;
  logger: LoggerPort;
};

export type RunIacAnalysisOptions = {
  /** Scan root (default cwd). */
  scanRoot?: string;
  signal?: AbortSignal;
  source?: SourceProvenance;
  /** Pre-discovered monorepo systems (avoids re-walking package.json). */
  discoveredSystems: DiscoveredSystem[];
};

type IacRoot = {
  rootPath: string;
  systemId: string;
  filePaths: string[];
  vendor: IacVendor;
};

export type IacAnalysisResult = {
  rootsAnalyzed: number;
  terraformRoots: number;
  pulumiRoots: number;
  warnings: string[];
};

function schemaLabel(systemId: string, vendor: IacVendor): string {
  const titled = systemId.charAt(0).toUpperCase() + systemId.slice(1);
  return vendor === 'pulumi' ? `${titled} Pulumi` : `${titled} Infrastructure`;
}

/**
 * Discover Terraform and Pulumi roots, parse each into container-level schemas,
 * write `containers.yaml`, and update the context diagram in one pass.
 */
export class IacAnalyzer {
  constructor(private deps: IacAnalyzerDependencies) {}

  async run(
    contextName: string,
    outputDir: string,
    options: RunIacAnalysisOptions
  ): Promise<IacAnalysisResult> {
    const { fileSystem, logger } = this.deps;
    const scanRoot = options.scanRoot ?? fileSystem.getCurrentWorkingDirectory();
    throwIfAborted(options.signal);

    const terraformRoots = discoverTerraformRoots(scanRoot, fileSystem);
    const pulumiRoots = discoverPulumiRoots(scanRoot, fileSystem);
    const roots: IacRoot[] = [
      ...terraformRoots.map(root => ({ ...root, vendor: 'terraform' as const })),
      ...pulumiRoots.map(root => ({ ...root, vendor: 'pulumi' as const })),
    ];

    if (roots.length === 0) {
      logger.info('No IaC roots found — skipping IaC pass.');
      return { rootsAnalyzed: 0, terraformRoots: 0, pulumiRoots: 0, warnings: [] };
    }

    logger.info(
      `🏗️  Found ${terraformRoots.length} Terraform root(s) and ${pulumiRoots.length} Pulumi project(s)`
    );

    const rootDir = fileSystem.getAbsolutePath(outputDir || 'blueprints');
    if (!fileSystem.exists(rootDir)) fileSystem.mkdir(rootDir);

    const writer = new BaseWriter(fileSystem, logger);
    const contextWriter = new ContextLevelWriter(fileSystem, logger);
    const allWarnings: string[] = [];
    const iacSubsystems: Array<{
      entityRef: string;
      displayName: string;
      rootPath: string;
      productId: string;
      isProductHub?: boolean;
    }> = [];

    for (const root of roots) {
      throwIfAborted(options.signal);

      const files = [];
      for (const filePath of root.filePaths) {
        const content = fileSystem.readText(filePath);
        if (content === null) {
          logger.warn(`Skipping unreadable IaC file: ${filePath}`);
          continue;
        }
        const relPath = fileSystem.getRelativePath(scanRoot, filePath) || filePath;
        files.push({ path: relPath.replace(/\\/g, '/'), content });
      }

      if (files.length === 0) continue;

      const systemRef = EntityRef.parse(root.systemId, EntityRef.parse(contextName));
      let result;
      try {
        result = parseIacBatchToSchema(files, {
          targetLevel: 'container',
          parentEntityRef: systemRef,
        });
      } catch (error) {
        logger.error(`Failed to parse ${root.vendor} root ${root.rootPath}`, error);
        continue;
      }

      allWarnings.push(...result.warnings);
      for (const w of result.warnings) {
        logger.warn(w, { root: root.rootPath, vendor: root.vendor });
      }

      let schema: SystemSchema = {
        ...result.schema,
        entityRef: systemRef,
        name: schemaLabel(root.systemId, result.vendor),
        version: systemSchemaPublicUrl(),
        level: 'container',
        ...(options.source ? { source: options.source } : {}),
      };

      const blueprintsDir = fileSystem.getAbsolutePath(rootDir, root.systemId);
      if (!fileSystem.exists(blueprintsDir)) fileSystem.mkdir(blueprintsDir);
      const targetPath = fileSystem.getAbsolutePath(blueprintsDir, 'containers.yaml');

      let previousNodes: SystemSchema['nodes'] = [];
      if (fileSystem.exists(targetPath)) {
        try {
          previousNodes = parseSchemaFromYaml(await fileSystem.readSchema(targetPath)).nodes ?? [];
        } catch {
          previousNodes = [];
        }
      }

      if (schema.nodes.length > 0) {
        schema = {
          ...schema,
          nodes: seedPreservedPositions(previousNodes, schema.nodes),
        };
      }

      await writer.writeYaml(targetPath, schema);
      logger.info(`📄 Saved ${result.vendor} schema for [${systemRef}]: ${targetPath}`);

      const relRoot = fileSystem.getRelativePath(scanRoot, root.rootPath) || root.systemId;
      iacSubsystems.push({
        entityRef: root.systemId,
        displayName: root.systemId,
        rootPath: relRoot.replace(/\\/g, '/'),
        productId: resolveProductIdForPath(relRoot, options.discoveredSystems),
        isProductHub: false,
      });
    }

    if (iacSubsystems.length > 0) {
      const hasProductHub = (productId: string) =>
        options.discoveredSystems.some(s => s.kind === 'product' && s.productId === productId);
      const planned = planIacContextSystems(iacSubsystems, hasProductHub);
      const productHubs = productHubInputsForIac(options.discoveredSystems, planned);
      await contextWriter.writeSystems(
        rootDir,
        contextName,
        [...productHubs, ...planned],
        options.source ? { source: options.source } : undefined
      );
    }

    return {
      rootsAnalyzed: iacSubsystems.length,
      terraformRoots: terraformRoots.length,
      pulumiRoots: pulumiRoots.length,
      warnings: allWarnings,
    };
  }
}
