import type { SystemDependency, SystemNode, NodeType } from '@archlens/core';
import { EntityRef } from '@archlens/core';
import { componentMapKey } from './containerGrouping.ts';
import { nodeTypePriority } from './csharpGrouping.ts';

export type SourceHydration = {
  type: NodeType;
  technology: string;
  reason: string;
};

export function componentEntityRef(
  parentRef: string,
  containerId: string,
  componentId: string
): string {
  let ref = EntityRef.child(parentRef, containerId);
  for (const segment of componentId.split('/').filter(Boolean)) {
    ref = EntityRef.child(ref, segment);
  }
  return ref;
}

export function fileDisplayName(baseName: string): string {
  const label = baseName.replace(/\.(test|spec)$/i, '').replace(/[-_]/g, ' ');
  return label.charAt(0).toUpperCase() + label.slice(1);
}

export function appendMemberFilepath(node: SystemNode, filepath: string): void {
  const existing = node.properties?.memberFilepaths;
  const memberFilepaths = Array.isArray(existing) ? [...existing] : [];
  if (!memberFilepaths.includes(filepath)) {
    memberFilepaths.push(filepath);
  }
  node.properties = {
    ...node.properties,
    memberFilepaths,
    filepath: typeof node.properties?.filepath === 'string' ? node.properties.filepath : filepath,
  };
}

export function applyHydrationUpgrade(
  existing: SystemNode,
  hydration: SourceHydration,
  isTestFile: boolean
): void {
  if (nodeTypePriority(hydration.type) > nodeTypePriority(existing.type)) {
    existing.type = hydration.type;
    existing.properties = {
      ...existing.properties,
      technology: hydration.technology,
      classification: hydration.reason,
    };
  }
  if (!isTestFile) {
    existing.isTest = false;
  }
}

export function findComponentInMap(
  componentNodesMap: Map<string, SystemNode>,
  containerHint: string | undefined,
  componentId: string
): SystemNode | undefined {
  if (containerHint) {
    const keyed = componentNodesMap.get(componentMapKey(containerHint, componentId));
    if (keyed) return keyed;
  }
  for (const [key, node] of componentNodesMap) {
    if (key.endsWith(`/${componentId}`) || key === componentId) {
      return node;
    }
  }
  return undefined;
}

export function pushUniqueDependency(
  dependencies: SystemDependency[],
  dependency: SystemDependency
): void {
  const exists = dependencies.some(
    dep =>
      dep.from === dependency.from &&
      dep.to === dependency.to &&
      dep.type === dependency.type &&
      dep.description === dependency.description
  );
  if (!exists) {
    dependencies.push(dependency);
  }
}
