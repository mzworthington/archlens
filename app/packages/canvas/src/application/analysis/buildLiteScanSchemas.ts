import type { SystemDependency, SystemNode, SystemSchema } from '@archlens/core';
import { serializeSchemaToYaml, systemSchemaPublicUrl } from '@archlens/core';
import { extractTsImports, resolveRelativeSpecifier } from './extractTsImports';

export type LiteScanSourceFile = {
  relativePath: string;
  content: string;
};

export type LiteScanYamlFile = {
  name: string;
  content: string;
};

export type BuildLiteScanSchemasResult = {
  files: LiteScanYamlFile[];
  contextEntityRef: string;
  systemEntityRef: string;
  fileCount: number;
  truncated: boolean;
};

const LAYOUT_IDENTITY_DENYLIST = new Set([
  'src',
  'lib',
  'source',
  'sources',
  'types',
  'utils',
  'util',
  'helpers',
  'common',
  'shared',
  'internal',
  'pkg',
  'packages',
  'apps',
  'app',
  'services',
]);

export function slugifySegment(raw: string): string {
  const slug = raw
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
  return slug || 'scanned';
}

export function displayNameFromSlug(slug: string): string {
  return slug
    .split('-')
    .filter(Boolean)
    .map(part => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

/** Pick a container leaf from a repo-relative path (packages/foo/… → foo). */
export function containerLeafFromPath(relativePath: string): string {
  const segments = relativePath.replace(/\\/g, '/').split('/').filter(Boolean);
  if (segments.length === 0) return 'app';

  if (segments[0] === 'packages' || segments[0] === 'apps' || segments[0] === 'services') {
    const next = segments[1];
    if (next && !LAYOUT_IDENTITY_DENYLIST.has(next.toLowerCase())) {
      return slugifySegment(next);
    }
  }

  for (const segment of segments.slice(0, -1)) {
    if (!LAYOUT_IDENTITY_DENYLIST.has(segment.toLowerCase())) {
      return slugifySegment(segment);
    }
  }

  return 'app';
}

function moduleLeafFromPath(relativePath: string): string {
  return slugifySegment(
    relativePath
      .replace(/\\/g, '/')
      .replace(/\.[^.]+$/, '')
      .replace(/\//g, '-')
  );
}

type ModuleRecord = {
  relativePath: string;
  containerLeaf: string;
  moduleLeaf: string;
  containerRef: string;
  moduleRef: string;
};

/**
 * Build a minimal BlueprintSpec estate from scanned TS/JS sources.
 * Structure only — no git forensics, IaC, or multi-language AST parity.
 */
export function buildLiteScanSchemas(
  sources: readonly LiteScanSourceFile[],
  options: { workspaceName?: string; truncated?: boolean } = {}
): BuildLiteScanSchemasResult {
  const workspaceSlug = slugifySegment(options.workspaceName ?? 'scanned');
  const contextEntityRef = workspaceSlug;
  const systemEntityRef = `${contextEntityRef}/app`;
  const version = systemSchemaPublicUrl();

  const knownPaths = new Set(sources.map(s => s.relativePath.replace(/\\/g, '/')));
  const modules: ModuleRecord[] = sources.map(source => {
    const relativePath = source.relativePath.replace(/\\/g, '/');
    const containerLeaf = containerLeafFromPath(relativePath);
    const moduleLeaf = moduleLeafFromPath(relativePath);
    const containerRef = `${systemEntityRef}/${containerLeaf}`;
    return {
      relativePath,
      containerLeaf,
      moduleLeaf,
      containerRef,
      moduleRef: `${containerRef}/${moduleLeaf}`,
    };
  });

  const byPath = new Map(modules.map(m => [m.relativePath, m]));
  const containers = new Map<string, SystemNode>();
  for (const mod of modules) {
    if (containers.has(mod.containerLeaf)) continue;
    containers.set(mod.containerLeaf, {
      entityRef: mod.containerRef,
      type: 'container',
      name: displayNameFromSlug(mod.containerLeaf),
      properties: { technology: 'TypeScript / JavaScript' },
    });
  }

  const componentNodes = new Map<string, SystemNode>();
  for (const mod of modules) {
    componentNodes.set(mod.moduleRef, {
      entityRef: mod.moduleRef,
      type: 'code-module',
      name: displayNameFromSlug(mod.moduleLeaf),
      properties: {
        filepath: mod.relativePath,
        technology: 'TypeScript / JavaScript',
        containerId: mod.containerLeaf,
      },
    });
  }

  const containerDeps: SystemDependency[] = [];
  const componentDeps: SystemDependency[] = [];
  const seenContainerEdges = new Set<string>();
  const seenComponentEdges = new Set<string>();

  for (const source of sources) {
    const from = byPath.get(source.relativePath.replace(/\\/g, '/'));
    if (!from) continue;
    const { imports, reExports } = extractTsImports(source.content);
    for (const specifier of [...imports, ...reExports]) {
      const targetPath = resolveRelativeSpecifier(from.relativePath, specifier, knownPaths);
      if (!targetPath) continue;
      const to = byPath.get(targetPath);
      if (!to || to.moduleRef === from.moduleRef) continue;

      if (from.containerLeaf !== to.containerLeaf) {
        const edgeKey = `${from.containerRef}->${to.containerRef}`;
        if (!seenContainerEdges.has(edgeKey)) {
          seenContainerEdges.add(edgeKey);
          containerDeps.push({
            from: from.containerRef,
            to: to.containerRef,
            type: 'direct-call',
            description: 'Import coupling (browser lite scan)',
          });
        }
      }

      const compEdgeKey = `${from.moduleRef}->${to.moduleRef}`;
      if (!seenComponentEdges.has(compEdgeKey)) {
        seenComponentEdges.add(compEdgeKey);
        componentDeps.push({
          from: from.moduleRef,
          to: to.moduleRef,
          type: 'direct-call',
          description: 'Import coupling (browser lite scan)',
        });
      }
    }
  }

  const contextSchema: SystemSchema = {
    name: displayNameFromSlug(contextEntityRef),
    version,
    level: 'context',
    entityRef: contextEntityRef,
    nodes: [
      {
        entityRef: `${contextEntityRef}/user`,
        type: 'person',
        name: 'User',
      },
      {
        entityRef: systemEntityRef,
        type: 'software-system',
        name: displayNameFromSlug(workspaceSlug),
        properties: {
          note: 'Generated by ArchLens browser lite scan (structure only).',
        },
      },
    ],
    dependencies: [
      {
        from: `${contextEntityRef}/user`,
        to: systemEntityRef,
        type: 'direct-call',
        description: 'Uses',
      },
    ],
  };

  const containerSchema: SystemSchema = {
    name: `${displayNameFromSlug(workspaceSlug)} containers`,
    version,
    level: 'container',
    entityRef: systemEntityRef,
    nodes: Array.from(containers.values()),
    dependencies: containerDeps,
  };

  const files: LiteScanYamlFile[] = [
    { name: `${contextEntityRef}/context.yaml`, content: serializeSchemaToYaml(contextSchema) },
    {
      name: `${contextEntityRef}/app/containers.yaml`,
      content: serializeSchemaToYaml(containerSchema),
    },
  ];

  const byContainer = new Map<string, SystemNode[]>();
  for (const node of componentNodes.values()) {
    const containerId = String(node.properties?.containerId ?? 'app');
    const list = byContainer.get(containerId) ?? [];
    list.push(node);
    byContainer.set(containerId, list);
  }

  for (const [containerLeaf, nodes] of byContainer) {
    const containerRef = `${systemEntityRef}/${containerLeaf}`;
    const nodeRefs = new Set(nodes.map(n => n.entityRef));
    const deps = componentDeps.filter(d => nodeRefs.has(d.from) && nodeRefs.has(d.to));
    const componentSchema: SystemSchema = {
      name: `${displayNameFromSlug(containerLeaf)} modules`,
      version,
      level: 'component',
      entityRef: containerRef,
      nodes,
      dependencies: deps,
    };
    files.push({
      name: `${contextEntityRef}/app/${containerLeaf}-components.yaml`,
      content: serializeSchemaToYaml(componentSchema),
    });
  }

  return {
    files,
    contextEntityRef,
    systemEntityRef,
    fileCount: sources.length,
    truncated: Boolean(options.truncated),
  };
}
