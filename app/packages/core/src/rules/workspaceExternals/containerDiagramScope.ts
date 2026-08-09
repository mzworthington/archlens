import {
  EntityRef as EntityRefUtil,
  type EntityRef,
  type SystemDependency,
  type SystemSchema,
} from '../../models/schema';
import type { LoadedSystemInput } from './types';

export type OwningContainerDiagram = {
  system: LoadedSystemInput;
  /** Deepest container-diagram node that owns the active component diagram. */
  scopeRef: EntityRef;
};

/** Find the container-level diagram that owns the active component/code diagram. */
export function findOwningContainerDiagram(
  activeSchema: SystemSchema,
  loadedSystems: LoadedSystemInput[]
): OwningContainerDiagram | null {
  const activeRef = activeSchema.entityRef?.trim();
  if (!activeRef) return null;

  for (const system of loadedSystems) {
    if (system.schema.level !== 'container') continue;

    let scopeRef: EntityRef | null = null;
    for (const node of system.schema.nodes) {
      if (!node.entityRef) continue;
      const matches = activeRef === node.entityRef || activeRef.startsWith(`${node.entityRef}/`);
      if (!matches) continue;
      if (!scopeRef || node.entityRef.length > scopeRef.length) {
        scopeRef = node.entityRef;
      }
    }
    if (scopeRef) return { system, scopeRef };
  }

  let ref: EntityRef | null = activeRef;
  while (ref) {
    const system = loadedSystems.find(
      s => s.schema.level === 'container' && s.schema.entityRef === ref
    );
    if (system) return { system, scopeRef: activeRef };
    ref = EntityRefUtil.getParent(ref);
  }

  return null;
}

export function isUnderScope(ref: EntityRef, scopeRef: EntityRef): boolean {
  return ref === scopeRef || ref.startsWith(`${scopeRef}/`);
}

function dependencyTouchesScope(dep: SystemDependency, scopeRef: EntityRef): boolean {
  return isUnderScope(dep.from, scopeRef) || isUnderScope(dep.to, scopeRef);
}

export function collectComponentDiagramNeighborRefs(
  activeSchema: SystemSchema,
  loadedSystems: LoadedSystemInput[]
): EntityRef[] {
  if (activeSchema.level !== 'component' && activeSchema.level !== 'code') return [];
  if (!activeSchema.entityRef) return [];

  const owned = findOwningContainerDiagram(activeSchema, loadedSystems);
  if (!owned) return [];

  const related = new Set<EntityRef>();
  for (const dep of owned.system.schema.dependencies) {
    if (!dependencyTouchesScope(dep, owned.scopeRef)) continue;

    const fromInScope = isUnderScope(dep.from, owned.scopeRef);
    const toInScope = isUnderScope(dep.to, owned.scopeRef);
    if (fromInScope && !toInScope) related.add(dep.to);
    if (toInScope && !fromInScope) related.add(dep.from);
  }

  return [...related];
}
