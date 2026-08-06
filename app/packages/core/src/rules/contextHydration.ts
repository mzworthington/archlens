import type { SystemDependency, SystemNode, SystemSchema } from '../models/schema';
import { EntityRef } from '../models/schema';
import { preferDisplayName } from '../lib/displayName';
import { isHumanActorNode, isThirdPartyNode } from '../taxonomy/nodeOwnership';

/** Durable ownership stamp on context nodes (`properties.contextOwnership`). */
export const CONTEXT_OWNERSHIP_PROPERTY = 'contextOwnership';
export const CONTEXT_OWNERSHIP_AUTHOR = 'author';
export const CONTEXT_OWNERSHIP_SCAN = 'scan';

/** Leaf segment for the fallback context-level person (`{landscape}/user`). */
export const CONTEXT_PERSON_LEAF = 'user';
export const CONTEXT_ACTOR_ROLE = 'context-actor';

/** Auto-managed edges from the fallback context actor to top-level systems. */
export const PERSON_EDGE_DESCRIPTION = 'Uses';

export type ContextHydrationInput = {
  base: SystemSchema | null;
  landscapeEntityRef: string;
  landscapeName: string;
  version: string;
  /** Fully shaped scan systems (hub/group rules applied by the caller). */
  scanSystems: SystemNode[];
  /** `rootPath` values this scan is authoritative for (orphan prune scope). */
  ownershipRootPaths: string[];
  /** Extension point: scanner-proposed third-party nodes. */
  proposedThirdParties?: SystemNode[];
  proposedDependencies?: SystemDependency[];
};

export type ContextHydrationResult = {
  schema: SystemSchema;
  prunedEntityRefs: string[];
};

function isContextSystemType(type: SystemNode['type']): boolean {
  return type === 'software-system' || type === 'group';
}

function hasProductPersona(nodes: readonly SystemNode[]): boolean {
  return nodes.some(n => n.type === 'person' && n.properties?.role === 'product-persona');
}

function rootPathOf(node: SystemNode): string {
  const value = node.properties?.rootPath;
  return typeof value === 'string' ? value : '';
}

function withOwnership(node: SystemNode, ownership: string): SystemNode {
  return {
    ...node,
    properties: {
      ...node.properties,
      [CONTEXT_OWNERSHIP_PROPERTY]: ownership,
    },
  };
}

/**
 * Author-owned: human actors, third-parties, explicit author stamp, or sparse
 * unmarked system anchors (no rootPath yet).
 */
export function isAuthorOwnedContextNode(node: SystemNode): boolean {
  if (isHumanActorNode(node) || isThirdPartyNode(node)) return true;
  const ownership = node.properties?.[CONTEXT_OWNERSHIP_PROPERTY];
  if (ownership === CONTEXT_OWNERSHIP_AUTHOR) return true;
  if (ownership === CONTEXT_OWNERSHIP_SCAN) return false;
  if (!isContextSystemType(node.type)) return false;
  return !rootPathOf(node);
}

/** Scan-owned systems/groups eligible for in-scope orphan prune. */
export function isScanOwnedContextNode(node: SystemNode): boolean {
  if (!isContextSystemType(node.type)) return false;
  if (isAuthorOwnedContextNode(node)) return false;
  const ownership = node.properties?.[CONTEXT_OWNERSHIP_PROPERTY];
  if (ownership === CONTEXT_OWNERSHIP_SCAN) return true;
  return Boolean(rootPathOf(node));
}

function isManagedPersonEdge(dep: SystemDependency): boolean {
  return dep.description === PERSON_EDGE_DESCRIPTION;
}

function topLevelOwnedSystemNodes(nodes: readonly SystemNode[]): SystemNode[] {
  return nodes.filter(
    n => n.type !== 'person' && !n.parentEntityRef && !isThirdPartyNode(n) && !n.external
  );
}

function personDependenciesForSystems(
  personRef: string,
  nodes: readonly SystemNode[]
): SystemDependency[] {
  return topLevelOwnedSystemNodes(nodes).map(system => ({
    from: personRef,
    to: system.entityRef,
    type: 'direct-call' as const,
    description: PERSON_EDGE_DESCRIPTION,
  }));
}

/**
 * When IaC proposes edges from the landscape id but the diagram only has nested
 * systems (e.g. `blueprint/archlens`), retarget to a live owned top-level system.
 */
function resolveProposedDependencyFrom(
  from: string,
  landscapeEntityRef: string,
  nodes: readonly SystemNode[]
): string {
  if (nodes.some(n => n.entityRef === from)) return from;
  if (from !== landscapeEntityRef) return from;

  const top = topLevelOwnedSystemNodes(nodes);
  if (top.length === 1) return top[0]!.entityRef;
  const group = top.find(n => n.type === 'group');
  if (group) return group.entityRef;
  return from;
}

function ensureContextActor(landscapeEntityRef: string, nodes: SystemNode[]): SystemNode {
  const personRef = EntityRef.parse(CONTEXT_PERSON_LEAF, landscapeEntityRef);
  const personNode: SystemNode = {
    entityRef: personRef,
    type: 'person',
    name: 'User',
    properties: {
      role: CONTEXT_ACTOR_ROLE,
      [CONTEXT_OWNERSHIP_PROPERTY]: CONTEXT_OWNERSHIP_SCAN,
    },
  };

  const existingIdx = nodes.findIndex(
    n =>
      n.entityRef === personRef ||
      (n.type === 'person' && n.properties?.role === CONTEXT_ACTOR_ROLE)
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

function removeContextActors(nodes: SystemNode[]): SystemNode[] {
  return nodes.filter(n => !(n.type === 'person' && n.properties?.role === CONTEXT_ACTOR_ROLE));
}

function mergeSystemNode(existing: SystemNode, scan: SystemNode): SystemNode {
  const ownership = isScanOwnedContextNode(existing)
    ? CONTEXT_OWNERSHIP_SCAN
    : CONTEXT_OWNERSHIP_AUTHOR;

  return withOwnership(
    {
      ...existing,
      type: scan.type,
      // Author-owned labels win over scan; otherwise prefer explicit over derived.
      name:
        ownership === CONTEXT_OWNERSHIP_AUTHOR
          ? existing.name
          : preferDisplayName(existing.name, scan.name, existing.entityRef),
      parentEntityRef: scan.parentEntityRef ?? existing.parentEntityRef,
      external: existing.external,
      position: existing.position ?? scan.position,
      forensics: scan.forensics ?? existing.forensics,
      resilience: existing.resilience ?? scan.resilience,
      properties: {
        ...existing.properties,
        ...scan.properties,
        [CONTEXT_OWNERSHIP_PROPERTY]: ownership,
      },
    },
    ownership
  );
}

function edgeKey(dep: SystemDependency): string {
  return `${dep.from}|${dep.to}|${dep.type}|${dep.description || ''}`;
}

function emptySchema(
  landscapeEntityRef: string,
  landscapeName: string,
  version: string
): SystemSchema {
  return {
    entityRef: landscapeEntityRef,
    name: landscapeName,
    version,
    level: 'context',
    nodes: [],
    dependencies: [],
  };
}

/**
 * Hydrate a system context: upsert scan systems, preserve author-owned personas /
 * third-parties / system anchors, prune in-scope scan orphans, and apply
 * persona-aware fallback actor policy.
 */
export function hydrateContextSchema(input: ContextHydrationInput): ContextHydrationResult {
  const landscapeEntityRef = EntityRef.parse(input.landscapeEntityRef);
  const base = input.base
    ? {
        ...input.base,
        entityRef: landscapeEntityRef,
        name: input.landscapeName || input.base.name,
        nodes: input.base.nodes ? [...input.base.nodes] : [],
        dependencies: input.base.dependencies ? [...input.base.dependencies] : [],
      }
    : emptySchema(landscapeEntityRef, input.landscapeName, input.version);

  const nodesByRef = new Map<string, SystemNode>();
  for (const node of base.nodes) {
    nodesByRef.set(node.entityRef, { ...node, properties: { ...node.properties } });
  }

  const discoveredRefs = new Set(input.scanSystems.map(s => s.entityRef));
  const ownershipRoots = new Set(input.ownershipRootPaths.filter(Boolean));

  for (const scan of input.scanSystems) {
    const existing = nodesByRef.get(scan.entityRef);
    if (existing) {
      nodesByRef.set(scan.entityRef, mergeSystemNode(existing, scan));
    } else {
      nodesByRef.set(scan.entityRef, withOwnership(scan, CONTEXT_OWNERSHIP_SCAN));
    }
  }

  for (const proposed of input.proposedThirdParties ?? []) {
    if (!isThirdPartyNode(proposed) && !proposed.external) continue;
    const existing = nodesByRef.get(proposed.entityRef);
    if (existing) {
      nodesByRef.set(proposed.entityRef, {
        ...existing,
        ...proposed,
        name: preferDisplayName(existing.name, proposed.name, existing.entityRef),
        properties: {
          ...existing.properties,
          ...proposed.properties,
          [CONTEXT_OWNERSHIP_PROPERTY]: CONTEXT_OWNERSHIP_AUTHOR,
        },
      });
    } else {
      nodesByRef.set(
        proposed.entityRef,
        withOwnership(
          {
            ...proposed,
            external: true,
            properties: {
              ...proposed.properties,
              classification: proposed.properties?.classification ?? 'third-party',
            },
          },
          CONTEXT_OWNERSHIP_AUTHOR
        )
      );
    }
  }

  const prunedEntityRefs: string[] = [];
  for (const [ref, node] of [...nodesByRef.entries()]) {
    if (!isScanOwnedContextNode(node)) continue;
    if (discoveredRefs.has(ref)) continue;
    const root = rootPathOf(node);
    if (!root || !ownershipRoots.has(root)) continue;
    nodesByRef.delete(ref);
    prunedEntityRefs.push(ref);
  }

  let nodes = [...nodesByRef.values()];
  const pruned = new Set(prunedEntityRefs);

  // Stamp sparse author anchors that were not scan-touched.
  nodes = nodes.map(node => {
    if (!isContextSystemType(node.type)) {
      if (isHumanActorNode(node) || isThirdPartyNode(node)) {
        return withOwnership(node, CONTEXT_OWNERSHIP_AUTHOR);
      }
      return node;
    }
    if (node.properties?.[CONTEXT_OWNERSHIP_PROPERTY]) return node;
    return withOwnership(
      node,
      isAuthorOwnedContextNode(node) ? CONTEXT_OWNERSHIP_AUTHOR : CONTEXT_OWNERSHIP_SCAN
    );
  });

  const usePersonas = hasProductPersona(nodes);
  if (usePersonas) {
    nodes = removeContextActors(nodes);
  } else {
    ensureContextActor(landscapeEntityRef, nodes);
  }

  const liveRefs = new Set(nodes.map(n => n.entityRef));
  const preservedDeps = (base.dependencies || []).filter(dep => {
    if (isManagedPersonEdge(dep)) return false;
    if (pruned.has(dep.from) || pruned.has(dep.to)) return false;
    if (!liveRefs.has(dep.from) || !liveRefs.has(dep.to)) return false;
    return true;
  });

  const depKeys = new Set(preservedDeps.map(edgeKey));
  const proposedDeps = (input.proposedDependencies ?? [])
    .map(dep => ({
      ...dep,
      from: resolveProposedDependencyFrom(dep.from, landscapeEntityRef, nodes),
    }))
    .filter(dep => {
      if (!liveRefs.has(dep.from) || !liveRefs.has(dep.to)) return false;
      const key = edgeKey(dep);
      if (depKeys.has(key)) return false;
      depKeys.add(key);
      return true;
    });

  let dependencies = [...preservedDeps, ...proposedDeps];
  if (!usePersonas) {
    const actorRef = EntityRef.parse(CONTEXT_PERSON_LEAF, landscapeEntityRef);
    dependencies = [
      ...dependencies.filter(d => !isManagedPersonEdge(d)),
      ...personDependenciesForSystems(actorRef, nodes),
    ];
  }

  return {
    schema: {
      ...base,
      entityRef: landscapeEntityRef,
      name: input.landscapeName || base.name,
      version: input.version || base.version,
      level: 'context',
      nodes,
      dependencies,
    },
    prunedEntityRefs,
  };
}
