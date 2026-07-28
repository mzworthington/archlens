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

/** Auto-managed edges from the context Person actor to each top-level system. */
export const PERSON_EDGE_DESCRIPTION = 'Uses';
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
    const targetPath = this.fileSystem.getAbsolutePath(rootDir, 'context.yaml');
    let contextSchema = await this.loadExistingContext(targetPath, contextName, contextRef);
    const previousNodes = [...contextSchema.nodes];
    const touchedRefs = new Set<string>();
    const touchedProductIds = new Set(systems.map(s => s.productId).filter(Boolean));
    const batchHubByProduct = new Map<string, string>();

    for (const system of systems) {
      const systemRef = EntityRef.parse(system.entityRef, contextRef);
      touchedRefs.add(systemRef);
      const isHub = !!system.isProductHub || system.entityRef === system.productId;
      if (isHub) {
        batchHubByProduct.set(system.productId, systemRef);
      }
    }

    for (const system of systems) {
      const systemRef = EntityRef.parse(system.entityRef, contextRef);
      const isHub = !!system.isProductHub || system.entityRef === system.productId;
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
        ? EntityRef.parse(system.parentEntityRef, contextRef)
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

    const person = ensureContextPerson(contextRef, contextSchema.nodes);
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
    contextName: string,
    contextRef: string
  ): Promise<SystemSchema> {
    if (this.fileSystem.exists(targetPath)) {
      try {
        const existingYaml = await this.fileSystem.readSchema(targetPath);
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
          `Failed to parse existing context.yaml (${err}). Reinitializing context diagram.`
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
