import type { DependencyType, EntityRef, SystemDependency, SystemNode } from '../models/schema';
import {
  isAsyncStreamDependency,
  isAvailabilityPropagatingDependency,
} from '../taxonomy/dependencySemantics';

type GraphKernelNode = Pick<SystemNode, 'entityRef' | 'type' | 'parentEntityRef'>;
type GraphKernelEdge = Pick<SystemDependency, 'from' | 'to' | 'type'>;

export type GraphKernel = {
  nodes: readonly GraphKernelNode[];
  dependencies: readonly GraphKernelEdge[];
};

function isGroup(schema: GraphKernel, ref: EntityRef): boolean {
  const node = schema.nodes.find(n => n.entityRef === ref);
  return node?.type === 'group';
}

function childrenOfGroup(parentId: EntityRef, schema: GraphKernel): EntityRef[] {
  return schema.nodes.filter(n => n.parentEntityRef === parentId).map(n => n.entityRef);
}

/** Expand a dependency endpoint - group nodes fan out to their children. */
export function expandEndpoints(ref: EntityRef, schema: GraphKernel): EntityRef[] {
  if (!isGroup(schema, ref)) return [ref];
  const children = childrenOfGroup(ref, schema);
  return children.length > 0 ? children : [ref];
}

/**
 * Map dependency target → callers (upstream), expanding group boundaries on edges.
 * Skips non-runtime edges (e.g. `provisions`) so IaC declarations are not blast-radius callers.
 */
export function buildDependents(schema: GraphKernel): Map<EntityRef, EntityRef[]> {
  const nodeIds = new Set(schema.nodes.map(n => n.entityRef));
  const dependents = new Map<EntityRef, EntityRef[]>();

  for (const dep of schema.dependencies) {
    if (!isAvailabilityPropagatingDependency(dep.type)) continue;
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
export function resolveFaultTargets(nodeId: EntityRef, schema: GraphKernel): EntityRef[] {
  if (!isGroup(schema, nodeId)) return [nodeId];
  const children = childrenOfGroup(nodeId, schema);
  return children.length > 0 ? children : [nodeId];
}

/** True when the schema has group nodes used in dependency expansion. */
export function schemaHasGroupNodes(schema: GraphKernel): boolean {
  return schema.nodes.some(n => n.type === 'group');
}

function dependencyMatchesType(type: DependencyType, depType: DependencyType): boolean {
  return type === depType;
}

/**
 * All `from` endpoints on edges of the given type targeting `brokerId` (group-expanded).
 */
export function pubSubPeersOnBroker(
  schema: GraphKernel,
  brokerId: EntityRef,
  depType: DependencyType = 'publish-subscribe'
): EntityRef[] {
  if (!isAsyncStreamDependency(depType)) return [];

  const nodeIds = new Set(schema.nodes.map(n => n.entityRef));
  const peers = new Set<EntityRef>();

  for (const dep of schema.dependencies) {
    if (!dependencyMatchesType(depType, dep.type)) continue;
    const targets = expandEndpoints(dep.to, schema);
    if (!targets.includes(brokerId)) continue;

    for (const source of expandEndpoints(dep.from, schema)) {
      if (nodeIds.has(source)) peers.add(source);
    }
  }

  return [...peers];
}

/** Brokers targeted by publish-subscribe edges where `publisherId` is the `from` endpoint. */
export function pubSubBrokersForPublisher(
  schema: GraphKernel,
  publisherId: EntityRef,
  depType: DependencyType = 'publish-subscribe'
): EntityRef[] {
  if (!isAsyncStreamDependency(depType)) return [];

  const nodeIds = new Set(schema.nodes.map(n => n.entityRef));
  const brokers = new Set<EntityRef>();

  for (const dep of schema.dependencies) {
    if (!dependencyMatchesType(depType, dep.type)) continue;
    const sources = expandEndpoints(dep.from, schema);
    if (!sources.includes(publisherId)) continue;

    for (const target of expandEndpoints(dep.to, schema)) {
      if (nodeIds.has(target)) brokers.add(target);
    }
  }

  return [...brokers];
}

/** Brokers that `nodeId` attaches to as `to` on publish-subscribe edges (faulted broker role). */
export function pubSubBrokersAttachedToNode(
  schema: GraphKernel,
  nodeId: EntityRef,
  depType: DependencyType = 'publish-subscribe'
): EntityRef[] {
  if (!isAsyncStreamDependency(depType)) return [];

  const nodeIds = new Set(schema.nodes.map(n => n.entityRef));
  if (!nodeIds.has(nodeId)) return [];

  const brokers = new Set<EntityRef>();

  for (const dep of schema.dependencies) {
    if (!dependencyMatchesType(depType, dep.type)) continue;
    const targets = expandEndpoints(dep.to, schema);
    if (!targets.includes(nodeId)) continue;
    brokers.add(nodeId);
  }

  return [...brokers];
}
