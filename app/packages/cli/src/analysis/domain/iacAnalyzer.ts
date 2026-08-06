import type { SourceProvenance } from '@archlens/core';
import { BaseWriter } from '../../writers/baseWriter.ts';
import { ContextLevelWriter } from '../../writers/contextLevelWriter.ts';
import type { AnalysisFileSystemPort, CodebaseParserPort, LoggerPort } from './ports.ts';
import { throwIfAborted } from './cancellation.ts';
import { discoverPulumiRoots } from './pulumiDiscovery.ts';
import { discoverTerraformRoots } from './terraformDiscovery.ts';
import {
  planIacContextSystems,
  productHubInputsForIac,
  resolveProductIdForPath,
  type DiscoveredSystem,
} from './systemDiscovery.ts';
import { analyzeAndWriteIacRoot, type IacRoot, type IacSubsystemRef } from './iacRootAnalysis.ts';

export type IacAnalyzerDependencies = {
  fileSystem: AnalysisFileSystemPort;
  logger: LoggerPort;
  /** Optional AST parser for code-scan fallback when IaC extraction finds no resources. */
  parser?: CodebaseParserPort;
};

export type RunIacAnalysisOptions = {
  /** Scan root (default cwd). */
  scanRoot?: string;
  signal?: AbortSignal;
  source?: SourceProvenance;
  /** Pre-discovered monorepo systems (avoids re-walking package.json). */
  discoveredSystems: DiscoveredSystem[];
};

export type IacAnalysisResult = {
  rootsAnalyzed: number;
  terraformRoots: number;
  pulumiRoots: number;
  warnings: string[];
};

function collectIacRoots(
  scanRoot: string,
  fileSystem: AnalysisFileSystemPort
): {
  roots: IacRoot[];
  terraformCount: number;
  pulumiCount: number;
} {
  const terraformRoots = discoverTerraformRoots(scanRoot, fileSystem);
  const pulumiRoots = discoverPulumiRoots(scanRoot, fileSystem);
  return {
    terraformCount: terraformRoots.length,
    pulumiCount: pulumiRoots.length,
    roots: [
      ...terraformRoots.map(root => ({ ...root, vendor: 'terraform' as const })),
      ...pulumiRoots.map(root => ({
        rootPath: root.rootPath,
        systemId: root.systemId,
        filePaths: root.filePaths,
        vendor: 'pulumi' as const,
        runtime: root.runtime,
      })),
    ],
  };
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

    const { roots, terraformCount, pulumiCount } = collectIacRoots(scanRoot, fileSystem);

    if (roots.length === 0) {
      logger.info('No IaC roots found - skipping IaC pass.');
      return { rootsAnalyzed: 0, terraformRoots: 0, pulumiRoots: 0, warnings: [] };
    }

    logger.info(
      `🏗️  Found ${terraformCount} Terraform root(s) and ${pulumiCount} Pulumi project(s)`
    );

    const rootDir = fileSystem.getAbsolutePath(outputDir || 'blueprints');
    if (!fileSystem.exists(rootDir)) fileSystem.mkdir(rootDir);

    const writer = new BaseWriter(fileSystem, logger);
    const contextWriter = new ContextLevelWriter(fileSystem, logger);
    const allWarnings: string[] = [];
    const iacSubsystems: IacSubsystemRef[] = [];

    for (const root of roots) {
      const relRoot = fileSystem.getRelativePath(scanRoot, root.rootPath) || root.systemId;
      const analyzed = await analyzeAndWriteIacRoot({
        root,
        contextName,
        rootDir,
        scanRoot,
        signal: options.signal,
        source: options.source,
        productId: resolveProductIdForPath(relRoot, options.discoveredSystems),
        fileSystem,
        logger,
        writer,
        parser: this.deps.parser,
      });
      if (!analyzed) continue;
      allWarnings.push(...analyzed.warnings);
      iacSubsystems.push(analyzed.subsystem);
    }

    if (iacSubsystems.length > 0) {
      const hasProductHub = (productId: string) =>
        options.discoveredSystems.some(
          system => system.kind === 'product' && system.productId === productId
        );
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
      terraformRoots: terraformCount,
      pulumiRoots: pulumiCount,
      warnings: allWarnings,
    };
  }
}
