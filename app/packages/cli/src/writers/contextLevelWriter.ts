import { BaseWriter } from './baseWriter.ts';
import type { SystemDependency, SystemNode, SystemSchema, SourceProvenance } from '@archlens/core';
import { EntityRef, parseSchemaFromYaml, systemSchemaPublicUrl } from '@archlens/core';
import { seedPreservedPositions } from '@archlens/core/layout';
import { attachForensicsToSchema } from '../forensics/domain/attachForensics.ts';
import {
  hubRefForProductNodes,
  normalizeContextGrouping,
  pruneEmptyProductHubs,
} from '../analysis/domain/systemDiscovery.ts';

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

/** Legacy root-level context path (migrated on read/write). */
export const LEGACY_CONTEXT_RELATIVE_PATH = 'context.yaml';

/** Auto-managed edges from the context Person actor to each top-level system. */
export const PERSON_EDGE_DESCRIPTION = 'Uses';

/** Context diagram identity for application/context.yaml (peer with golden-paths, infrastructure). */
export const APPLICATION_CONTEXT_ENTITY_REF = 'application';

/** Product roots that own a dedicated peer context diagram under blueprints/. */
export const PEER_CONTEXT_ENTITY_REFS: Record<string, string> = {
  application: 'application',
  blueprint: 'blueprint',
  backstage: 'backstage',
  eshop: 'eshop',
  'chaoslens-stress': 'chaoslens-stress',
  'advicelens-stress': 'advicelens-stress',
  infrastructure: 'infrastructure',
  'golden-paths': 'golden-paths',
  'golden-journey': 'golden-paths',
};

/** Maps a scanned productId to the peer context that owns its context diagram. */
export const PRODUCT_CONTEXT_ENTITY: Record<string, string> = {
  backstage: 'backstage',
  packages: 'backstage',
  plugins: 'backstage',
  microsite: 'backstage',
  'docs-ui': 'backstage',
  'techdocs-s3-storage': 'backstage',
  blueprint: 'blueprint',
  app: 'blueprint',
  sim: 'blueprint',
  eshop: 'eshop',
  'chaoslens-stress': 'chaoslens-stress',
  'advicelens-stress': 'advicelens-stress',
  infrastructure: 'infrastructure',
  'golden-journey': 'golden-paths',
  'gpio-build-monitor': 'application',
};

function resolveContextDiagramEntityRef(contextName: string): string {
  const slug = EntityRef.parse(contextName);
  return PEER_CONTEXT_ENTITY_REFS[slug] ?? slug;
}

function contextRelativePathForEntityRef(diagramEntityRef: string): string {
  if (diagramEntityRef === 'golden-paths') return 'golden-journey/context.yaml';
  return `${diagramEntityRef}/context.yaml`;
}

function hubSystemRef(system: ContextSystemInput, diagramEntityRef: string): string {
  if (
    system.isProductHub &&
    system.entityRef === system.productId &&
    system.entityRef === diagramEntityRef
  ) {
    return diagramEntityRef;
  }
  return EntityRef.parse(system.entityRef, diagramEntityRef);
}

function resolveDiagramEntityRefForSystems(
  contextName: string,
  systems: ContextSystemInput[]
): string {
  const fromContext = resolveContextDiagramEntityRef(contextName);
  const productIds = [...new Set(systems.map(s => s.productId).filter(Boolean))];
  if (productIds.length === 1) {
    const mapped = PRODUCT_CONTEXT_ENTITY[productIds[0]!];
    if (mapped) return mapped;
  }
  return fromContext;
}

/** Leaf segment for the single context-level person node (`{context}/user`). */
export const CONTEXT_PERSON_LEAF = 'user';

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

function isManagedPersonEdge(dep: SystemDependency): boolean {
  return dep.description === PERSON_EDGE_DESCRIPTION;
}

function ensureContextPerson(contextRef: string, nodes: SystemNode[]): SystemNode {
  const personRef = EntityRef.parse(CONTEXT_PERSON_LEAF, contextRef);
  const personNode: SystemNode = {
    entityRef: personRef,
    type: 'person',
    name: 'User',
    properties: {
      role: 'context-actor',
    },
  };

  const existingIdx = nodes.findIndex(
    n =>
      n.entityRef === personRef || (n.type === 'person' && n.properties?.role === 'context-actor')
  );
  if (existingIdx >= 0) {
    const existing = nodes[existingIdx]!;
    nodes[existingIdx] = {
      ...existing,
      ...personNode,
      properties: {
        ...existing.properties,
        ...personNode.properties,
      },
    };
    return nodes[existingIdx]!;
  }

  nodes.push(personNode);
  return personNode;
}

function hubRefForProduct(nodes: SystemNode[], productId: string): string | undefined {
  return hubRefForProductNodes(nodes, productId);
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
   * Upsert software systems and nest non-hub systems under their product group.
   * Ensures a single Person actor linked to each top-level group/system.
   */
  async writeSystems(
    rootDir: string,
    contextName: string,
    systems: ContextSystemInput[],
    options?: {
      forensicsComponentNodes?: SystemNode[];
      source?: SourceProvenance;
    }
  ): Promise<void> {
    if (systems.length === 0) return;

    const contextRef = EntityRef.parse(contextName);
    const diagramEntityRef = resolveDiagramEntityRefForSystems(contextName, systems);
    const contextRelativePath = contextRelativePathForEntityRef(diagramEntityRef);
    const targetPath = this.fileSystem.getAbsolutePath(rootDir, contextRelativePath);
    const legacyApplicationPath = this.fileSystem.getAbsolutePath(
      rootDir,
      APPLICATION_CONTEXT_RELATIVE_PATH
    );
    const legacyPath = this.fileSystem.getAbsolutePath(rootDir, LEGACY_CONTEXT_RELATIVE_PATH);
    let contextSchema = await this.loadExistingContext(
      targetPath,
      legacyApplicationPath,
      legacyPath,
      contextName,
      diagramEntityRef
    );
    const previousNodes = [...contextSchema.nodes];
    const touchedRefs = new Set<string>();
    const touchedProductIds = new Set(systems.map(s => s.productId).filter(Boolean));
    const batchHubByProduct = new Map<string, string>();

    for (const system of systems) {
      const isHub = !!system.isProductHub || system.entityRef === system.productId;
      const systemRef = hubSystemRef(system, diagramEntityRef);
      touchedRefs.add(systemRef);
      if (isHub) {
        batchHubByProduct.set(system.productId, systemRef);
      }
    }

    for (const system of systems) {
      const isHub = !!system.isProductHub || system.entityRef === system.productId;
      const systemRef = hubSystemRef(system, diagramEntityRef);
      const isGroup = shouldEmitAsGroup(
        system,
        systemRef,
        systems,
        contextSchema.nodes,
        batchHubByProduct,
        isHub
      );
      const hubParentRef = !isHub
        ? (batchHubByProduct.get(system.productId) ??
          hubRefForProduct(contextSchema.nodes, system.productId))
        : undefined;
      const parentEntityRef = system.parentEntityRef
        ? EntityRef.parse(system.parentEntityRef, diagramEntityRef)
        : hubParentRef;

      const systemNode: SystemNode = {
        entityRef: systemRef,
        type: isGroup ? 'group' : 'software-system',
        name: systemLabel(system.displayName, system.entityRef),
        properties: {
          rootPath: system.rootPath,
          productId: system.productId,
        },
        ...(parentEntityRef ? { parentEntityRef } : {}),
      };

      const existingIdx = contextSchema.nodes.findIndex(n => n.entityRef === systemRef);
      if (existingIdx >= 0) {
        const existing = contextSchema.nodes[existingIdx]!;
        contextSchema.nodes[existingIdx] = {
          ...existing,
          ...systemNode,
          properties: {
            ...existing.properties,
            ...systemNode.properties,
          },
          parentEntityRef: systemNode.parentEntityRef ?? existing.parentEntityRef,
        };
      } else {
        contextSchema.nodes.push(systemNode);
      }
    }

    contextSchema = {
      ...contextSchema,
      nodes: normalizeContextGrouping(contextSchema.nodes),
    };

    const person = ensureContextPerson(diagramEntityRef, contextSchema.nodes);
    const personDeps = personDependenciesForSystems(person.entityRef, contextSchema.nodes);

    const preserved = (contextSchema.dependencies || []).filter(dep => {
      if (isManagedPersonEdge(dep)) return false;
      if (touchedRefs.has(dep.from) || touchedRefs.has(dep.to)) return false;
      const fromNode = contextSchema.nodes.find(n => n.entityRef === dep.from);
      const toNode = contextSchema.nodes.find(n => n.entityRef === dep.to);
      const fromProduct = String(fromNode?.properties?.productId || '');
      const toProduct = String(toNode?.properties?.productId || '');
      if (touchedProductIds.has(fromProduct) || touchedProductIds.has(toProduct)) {
        return false;
      }
      return true;
    });

    contextSchema.dependencies = [...preserved, ...personDeps];

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
      name: contextSchema.name || contextDisplayName(contextName),
      nodes: seedPreservedPositions(previousNodes, contextSchema.nodes),
    };

    contextSchema = {
      ...contextSchema,
      nodes: pruneEmptyProductHubs(contextSchema.nodes, ['infrastructure']),
    };

    await this.writeYaml(targetPath, contextSchema);
    if (legacyPath !== targetPath && this.fileSystem.exists(legacyPath)) {
      this.fileSystem.unlink(legacyPath);
      this.logger.info(`Removed legacy context diagram after migration: ${legacyPath}`);
    }
    this.logger.info(`📄 Saved Context schema for [${contextRef}]: ${targetPath}`);
  }

  private async loadExistingContext(
    targetPath: string,
    legacyApplicationPath: string,
    legacyPath: string,
    contextName: string,
    contextRef: string
  ): Promise<SystemSchema> {
    const readPath = this.fileSystem.exists(targetPath)
      ? targetPath
      : this.fileSystem.exists(legacyApplicationPath)
        ? legacyApplicationPath
        : this.fileSystem.exists(legacyPath)
          ? legacyPath
          : null;

    if (readPath) {
      try {
        const existingYaml = await this.fileSystem.readSchema(readPath);
        const parsed = parseSchemaFromYaml(existingYaml);
        return {
          ...parsed,
          entityRef: parsed.entityRef || contextRef,
          name: parsed.name || contextDisplayName(contextName),
          nodes: parsed.nodes ? [...parsed.nodes] : [],
          dependencies: parsed.dependencies ? [...parsed.dependencies] : [],
        };
      } catch (err) {
        this.logger.warn(
          `Failed to parse existing context diagram (${err}). Reinitializing context diagram.`
        );
      }
    }

    return {
      entityRef: contextRef,
      name: contextDisplayName(contextName),
      version: systemSchemaPublicUrl(),
      level: 'context',
      nodes: [],
      dependencies: [],
    };
  }
}
