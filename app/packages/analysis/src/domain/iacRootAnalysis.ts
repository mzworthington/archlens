import {
  parseSchemaFromYaml,
  systemSchemaPublicUrl,
  type SourceProvenance,
  type SystemDependency,
  type SystemNode,
  type SystemSchema,
} from '@archlens/core';
import { parseIacBatchToSchema, projectMeaningfulIacExternals } from '@archlens/core/import-iac';
import { seedPreservedPositions } from '@archlens/core/layout';
import type { BaseWriter } from '../writers/baseWriter.ts';
import type { AnalysisFileSystemPort, CodebaseParserPort, LoggerPort } from './ports.ts';
import { throwIfAborted } from './cancellation.ts';
import { schemaFromCodeScanFallback } from './iacCodeFallback.ts';
import { resolveBlueprintOutputSegment, resolveSystemEntityRef } from './entityRefContext.ts';

export type IacVendor = 'terraform' | 'pulumi';

export type IacRoot = {
  rootPath: string;
  systemId: string;
  filePaths: string[];
  vendor: IacVendor;
  runtime?: string;
};

export type IacSubsystemRef = {
  entityRef: string;
  displayName: string;
  rootPath: string;
  productId: string;
  isProductHub?: boolean;
};

export type IacExternalProposals = {
  proposedThirdParties: SystemNode[];
  proposedDependencies: SystemDependency[];
};

function schemaLabel(systemId: string): string {
  const titled = systemId.charAt(0).toUpperCase() + systemId.slice(1);
  return `${titled} Infrastructure`;
}

function readIacRootFiles(
  root: IacRoot,
  scanRoot: string,
  fileSystem: AnalysisFileSystemPort,
  logger: LoggerPort
): Array<{ path: string; content: string }> {
  const files: Array<{ path: string; content: string }> = [];
  for (const filePath of root.filePaths) {
    const content = fileSystem.readText(filePath);
    if (content === null) {
      logger.warn(`Skipping unreadable IaC file: ${filePath}`);
      continue;
    }
    const relPath = fileSystem.getRelativePath(scanRoot, filePath) || filePath;
    files.push({ path: relPath.replace(/\\/g, '/'), content });
  }
  return files;
}

async function loadPreviousNodes(
  fileSystem: AnalysisFileSystemPort,
  targetPath: string
): Promise<SystemSchema['nodes']> {
  if (!fileSystem.exists(targetPath)) return [];
  try {
    return parseSchemaFromYaml(await fileSystem.readSchema(targetPath)).nodes ?? [];
  } catch {
    return [];
  }
}

async function maybeCodeScanFallback(
  parser: CodebaseParserPort | undefined,
  root: IacRoot,
  {
    scanRoot,
    contextName,
    signal,
    source,
  }: {
    scanRoot: string;
    contextName: string;
    signal?: AbortSignal;
    source?: SourceProvenance;
  },
  logger: LoggerPort
): Promise<SystemSchema | undefined> {
  if (!parser || root.vendor !== 'pulumi') return undefined;

  const fallback = await schemaFromCodeScanFallback({
    parser,
    scanRoot,
    rootPath: root.rootPath,
    systemId: root.systemId,
    contextName,
    runtime: root.runtime ?? 'yaml',
    signal,
  });
  if (!fallback) return undefined;

  logger.info(`Using code-scan fallback for IaC root ${root.rootPath}`);
  return {
    ...fallback,
    name: schemaLabel(root.systemId),
    ...(source ? { source } : {}),
  };
}

/**
 * Parse one IaC root, write containers.yaml, and return a context subsystem ref.
 */
export async function analyzeAndWriteIacRoot(input: {
  root: IacRoot;
  contextName: string;
  rootDir: string;
  scanRoot: string;
  signal?: AbortSignal;
  source?: SourceProvenance;
  productId: string;
  /** Product systems this infra stack serves (from blueprint seed `serves`). */
  servedSystemRefs?: string[];
  /** Landscape entityRef for context vendor proposals. */
  landscapeEntityRef?: string;
  fileSystem: AnalysisFileSystemPort;
  logger: LoggerPort;
  writer: BaseWriter;
  parser?: CodebaseParserPort;
}): Promise<
  { subsystem: IacSubsystemRef; warnings: string[]; externals: IacExternalProposals } | undefined
> {
  const { root, fileSystem, logger, writer } = input;
  throwIfAborted(input.signal);

  const files = readIacRootFiles(root, input.scanRoot, fileSystem, logger);
  if (files.length === 0) return undefined;

  const systemRef = resolveSystemEntityRef(input.contextName, root.systemId);
  let parseResult;
  try {
    parseResult = parseIacBatchToSchema(files, {
      targetLevel: 'container',
      parentEntityRef: systemRef,
      ...(root.vendor === 'pulumi' && root.runtime ? { pulumiRuntime: root.runtime } : {}),
    });
  } catch (error) {
    logger.error(`Failed to parse ${root.vendor} root ${root.rootPath}`, error);
    return undefined;
  }

  for (const warning of parseResult.warnings) {
    logger.warn(warning, { root: root.rootPath, vendor: root.vendor });
  }

  let schema: SystemSchema = {
    ...parseResult.schema,
    entityRef: systemRef,
    name: schemaLabel(root.systemId),
    version: systemSchemaPublicUrl(),
    level: 'container',
    ...(input.source ? { source: input.source } : {}),
  };

  if (schema.nodes.length === 0) {
    const fallback = await maybeCodeScanFallback(
      input.parser,
      root,
      {
        scanRoot: input.scanRoot,
        contextName: input.contextName,
        signal: input.signal,
        source: input.source,
      },
      logger
    );
    if (fallback) schema = fallback;
  }

  const landscapeEntityRef = input.landscapeEntityRef
    ? input.landscapeEntityRef
    : systemRef.includes('/')
      ? systemRef.slice(0, systemRef.indexOf('/'))
      : input.contextName;
  const servedSystemRefs =
    input.servedSystemRefs && input.servedSystemRefs.length > 0
      ? input.servedSystemRefs
      : [landscapeEntityRef];
  const projection = projectMeaningfulIacExternals(schema, {
    landscapeEntityRef,
    infraSystemEntityRef: systemRef,
    servedSystemRefs,
  });
  schema = {
    ...projection.containerSchema,
    entityRef: systemRef,
    name: schemaLabel(root.systemId),
    version: systemSchemaPublicUrl(),
    level: 'container',
    ...(input.source ? { source: input.source } : {}),
  };

  const blueprintsDir = fileSystem.getAbsolutePath(
    input.rootDir,
    resolveBlueprintOutputSegment(input.contextName, root.systemId)
  );
  if (!fileSystem.exists(blueprintsDir)) fileSystem.mkdir(blueprintsDir);
  const targetPath = fileSystem.getAbsolutePath(blueprintsDir, 'containers.yaml');
  const previousNodes = await loadPreviousNodes(fileSystem, targetPath);

  // Never clobber a populated code-scan containers diagram with an empty IaC parse
  // (e.g. false-positive Pulumi discovery under a path that slugs to `plugins`).
  if (schema.nodes.length === 0 && previousNodes.length > 0) {
    logger.warn(
      `Skipping empty ${root.vendor} write for [${systemRef}] - preserving existing containers.yaml`,
      { root: root.rootPath, path: targetPath }
    );
    return undefined;
  }

  if (schema.nodes.length > 0) {
    schema = {
      ...schema,
      nodes: seedPreservedPositions(previousNodes, schema.nodes),
    };
  }

  await writer.writeYaml(targetPath, schema);
  logger.info(`📄 Saved ${parseResult.vendor} schema for [${systemRef}]: ${targetPath}`);

  const relRoot = fileSystem.getRelativePath(input.scanRoot, root.rootPath) || root.systemId;
  return {
    warnings: parseResult.warnings,
    externals: {
      proposedThirdParties: projection.proposedThirdParties,
      proposedDependencies: projection.proposedDependencies,
    },
    subsystem: {
      entityRef: root.systemId,
      displayName: root.systemId,
      rootPath: relRoot.replace(/\\/g, '/'),
      productId: input.productId,
      isProductHub: false,
    },
  };
}
