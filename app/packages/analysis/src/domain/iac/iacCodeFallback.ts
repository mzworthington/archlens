import { systemSchemaPublicUrl, type SystemSchema } from '@archlens/core';
import type { CodebaseParserPort } from '../ports.ts';
import { resolveSystemEntityRef } from '../entityRefContext.ts';
import { ModelExtractor } from '../modelExtractor.ts';

function globForRuntime(runtime: string, relRoot: string): string {
  const prefix = relRoot ? `${relRoot}/` : '';
  switch (runtime) {
    case 'python':
      return `${prefix}**/*.py`;
    case 'nodejs':
      return `${prefix}**/*.{ts,tsx}`;
    case 'go':
      return `${prefix}**/*.go`;
    case 'dotnet':
      return `${prefix}**/*.cs`;
    default:
      return `${prefix}**/*.{py,ts,tsx,go,cs}`;
  }
}

/**
 * When IaC parsers find no resources, scan imperative program sources with the
 * same AST pipeline used for application code analysis.
 */
export async function schemaFromCodeScanFallback(args: {
  parser: CodebaseParserPort;
  scanRoot: string;
  rootPath: string;
  systemId: string;
  contextName: string;
  runtime: string;
  signal?: AbortSignal;
}): Promise<SystemSchema | null> {
  const relRoot = args.rootPath.startsWith(args.scanRoot)
    ? args.rootPath
        .slice(args.scanRoot.length)
        .replace(/^[/\\]+/, '')
        .replace(/\\/g, '/')
    : args.rootPath.replace(/\\/g, '/');

  const glob = globForRuntime(args.runtime, relRoot);
  const files = await args.parser.parseSourceFiles(glob, args.signal);
  if (files.length === 0) return null;

  const parentRef = resolveSystemEntityRef(args.contextName, args.systemId);
  const extractor = new ModelExtractor(parentRef, { rollupModules: false });
  const { containerNodesMap, containerDependencies } = extractor.extractGraph(files, []);

  if (containerNodesMap.size === 0) return null;

  return {
    name: args.systemId,
    version: systemSchemaPublicUrl(),
    level: 'container',
    entityRef: parentRef,
    nodes: Array.from(containerNodesMap.values()).map(node => ({
      ...node,
      properties: { ...node.properties, 'iac.view': 'code-fallback' },
    })),
    dependencies: containerDependencies,
  };
}
