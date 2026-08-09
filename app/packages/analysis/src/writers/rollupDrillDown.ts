import type { SystemDependency, SystemNode, SystemSchema, SourceProvenance } from '@archlens/core';
import { EntityRef, slugify } from '@archlens/core';

/** Minimum source files in a rollup before emitting a drill-down diagram. */
export const ROLLUP_DRILL_DOWN_MIN_FILES = 2;

function fileLeafSegment(baseName: string): string {
  return slugify(
    baseName.replace(/([a-z0-9])([A-Z])/g, '$1-$2').replace(/([A-Z])([A-Z][a-z])/g, '$1-$2')
  );
}

export function fileLeafEntityRef(rollupEntityRef: string, baseName: string): string {
  return EntityRef.child(rollupEntityRef, fileLeafSegment(baseName));
}

/** Relative blueprint path for a rollup child diagram (e.g. `cli/writers-components.yaml`). */
export function rollupDrillDownRelativePath(
  containerEntityRef: string,
  rollupEntityRef: string
): string | null {
  const prefix = `${containerEntityRef}/`;
  if (!rollupEntityRef.startsWith(prefix)) return null;

  const suffix = rollupEntityRef.slice(prefix.length);
  if (!suffix) return null;

  const containerLeaf = EntityRef.leaf(containerEntityRef);
  return `${containerLeaf}/${suffix}-components.yaml`;
}

export function shouldEmitRollupDrillDown(node: SystemNode): boolean {
  const members = node.properties?.memberFilepaths;
  return Array.isArray(members) && members.length >= ROLLUP_DRILL_DOWN_MIN_FILES;
}

export function isImmediateChildEntityRef(
  parentEntityRef: string,
  childEntityRef: string
): boolean {
  const prefix = `${parentEntityRef}/`;
  if (!childEntityRef.startsWith(prefix)) return false;
  const rest = childEntityRef.slice(prefix.length);
  return rest.length > 0 && !rest.includes('/');
}

/** One diagram level below a rollup: direct subfolder rollups and file leaves only. */
export function collectImmediateDrillDownChildren(
  parentEntityRef: string,
  rollupNodes: readonly SystemNode[],
  fileLevelNodes: readonly SystemNode[]
): SystemNode[] {
  const byRef = new Map<string, SystemNode>();

  for (const node of rollupNodes) {
    if (!node.entityRef || !isImmediateChildEntityRef(parentEntityRef, node.entityRef)) continue;
    byRef.set(node.entityRef, node);
  }

  for (const node of fileLevelNodes) {
    if (!node.entityRef || !isImmediateChildEntityRef(parentEntityRef, node.entityRef)) continue;
    const existing = byRef.get(node.entityRef);
    if (!existing || node.properties?.filepath) {
      byRef.set(node.entityRef, node);
    }
  }

  return [...byRef.values()];
}

/**
 * Map a file-leaf (or deeper) ref onto the nearest ancestor that exists as an emitted node.
 * Single-file rollups do not emit drill-down leaves — deps must target the rollup instead.
 */
export function resolveToEmittedEntityRef(ref: string, emittedRefs: ReadonlySet<string>): string {
  let current: string | null = ref;
  while (current) {
    if (emittedRefs.has(current)) return current;
    current = EntityRef.getParent(current);
  }
  return ref;
}

export function collectRollupDrillDownDependencies(
  _rollupEntityRef: string,
  childNodes: readonly SystemNode[],
  fileLevelDependencies: readonly SystemDependency[],
  emittedRefs?: ReadonlySet<string>
): SystemDependency[] {
  const childRefs = new Set(childNodes.map(node => node.entityRef));
  const out: SystemDependency[] = [];
  const seen = new Set<string>();

  for (const dep of fileLevelDependencies) {
    if (!childRefs.has(dep.from)) continue;

    const from = emittedRefs ? resolveToEmittedEntityRef(dep.from, emittedRefs) : dep.from;
    const to = emittedRefs ? resolveToEmittedEntityRef(dep.to, emittedRefs) : dep.to;
    if (!childRefs.has(from)) continue;
    if (from === to) continue;

    const key = `${from}\0${to}\0${dep.type}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(from === dep.from && to === dep.to ? dep : { ...dep, from, to });
  }

  return out;
}

export type RollupDrillDownSchema = {
  relativePath: string;
  schema: SystemSchema;
};

function buildEmittedEntityRefs(
  rollupNodes: readonly SystemNode[],
  fileLevelNodes: readonly SystemNode[],
  emittingRollupRefs: ReadonlySet<string>
): Set<string> {
  const emitted = new Set<string>();
  for (const node of rollupNodes) {
    if (node.entityRef) emitted.add(node.entityRef);
  }
  for (const rollupRef of emittingRollupRefs) {
    for (const child of collectImmediateDrillDownChildren(rollupRef, rollupNodes, fileLevelNodes)) {
      if (child.entityRef) emitted.add(child.entityRef);
    }
  }
  return emitted;
}

/**
 * @param workspaceRollupNodes - All component/rollup nodes in the system (not only this
 *   container). Needed so cross-container file-leaf deps rewrite onto emitted rollups.
 */
export function buildRollupDrillDownSchemas(
  containerEntityRef: string,
  rollupNodes: readonly SystemNode[],
  fileLevelNodes: readonly SystemNode[],
  fileLevelDependencies: readonly SystemDependency[],
  source?: SourceProvenance,
  workspaceRollupNodes: readonly SystemNode[] = rollupNodes
): RollupDrillDownSchema[] {
  const pending: Array<{
    rollupNode: SystemNode;
    childNodes: SystemNode[];
    relativePath: string;
  }> = [];
  const emittingRollupRefs = new Set<string>();

  // Discover every drill-down that will be emitted across the workspace so leaf targets
  // under multi-file rollups stay leaf-precise, while single-file rollups collapse.
  for (const rollupNode of workspaceRollupNodes) {
    if (!rollupNode.entityRef || !shouldEmitRollupDrillDown(rollupNode)) continue;
    const childNodes = collectImmediateDrillDownChildren(
      rollupNode.entityRef,
      workspaceRollupNodes,
      fileLevelNodes
    );
    if (childNodes.length < ROLLUP_DRILL_DOWN_MIN_FILES) continue;
    emittingRollupRefs.add(rollupNode.entityRef);
  }

  for (const rollupNode of rollupNodes) {
    if (!rollupNode.entityRef || !emittingRollupRefs.has(rollupNode.entityRef)) continue;

    const childNodes = collectImmediateDrillDownChildren(
      rollupNode.entityRef,
      rollupNodes,
      fileLevelNodes
    );
    // Re-check against this container's node lists (should match workspace discovery).
    if (childNodes.length < ROLLUP_DRILL_DOWN_MIN_FILES) continue;

    const relativePath = rollupDrillDownRelativePath(containerEntityRef, rollupNode.entityRef);
    if (!relativePath) continue;

    pending.push({ rollupNode, childNodes, relativePath });
  }

  const emittedRefs = buildEmittedEntityRefs(
    workspaceRollupNodes,
    fileLevelNodes,
    emittingRollupRefs
  );
  const schemas: RollupDrillDownSchema[] = [];

  for (const { rollupNode, childNodes, relativePath } of pending) {
    const childDependencies = collectRollupDrillDownDependencies(
      rollupNode.entityRef!,
      childNodes,
      fileLevelDependencies,
      emittedRefs
    );

    schemas.push({
      relativePath,
      schema: {
        entityRef: rollupNode.entityRef,
        name: `${rollupNode.name} Components`,
        version: '1.0.0',
        level: 'component',
        nodes: childNodes,
        dependencies: childDependencies,
        ...(source ? { source } : {}),
      },
    });
  }

  return schemas;
}
