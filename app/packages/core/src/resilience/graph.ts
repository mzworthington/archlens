import type { EntityRef, SystemSchema } from '../models/schema';

function isGroup(schema: SystemSchema, ref: EntityRef): boolean {
  const node = schema.nodes.find(n => n.entityRef === ref);
  return node?.type === 'group';
}

function childrenOfGroup(parentId: EntityRef, schema: SystemSchema): EntityRef[] {
  return schema.nodes.filter(n => n.parentEntityRef === parentId).map(n => n.entityRef);
}

/** Expand a dependency endpoint — group nodes fan out to their children. */
export function expandEndpoints(ref: EntityRef, schema: SystemSchema): EntityRef[] {
  if (!isGroup(schema, ref)) return [ref];
  const children = childrenOfGroup(ref, schema);
  return children.length > 0 ? children : [ref];
}

/**
 * Map dependency target → callers (upstream), expanding group boundaries on edges.
 */
export function buildDependents(schema: SystemSchema): Map<EntityRef, EntityRef[]> {
  const nodeIds = new Set(schema.nodes.map(n => n.entityRef));
  const dependents = new Map<EntityRef, EntityRef[]>();

  for (const dep of schema.dependencies) {
    const sources = expandEndpoints(dep.from, schema);
    const targets = expandEndpoints(dep.to, schema);

    for (const target of targets) {
      if (!nodeIds.has(target)) continue;
      for (const source of sources) {
        if (!nodeIds.has(source)) continue;
        const list = dependents.get(target);
        if (list) list.push(source);
        else dependents.set(target, [source]);
      }
    }
  }

  return dependents;
}

/** When faulting a group, apply the fault to each child service (matches Go engine). */
export function resolveFaultTargets(nodeId: EntityRef, schema: SystemSchema): EntityRef[] {
  if (!isGroup(schema, nodeId)) return [nodeId];
  const children = childrenOfGroup(nodeId, schema);
  return children.length > 0 ? children : [nodeId];
}

/** True when the schema has group nodes used in dependency expansion. */
export function schemaHasGroupNodes(schema: SystemSchema): boolean {
  return schema.nodes.some(n => n.type === 'group');
}
