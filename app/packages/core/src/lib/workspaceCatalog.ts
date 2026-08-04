import type { C4Level, NodeType, SystemSchema } from '../models/schema';
import { getSchemaEntityRef, entityRefParentPrefix } from './entityRef';

export type LoadedSystemSchemaRef = { path: string; schema: SystemSchema };

/** External proxy node materialized on a child diagram one level below a parent node. */
export type ChildDiagramExternal = {
  entityRef: string;
  name: string;
  type: NodeType;
};

/** Lightweight navigation metadata for a workspace diagram file. */
export type WorkspaceCatalogEntry = {
  path: string;
  name: string;
  level: C4Level;
  entityRef: string;
  /** Resolved node entityRefs on this diagram (used for parent/child discovery). */
  nodeEntityRefs: string[];
  /** entityRef of the parent diagram, if another catalog entry owns this schema's entityRef as a node. */
  parentEntityRef?: string;
};

/**
 * Build a navigation catalog from resolved workspace schemas.
 * Does not retain full schema bodies - only identity and hierarchy hints.
 */
export function buildWorkspaceCatalog(
  files: Array<{ path: string; schema: SystemSchema }>,
  workspaceName?: string | null
): WorkspaceCatalogEntry[] {
  const entries: WorkspaceCatalogEntry[] = files.map(({ path, schema }) => {
    const entityRef = getSchemaEntityRef(schema, workspaceName);
    const nodeEntityRefs = schema.nodes
      .filter(n => !n.external)
      .map(n => n.entityRef)
      .filter((ref): ref is string => typeof ref === 'string' && ref.length > 0);
    return {
      path,
      name: schema.name,
      level: schema.level,
      entityRef,
      nodeEntityRefs,
    };
  });

  const ownerByNodeRef = new Map<string, string>();
  for (const entry of entries) {
    for (const nodeRef of entry.nodeEntityRefs) {
      if (!ownerByNodeRef.has(nodeRef)) {
        ownerByNodeRef.set(nodeRef, entry.entityRef);
      }
    }
  }

  const contextEntityRefs = new Set(
    entries.filter(entry => entry.level === 'context').map(entry => entry.entityRef)
  );

  return entries.map(entry => {
    const parentFromNodes = ownerByNodeRef.get(entry.entityRef);
    if (parentFromNodes && parentFromNodes !== entry.entityRef) {
      return { ...entry, parentEntityRef: parentFromNodes };
    }
    if (entry.level === 'context') {
      return entry;
    }
    const prefixParent = entityRefParentPrefix(entry.entityRef);
    if (prefixParent && contextEntityRefs.has(prefixParent)) {
      return { ...entry, parentEntityRef: prefixParent };
    }
    return entry;
  });
}

/** Walk parentEntityRef links from a catalog entry up to the workspace root. */
export function buildCatalogAncestorChain(
  catalog: readonly WorkspaceCatalogEntry[],
  entityRef: string
): WorkspaceCatalogEntry[] {
  if (!entityRef) return [];

  const entry = catalog.find(item => item.entityRef === entityRef);
  if (!entry) return [];

  const chain: WorkspaceCatalogEntry[] = [];
  const seen = new Set<string>();
  let current: WorkspaceCatalogEntry | undefined = entry;

  while (current) {
    if (seen.has(current.entityRef)) break;
    seen.add(current.entityRef);
    chain.unshift(current);
    if (!current.parentEntityRef) break;
    current = catalog.find(item => item.entityRef === current!.parentEntityRef);
  }

  return chain;
}

/**
 * Merge catalog entries by path. Keeps stub/path-based entries while enriching
 * loaded diagrams with real nodeEntityRefs and parent links.
 */
export function mergeWorkspaceCatalogEntries(
  base: WorkspaceCatalogEntry[],
  updates: WorkspaceCatalogEntry[]
): WorkspaceCatalogEntry[] {
  const byPath = new Map(base.map(entry => [entry.path, entry]));
  for (const entry of updates) {
    const existing = byPath.get(entry.path);
    if (!existing) {
      byPath.set(entry.path, entry);
      continue;
    }
    byPath.set(entry.path, {
      ...existing,
      ...entry,
      nodeEntityRefs:
        entry.nodeEntityRefs.length > 0 ? entry.nodeEntityRefs : existing.nodeEntityRefs,
    });
  }
  return [...byPath.values()];
}

/**
 * Resolve the diagram that canonically owns an entity in the workspace stack.
 * Returns the diagram entry when `entityRef` is the diagram identity, or the
 * first diagram that lists the ref as a native node.
 */
function diagramsWithEntityRef(
  catalog: readonly WorkspaceCatalogEntry[],
  entityRef: string
): WorkspaceCatalogEntry[] {
  return catalog.filter(entry => entry.entityRef === entityRef);
}

/**
 * When context and a child diagram incorrectly share an entityRef, URL navigation
 * should open the context (peer context switching). Drill-down uses
 * {@link resolveChildDiagramEntry}, which prefers the non-context diagram.
 */
function pickOwnDiagram(matches: WorkspaceCatalogEntry[]): WorkspaceCatalogEntry | undefined {
  if (matches.length === 0) return undefined;
  if (matches.length === 1) return matches[0];
  return matches.find(entry => entry.level === 'context') ?? matches[0];
}

function pickChildDiagram(matches: WorkspaceCatalogEntry[]): WorkspaceCatalogEntry | undefined {
  if (matches.length === 0) return undefined;
  if (matches.length === 1) return matches[0];
  return matches.find(entry => entry.level !== 'context') ?? matches[0];
}

export function resolveEntityHome(
  catalog: readonly WorkspaceCatalogEntry[],
  entityRef: string
): WorkspaceCatalogEntry | undefined {
  if (!entityRef) return undefined;

  const ownDiagram = pickOwnDiagram(diagramsWithEntityRef(catalog, entityRef));
  if (ownDiagram) return ownDiagram;

  return catalog.find(entry => entry.nodeEntityRefs.includes(entityRef));
}

/**
 * Resolve the diagram one level below `parentEntityRef`.
 * Child diagrams use `schema.entityRef === parentNode.entityRef`.
 */
export function resolveChildDiagramEntry(
  catalog: readonly WorkspaceCatalogEntry[],
  parentEntityRef: string
): WorkspaceCatalogEntry | undefined {
  if (!parentEntityRef) return undefined;
  return pickChildDiagram(diagramsWithEntityRef(catalog, parentEntityRef));
}

/** External nodes on the child diagram for a parent canvas node, when that child exists. */
export function listChildDiagramExternals(
  catalog: WorkspaceCatalogEntry[],
  loadedSystems: LoadedSystemSchemaRef[],
  parentEntityRef: string
): ChildDiagramExternal[] {
  const child = resolveChildDiagramEntry(catalog, parentEntityRef);
  if (!child) return [];

  const system = loadedSystems.find(s => s.path === child.path);
  if (!system) return [];

  return system.schema.nodes
    .filter(
      (node): node is typeof node & { entityRef: string } => !!node.external && !!node.entityRef
    )
    .map(node => ({
      entityRef: node.entityRef,
      name: node.name,
      type: node.type,
    }))
    .sort((a, b) => a.name.localeCompare(b.name));
}
