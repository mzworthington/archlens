import {
  EntityRef,
  infrastructureServesOf,
  parseSchemaFromYaml,
  type SourceProvenance,
  type SystemDependency,
  type SystemNode,
  type SystemSchema,
} from '@archlens/core';
import { BaseWriter } from '../../writers/baseWriter.ts';
import {
  ContextLevelWriter,
  LEGACY_CONTEXT_RELATIVE_PATH,
  resolveContextSeedRelativePath,
} from '../../writers/contextLevelWriter.ts';
import type { AnalysisFileSystemPort, CodebaseParserPort, LoggerPort } from '../ports.ts';
import { throwIfAborted } from '../cancellation.ts';
import { discoverPulumiRoots } from './pulumiDiscovery.ts';
import { discoverTerraformRoots } from './terraformDiscovery.ts';
import {
  planIacContextSystems,
  productHubInputsForIac,
  resolveProductIdForPath,
  type DiscoveredSystem,
} from '../systemDiscovery/index.ts';
import {
  analyzeAndWriteIacRoot,
  type IacExternalProposals,
  type IacRoot,
  type IacSubsystemRef,
} from './iacRootAnalysis.ts';
import { resolveSystemEntityRef } from '../entityRefContext.ts';

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

function nestedContextRelativePath(diagramEntityRef: string): string {
  if (diagramEntityRef === 'samples') return 'golden-journey/context.yaml';
  return `${diagramEntityRef}/context.yaml`;
}

async function loadContextSeed(
  fileSystem: AnalysisFileSystemPort,
  rootDir: string,
  contextName: string
): Promise<SystemSchema | null> {
  const diagramEntityRef = EntityRef.parse(contextName);
  const nestedRelativePath = nestedContextRelativePath(diagramEntityRef);
  const nestedPath = fileSystem.getAbsolutePath(rootDir, nestedRelativePath);
  const rootSeedPath = fileSystem.getAbsolutePath(rootDir, LEGACY_CONTEXT_RELATIVE_PATH);
  const seedRelativePath = resolveContextSeedRelativePath(diagramEntityRef, {
    nestedExists: fileSystem.exists(nestedPath),
    rootExists: fileSystem.exists(rootSeedPath),
  });
  const seedPath = fileSystem.getAbsolutePath(rootDir, seedRelativePath);
  if (!fileSystem.exists(seedPath)) return null;
  try {
    return parseSchemaFromYaml(await fileSystem.readSchema(seedPath));
  } catch {
    return null;
  }
}

/** Resolve `serves` from an infra spoke in the blueprint seed; default to the landscape system. */
function resolveServedSystemRefs(
  seed: SystemSchema | null,
  infraSystemEntityRef: string,
  landscapeEntityRef: string
): string[] {
  const spoke = seed?.nodes?.find(node => node.entityRef === infraSystemEntityRef);
  if (spoke) {
    const serves = infrastructureServesOf(spoke);
    if (serves.length > 0) return serves;
  }
  return [landscapeEntityRef];
}

function mergeExternalProposals(proposals: IacExternalProposals[]): IacExternalProposals {
  const thirdParties = new Map<string, SystemNode>();
  const dependencies: SystemDependency[] = [];
  const depKeys = new Set<string>();

  for (const proposal of proposals) {
    for (const node of proposal.proposedThirdParties) {
      thirdParties.set(node.entityRef, node);
    }
    for (const dep of proposal.proposedDependencies) {
      const key = `${dep.from}|${dep.to}|${dep.type}|${dep.description || ''}`;
      if (depKeys.has(key)) continue;
      depKeys.add(key);
      dependencies.push(dep);
    }
  }

  return {
    proposedThirdParties: [...thirdParties.values()],
    proposedDependencies: dependencies,
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
    const externalBatches: IacExternalProposals[] = [];
    const landscapeEntityRef = EntityRef.parse(contextName);
    const contextSeed = await loadContextSeed(fileSystem, rootDir, contextName);

    for (const root of roots) {
      const relRoot = fileSystem.getRelativePath(scanRoot, root.rootPath) || root.systemId;
      const systemRef = resolveSystemEntityRef(contextName, root.systemId);
      const analyzed = await analyzeAndWriteIacRoot({
        root,
        contextName,
        rootDir,
        scanRoot,
        signal: options.signal,
        source: options.source,
        productId: resolveProductIdForPath(relRoot, options.discoveredSystems),
        servedSystemRefs: resolveServedSystemRefs(contextSeed, systemRef, landscapeEntityRef),
        landscapeEntityRef,
        fileSystem,
        logger,
        writer,
        parser: this.deps.parser,
      });
      if (!analyzed) continue;
      allWarnings.push(...analyzed.warnings);
      iacSubsystems.push(analyzed.subsystem);
      externalBatches.push(analyzed.externals);
    }

    if (iacSubsystems.length > 0) {
      const hasProductHub = (productId: string) =>
        options.discoveredSystems.some(
          system => system.kind === 'product' && system.productId === productId
        );
      const planned = planIacContextSystems(iacSubsystems, hasProductHub);
      const productHubs = productHubInputsForIac(options.discoveredSystems, planned);
      const externals = mergeExternalProposals(externalBatches);
      await contextWriter.writeSystems(rootDir, contextName, [...productHubs, ...planned], {
        ...(options.source ? { source: options.source } : {}),
        proposedThirdParties: externals.proposedThirdParties,
        proposedDependencies: externals.proposedDependencies,
      });
    }

    return {
      rootsAnalyzed: iacSubsystems.length,
      terraformRoots: terraformCount,
      pulumiRoots: pulumiCount,
      warnings: allWarnings,
    };
  }
}
