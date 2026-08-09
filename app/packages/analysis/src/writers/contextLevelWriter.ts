import { BaseWriter } from './baseWriter.ts';
import type { SystemDependency, SystemNode, SystemSchema, SourceProvenance } from '@archlens/core';
import {
  EntityRef,
  hydrateContextSchema,
  parseSchemaFromYaml,
  PERSON_EDGE_DESCRIPTION,
  systemSchemaPublicUrl,
} from '@archlens/core';
import { seedPreservedPositions } from '@archlens/core/layout';
import { attachForensicsToSchema } from '../forensics/attachForensics.ts';
import {
  hubRefForProductNodes,
  normalizeContextGrouping,
  pruneEmptyProductHubs,
} from '../domain/systemDiscovery.ts';
import { resolveContextDisplayName, resolveSystemEntityRef } from '../domain/entityRefContext.ts';

export { PERSON_EDGE_DESCRIPTION };

/** Human label for a new context diagram from a slugified entityRef root. */
export function contextDisplayName(contextName: string): string {
  const slug = EntityRef.parse(contextName);
  return slug
    .split('-')
    .filter(Boolean)
    .map(part => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

export type ContextSystemInput = {
  entityRef: string;
  displayName: string;
  /** Repo-relative system root (`packages`, `microsite`). Empty for product group. */
  rootPath: string;
  /** Groups systems from the same scanned product; different products stay disconnected. */
  productId: string;
  /** True for the product group frame that subsystems nest inside. */
  isProductHub?: boolean;
  /** Nest under this context node instead of the product hub. */
  parentEntityRef?: string;
};

/** Relative path for the primary application context diagram under a blueprint output dir. */
export const APPLICATION_CONTEXT_RELATIVE_PATH = 'application/context.yaml';

/** Root-level context path when the context folder is omitted. */
export const LEGACY_CONTEXT_RELATIVE_PATH = 'context.yaml';

function nestedContextRelativePath(diagramEntityRef: string): string {
  if (diagramEntityRef === 'samples') return 'golden-journey/context.yaml';
  return `${diagramEntityRef}/context.yaml`;
}

/**
 * Resolve where to read/write the context seed.
 * Prefers an existing file (root `context.yaml` or `<ctx>/context.yaml`);
 * otherwise uses `<ctx>/context.yaml` when a landscape slug is set.
 */
export function resolveContextSeedRelativePath(
  diagramEntityRef: string,
  options: { nestedExists: boolean; rootExists: boolean }
): string {
  if (diagramEntityRef === 'samples') return 'golden-journey/context.yaml';
  if (options.rootExists && !options.nestedExists) {
    return LEGACY_CONTEXT_RELATIVE_PATH;
  }
  if (options.nestedExists) {
    return nestedContextRelativePath(diagramEntityRef);
  }
  return nestedContextRelativePath(diagramEntityRef);
}

function hubSystemRef(
  system: ContextSystemInput,
  diagramEntityRef: string,
  systems: readonly ContextSystemInput[]
): string {
  const systemSlug = EntityRef.parse(system.entityRef);
  if (
    system.isProductHub &&
    systemSlug === EntityRef.parse(system.productId) &&
    systemSlug === diagramEntityRef
  ) {
    // Group hubs (sibling systems under the same product) stay on the context ref
    // as a non-drill frame. A lone matching product/fallback owns containers and
    // must use the nested system ref so Zoom identity matches ADR-0002.
    const hasNestedMembers = systems.some(s => {
      if (s.entityRef === system.entityRef) return false;
      if (s.parentEntityRef === system.entityRef) return true;
      return s.productId === system.productId && EntityRef.parse(s.entityRef) !== diagramEntityRef;
    });
    if (hasNestedMembers) {
      return diagramEntityRef;
    }
    return resolveSystemEntityRef(diagramEntityRef, system.entityRef);
  }
  return EntityRef.parse(system.entityRef, diagramEntityRef);
}

function resolveDiagramEntityRefForSystems(contextName: string): string {
  return EntityRef.parse(contextName);
}

function systemLabel(displayName: string, systemEntityRef: string): string {
  const raw = displayName || systemEntityRef;
  const titled = raw.charAt(0).toUpperCase() + raw.slice(1);
  return titled.endsWith(' System') ? titled : `${titled} System`;
}

/** Top-level nodes on the context canvas (no visual parent). */
export function topLevelSystemNodes(nodes: SystemNode[]): SystemNode[] {
  return nodes.filter(n => n.type !== 'person' && !n.parentEntityRef);
}

function shouldEmitAsGroup(
  system: ContextSystemInput,
  systemRef: string,
  systems: ContextSystemInput[],
  contextNodes: SystemNode[],
  batchHubByProduct: Map<string, string>,
  isHub: boolean
): boolean {
  const hasChildrenInBatch = systems.some(s => s.parentEntityRef === system.entityRef);
  const hasChildrenInSchema = contextNodes.some(n => n.parentEntityRef === systemRef);
  const hasProductMembers =
    isHub &&
    (systems.some(s => s.productId === system.productId && s.entityRef !== system.entityRef) ||
      contextNodes.some(
        n =>
          n.properties?.productId === system.productId &&
          n.entityRef !== systemRef &&
          n.entityRef !== batchHubByProduct.get(system.productId)
      ));

  return hasChildrenInBatch || hasChildrenInSchema || hasProductMembers;
}

/** Person → each top-level system or group. */
export function personDependenciesForSystems(
  personRef: string,
  nodes: SystemNode[]
): SystemDependency[] {
  return topLevelSystemNodes(nodes).map(system => ({
    from: personRef,
    to: system.entityRef,
    type: 'direct-call' as const,
    description: PERSON_EDGE_DESCRIPTION,
  }));
}

function hubRefForProduct(nodes: SystemNode[], productId: string): string | undefined {
  return hubRefForProductNodes(nodes, productId);
}

function isContextSystemNode(node: SystemNode): boolean {
  return node.type === 'software-system' || node.type === 'group';
}

export class ContextLevelWriter extends BaseWriter {
  async write(
    rootDir: string,
    contextName: string,
    systemEntityRef: string,
    displayName?: string,
    rootPath: string = ''
  ): Promise<void> {
    await this.writeSystems(rootDir, contextName, [
      {
        entityRef: systemEntityRef,
        displayName: displayName || systemEntityRef,
        rootPath,
        productId: systemEntityRef,
        isProductHub: true,
      },
    ]);
  }

  /**
   * Upsert software systems into a declared or generated context diagram.
   * Hydrates scan findings, preserves author-owned personas / third-parties /
   * system anchors, and prunes in-scope scan orphans.
   */
  async writeSystems(
    rootDir: string,
    contextName: string,
    systems: ContextSystemInput[],
    options?: {
      forensicsComponentNodes?: SystemNode[];
      source?: SourceProvenance;
      proposedThirdParties?: SystemNode[];
      proposedDependencies?: SystemDependency[];
    }
  ): Promise<void> {
    if (systems.length === 0) return;

    const contextRef = EntityRef.parse(contextName);
    const diagramEntityRef = resolveDiagramEntityRefForSystems(contextName);
    const nestedRelativePath = nestedContextRelativePath(diagramEntityRef);
    const nestedPath = this.fileSystem.getAbsolutePath(rootDir, nestedRelativePath);
    const rootSeedPath = this.fileSystem.getAbsolutePath(rootDir, LEGACY_CONTEXT_RELATIVE_PATH);
    const legacyApplicationPath = this.fileSystem.getAbsolutePath(
      rootDir,
      APPLICATION_CONTEXT_RELATIVE_PATH
    );

    const seedRelativePath = resolveContextSeedRelativePath(diagramEntityRef, {
      nestedExists: this.fileSystem.exists(nestedPath),
      rootExists: this.fileSystem.exists(rootSeedPath),
    });
    const targetPath = this.fileSystem.getAbsolutePath(rootDir, seedRelativePath);

    const loaded = await this.loadExistingContext(
      targetPath,
      nestedPath,
      legacyApplicationPath,
      rootSeedPath,
      diagramEntityRef
    );
    const baseSchema = loaded.schema;
    const previousNodes = baseSchema ? [...baseSchema.nodes] : [];
    const baseNodes = baseSchema ? [...baseSchema.nodes] : [];

    const batchHubByProduct = new Map<string, string>();
    const shapedRefs = new Set<string>();

    for (const system of systems) {
      const isHub = !!system.isProductHub || system.entityRef === system.productId;
      const systemRef = hubSystemRef(system, diagramEntityRef, systems);
      shapedRefs.add(systemRef);
      if (isHub) {
        batchHubByProduct.set(system.productId, systemRef);
      }
    }

    const shapedNodes: SystemNode[] = [];
    for (const system of systems) {
      const isHub = !!system.isProductHub || system.entityRef === system.productId;
      const systemRef = hubSystemRef(system, diagramEntityRef, systems);
      const isGroup = shouldEmitAsGroup(
        system,
        systemRef,
        systems,
        baseNodes,
        batchHubByProduct,
        isHub
      );
      const hubParentRef = !isHub
        ? (batchHubByProduct.get(system.productId) ?? hubRefForProduct(baseNodes, system.productId))
        : undefined;
      const parentEntityRef = system.parentEntityRef
        ? EntityRef.parse(system.parentEntityRef, diagramEntityRef)
        : hubParentRef;

      shapedNodes.push({
        entityRef: systemRef,
        type: isGroup ? 'group' : 'software-system',
        name: systemLabel(system.displayName, system.entityRef),
        properties: {
          rootPath: system.rootPath,
          productId: system.productId,
        },
        ...(parentEntityRef ? { parentEntityRef } : {}),
      });
    }

    let groupingNodes = [...baseNodes];
    for (const systemNode of shapedNodes) {
      const existingIdx = groupingNodes.findIndex(n => n.entityRef === systemNode.entityRef);
      if (existingIdx >= 0) {
        const existing = groupingNodes[existingIdx]!;
        groupingNodes[existingIdx] = {
          ...existing,
          ...systemNode,
          properties: {
            ...existing.properties,
            ...systemNode.properties,
          },
          parentEntityRef: systemNode.parentEntityRef ?? existing.parentEntityRef,
        };
      } else {
        groupingNodes.push(systemNode);
      }
    }
    groupingNodes = normalizeContextGrouping(groupingNodes);

    // Include shaped refs plus hubs that absorbed shaped children during normalize.
    const scanSystems = groupingNodes.filter(n => {
      if (!isContextSystemNode(n)) return false;
      if (shapedRefs.has(n.entityRef)) return true;
      return groupingNodes.some(
        child => shapedRefs.has(child.entityRef) && child.parentEntityRef === n.entityRef
      );
    });

    const landscapeName = resolveContextDisplayName(diagramEntityRef);
    let { schema: contextSchema } = hydrateContextSchema({
      base: baseSchema,
      landscapeEntityRef: diagramEntityRef,
      landscapeName,
      version: systemSchemaPublicUrl(),
      scanSystems,
      ownershipRootPaths: systems.map(s => s.rootPath).filter(Boolean),
      proposedThirdParties: options?.proposedThirdParties,
      proposedDependencies: options?.proposedDependencies,
    });

    if (options?.forensicsComponentNodes?.length) {
      contextSchema = attachForensicsToSchema(contextSchema, new Map(), {
        componentNodes: options.forensicsComponentNodes,
      });
    }

    if (options?.source) {
      contextSchema = { ...contextSchema, source: options.source };
    }

    contextSchema = {
      ...contextSchema,
      entityRef: diagramEntityRef,
      name: landscapeName,
      nodes: seedPreservedPositions(previousNodes, contextSchema.nodes),
    };

    contextSchema = {
      ...contextSchema,
      nodes: pruneEmptyProductHubs(contextSchema.nodes, ['infrastructure']),
    };

    await this.writeYaml(targetPath, contextSchema);
    this.logger.info(`📄 Saved Context schema for [${contextRef}]: ${targetPath}`);
  }

  private async loadExistingContext(
    targetPath: string,
    nestedPath: string,
    legacyApplicationPath: string,
    rootSeedPath: string,
    diagramEntityRef: string
  ): Promise<{ schema: SystemSchema | null; readPath: string | null }> {
    const candidates = [targetPath];
    if (nestedPath !== targetPath) candidates.push(nestedPath);
    if (diagramEntityRef === EntityRef.parse('application')) {
      candidates.push(legacyApplicationPath);
    }
    if (rootSeedPath !== targetPath) candidates.push(rootSeedPath);

    const seen = new Set<string>();
    for (const readPath of candidates) {
      if (seen.has(readPath)) continue;
      seen.add(readPath);
      if (!this.fileSystem.exists(readPath)) continue;

      try {
        const existingYaml = await this.fileSystem.readSchema(readPath);
        const parsed = parseSchemaFromYaml(existingYaml);
        const parsedRef = parsed.entityRef ? EntityRef.parse(parsed.entityRef) : diagramEntityRef;

        if (readPath !== targetPath && readPath !== nestedPath && parsedRef !== diagramEntityRef) {
          continue;
        }
        if (
          readPath === rootSeedPath &&
          targetPath !== rootSeedPath &&
          parsedRef !== diagramEntityRef
        ) {
          continue;
        }

        return {
          schema: {
            ...parsed,
            entityRef: diagramEntityRef,
            name: resolveContextDisplayName(diagramEntityRef),
            nodes: parsed.nodes ? [...parsed.nodes] : [],
            dependencies: parsed.dependencies ? [...parsed.dependencies] : [],
          },
          readPath,
        };
      } catch (err) {
        this.logger.warn(
          `Failed to parse existing context diagram (${err}). Reinitializing context diagram.`
        );
        return { schema: null, readPath };
      }
    }

    return { schema: null, readPath: null };
  }
}
