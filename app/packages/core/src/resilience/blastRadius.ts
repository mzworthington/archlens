import type { EntityRef, SystemSchema } from '../models/schema';
import type { NodeFaultConfig, NodeSafeguards } from './faultSpec';
import { resolveFaultSeverity } from './faultSpec';
import { buildDependents } from './graph';
import { resolveNodeResilience } from './nodeResilience';

export interface BlastRadiusOptions {
  safeguards?: Partial<Record<EntityRef, NodeSafeguards>>;
}

export interface BlastRadiusResult {
  heat: Map<EntityRef, number>;
  /** Minimum upstream hop distance from the fault origin (0 = faulted node). */
  heatHops: Map<EntityRef, number>;
  impactedNodes: EntityRef[];
  propagationStoppedAt: EntityRef[];
}

const HEAT_DECAY = 0.75;
const LOCAL_CACHE_FACTOR = 0.5;
const RETRY_AMPLIFIER = 1.2;
const BULKHEAD_MAX_HOPS = 2;

function safeguardsFor(
  nodeId: EntityRef,
  options?: BlastRadiusOptions,
  schema?: SystemSchema
): NodeSafeguards {
  const fromSpec = options?.safeguards?.[nodeId];
  if (fromSpec) return fromSpec;

  const node = schema?.nodes.find(n => n.entityRef === nodeId);
  return resolveNodeResilience(node);
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
    return { heat: new Map(), heatHops: new Map(), impactedNodes: [], propagationStoppedAt: [] };
  }

  const dependents = buildDependents(schema);
  const heat = new Map<EntityRef, number>();
  const heatHops = new Map<EntityRef, number>();
  const propagationStoppedAt: EntityRef[] = [];
  const baseSeverity = resolveFaultSeverity(fault);

  heat.set(fault.nodeId, baseSeverity);
  heatHops.set(fault.nodeId, 0);

  type QueueItem = { nodeId: EntityRef; severity: number; hops: number };
  const queue: QueueItem[] = [{ nodeId: fault.nodeId, severity: baseSeverity, hops: 0 }];
  const visited = new Set<EntityRef>();

  while (queue.length > 0) {
    const current = queue.shift()!;
    if (visited.has(current.nodeId)) continue;
    visited.add(current.nodeId);

    for (const callerId of dependents.get(current.nodeId) ?? []) {
      const nextHop = current.hops + 1;
      const callerSafeguards = safeguardsFor(callerId, options, schema);

      if (callerSafeguards.circuitBreaker) {
        propagationStoppedAt.push(callerId);
        const existing = heat.get(callerId) ?? 0;
        const localSeverity = Math.max(existing, current.severity * HEAT_DECAY);
        heat.set(callerId, localSeverity);
        const existingHop = heatHops.get(callerId);
        heatHops.set(callerId, existingHop == null ? nextHop : Math.min(existingHop, nextHop));
        continue;
      }

      let propagated = current.severity * HEAT_DECAY;
      if (callerSafeguards.localCache) propagated *= LOCAL_CACHE_FACTOR;
      if (callerSafeguards.retry) propagated = Math.min(1, propagated * RETRY_AMPLIFIER);

      const maxHops = callerSafeguards.bulkhead ? BULKHEAD_MAX_HOPS : Number.POSITIVE_INFINITY;
      if (nextHop > maxHops) {
        propagationStoppedAt.push(callerId);
        continue;
      }

      const existing = heat.get(callerId) ?? 0;
      const merged = Math.min(1, Math.max(existing, propagated));
      heat.set(callerId, merged);
      const existingHop = heatHops.get(callerId);
      heatHops.set(callerId, existingHop == null ? nextHop : Math.min(existingHop, nextHop));
      queue.push({ nodeId: callerId, severity: merged, hops: nextHop });
    }
  }

  const impactedNodes = [...heat.keys()].filter(id => (heat.get(id) ?? 0) > 0);
  return { heat, heatHops, impactedNodes, propagationStoppedAt };
}
