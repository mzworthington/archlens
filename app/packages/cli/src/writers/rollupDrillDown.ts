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

export function collectRollupDrillDownDependencies(
  _rollupEntityRef: string,
  childNodes: readonly SystemNode[],
  fileLevelDependencies: readonly SystemDependency[]
): SystemDependency[] {
  const childRefs = new Set(childNodes.map(node => node.entityRef));
  return fileLevelDependencies.filter(dep => childRefs.has(dep.from));
}

export type RollupDrillDownSchema = {
  relativePath: string;
  schema: SystemSchema;
};

export function buildRollupDrillDownSchemas(
  containerEntityRef: string,
  rollupNodes: readonly SystemNode[],
  fileLevelNodes: readonly SystemNode[],
  fileLevelDependencies: readonly SystemDependency[],
  source?: SourceProvenance
): RollupDrillDownSchema[] {
  const schemas: RollupDrillDownSchema[] = [];
  const emitted = new Set<string>();

  for (const rollupNode of rollupNodes) {
    if (!rollupNode.entityRef || !shouldEmitRollupDrillDown(rollupNode)) continue;
    if (emitted.has(rollupNode.entityRef)) continue;

    const childNodes = collectImmediateDrillDownChildren(
      rollupNode.entityRef,
      rollupNodes,
      fileLevelNodes
    );
    if (childNodes.length < ROLLUP_DRILL_DOWN_MIN_FILES) continue;

    const relativePath = rollupDrillDownRelativePath(containerEntityRef, rollupNode.entityRef);
    if (!relativePath) continue;

    const childDependencies = collectRollupDrillDownDependencies(
      rollupNode.entityRef,
      childNodes,
      fileLevelDependencies
    );

    emitted.add(rollupNode.entityRef);
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
