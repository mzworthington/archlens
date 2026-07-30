import type { EntityRef, SystemSchema } from '../../models/schema';

export function isOnActiveDiagram(entityRef: EntityRef, activeSchema: SystemSchema): boolean {
  return activeSchema.nodes.some(n => n.entityRef === entityRef);
}

function isScopedToActiveDiagram(entityRef: EntityRef, activeSchema: SystemSchema): boolean {
  const scope = activeSchema.entityRef?.trim();
  if (!scope) return false;
  if (activeSchema.level !== 'component' && activeSchema.level !== 'code') return false;
  return entityRef === scope || entityRef.startsWith(`${scope}/`);
}

export function isExcludedFromExternalCandidates(
  entityRef: EntityRef,
  activeSchema: SystemSchema
): boolean {
  if (isOnActiveDiagram(entityRef, activeSchema)) return true;
  return isScopedToActiveDiagram(entityRef, activeSchema);
}

/** Dependency endpoints referenced on the active diagram but missing from schema.nodes. */
export function listUnresolvedDependencyEndpoints(activeSchema: SystemSchema): EntityRef[] {
  const onDiagram = new Set(activeSchema.nodes.map(n => n.entityRef));
  const refs = new Set<EntityRef>();

  for (const dep of activeSchema.dependencies) {
    if (!onDiagram.has(dep.from) && !isExcludedFromExternalCandidates(dep.from, activeSchema)) {
      refs.add(dep.from);
    }
    if (!onDiagram.has(dep.to) && !isExcludedFromExternalCandidates(dep.to, activeSchema)) {
      refs.add(dep.to);
    }
  }

  return [...refs];
}
