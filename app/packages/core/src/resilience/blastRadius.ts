import type { EntityRef, SystemSchema } from '../models/schema';
import type { NodeFaultConfig, NodeSafeguards } from './faultSpec';
import { resolveFaultSeverity } from './faultSpec';

export interface BlastRadiusOptions {
  safeguards?: Partial<Record<EntityRef, NodeSafeguards>>;
}

export interface BlastRadiusResult {
  heat: Map<EntityRef, number>;
  impactedNodes: EntityRef[];
  propagationStoppedAt: EntityRef[];
}

const HEAT_DECAY = 0.75;
const LOCAL_CACHE_FACTOR = 0.5;
const RETRY_AMPLIFIER = 1.2;
const BULKHEAD_MAX_HOPS = 2;

function buildDependents(schema: SystemSchema): Map<EntityRef, EntityRef[]> {
  const nodeIds = new Set(schema.nodes.map(n => n.entityRef));
  const dependents = new Map<EntityRef, EntityRef[]>();

  for (const dep of schema.dependencies) {
    if (!nodeIds.has(dep.from) || !nodeIds.has(dep.to)) continue;
    const list = dependents.get(dep.to);
    if (list) list.push(dep.from);
    else dependents.set(dep.to, [dep.from]);
  }

  return dependents;
}

function safeguardsFor(
  nodeId: EntityRef,
  options?: BlastRadiusOptions,
  schema?: SystemSchema
): NodeSafeguards {
  const fromSpec = options?.safeguards?.[nodeId];
  if (fromSpec) return fromSpec;

  const node = schema?.nodes.find(n => n.entityRef === nodeId);
  const raw = node?.properties?.resilience;
  if (typeof raw === 'string') {
    try {
      const parsed = JSON.parse(raw) as { safeguards?: NodeSafeguards };
      return parsed.safeguards ?? {};
    } catch {
      return {};
    }
  }

  return {};
}

/**
 * Propagate failure impact upstream from a faulted dependency to its callers.
 * Heat decays with hop distance; safeguards can absorb or block propagation.
 */
export function computeBlastRadius(
  schema: SystemSchema,
  fault: NodeFaultConfig,
  options?: BlastRadiusOptions
): BlastRadiusResult {
  const nodeIds = new Set(schema.nodes.map(n => n.entityRef));
  if (!nodeIds.has(fault.nodeId)) {
    return { heat: new Map(), impactedNodes: [], propagationStoppedAt: [] };
  }

  const dependents = buildDependents(schema);
  const heat = new Map<EntityRef, number>();
  const propagationStoppedAt: EntityRef[] = [];
  const baseSeverity = resolveFaultSeverity(fault);

  heat.set(fault.nodeId, baseSeverity);

  type QueueItem = { nodeId: EntityRef; severity: number; hops: number };
  const queue: QueueItem[] = [{ nodeId: fault.nodeId, severity: baseSeverity, hops: 0 }];
  const visited = new Set<EntityRef>();

  while (queue.length > 0) {
    const current = queue.shift()!;
    if (visited.has(current.nodeId)) continue;
    visited.add(current.nodeId);

    for (const callerId of dependents.get(current.nodeId) ?? []) {
      const callerSafeguards = safeguardsFor(callerId, options, schema);

      if (callerSafeguards.circuitBreaker) {
        propagationStoppedAt.push(callerId);
        const existing = heat.get(callerId) ?? 0;
        const localSeverity = Math.max(existing, current.severity * HEAT_DECAY);
        heat.set(callerId, localSeverity);
        continue;
      }

      let propagated = current.severity * HEAT_DECAY;
      if (callerSafeguards.localCache) propagated *= LOCAL_CACHE_FACTOR;
      if (callerSafeguards.retry) propagated = Math.min(1, propagated * RETRY_AMPLIFIER);

      const maxHops = callerSafeguards.bulkhead ? BULKHEAD_MAX_HOPS : Number.POSITIVE_INFINITY;
      if (current.hops + 1 > maxHops) {
        propagationStoppedAt.push(callerId);
        continue;
      }

      const existing = heat.get(callerId) ?? 0;
      const merged = Math.min(1, Math.max(existing, propagated));
      heat.set(callerId, merged);
      queue.push({ nodeId: callerId, severity: merged, hops: current.hops + 1 });
    }
  }

  const impactedNodes = [...heat.keys()].filter(id => (heat.get(id) ?? 0) > 0);
  return { heat, impactedNodes, propagationStoppedAt };
}
