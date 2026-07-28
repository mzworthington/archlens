import type { EntityRef, SystemSchema } from '../models/schema';
import type { NodeFaultConfig } from './faultSpec';
import { resolveFaultSeverity } from './faultSpec';
import {
  pubSubBrokersAttachedToNode,
  pubSubBrokersForPublisher,
  pubSubPeersOnBroker,
} from './graph';

export interface IntegrityRadiusResult {
  integrityHeat: Map<EntityRef, number>;
  integrityImpactedNodes: EntityRef[];
}

/** Sibling subscribers on a topic see stale/missing events, not full outage severity. */
export const INTEGRITY_PEER_FACTOR = 0.5;

function mergeIntegrity(heat: Map<EntityRef, number>, nodeId: EntityRef, severity: number): void {
  const existing = heat.get(nodeId) ?? 0;
  heat.set(nodeId, Math.min(1, Math.max(existing, severity)));
}

/**
 * Propagate data-integrity impact for async streams.
 * Publisher faults degrade broker + peer subscribers; broker faults degrade all attached clients.
 */
export function computeIntegrityRadius(
  schema: SystemSchema,
  fault: NodeFaultConfig
): IntegrityRadiusResult {
  const nodeIds = new Set(schema.nodes.map(n => n.entityRef));
  if (!nodeIds.has(fault.nodeId)) {
    return { integrityHeat: new Map(), integrityImpactedNodes: [] };
  }

  const integrityHeat = new Map<EntityRef, number>();
  const baseSeverity = resolveFaultSeverity(fault);
  mergeIntegrity(integrityHeat, fault.nodeId, baseSeverity);

  const publisherBrokers = pubSubBrokersForPublisher(schema, fault.nodeId);
  for (const brokerId of publisherBrokers) {
    mergeIntegrity(integrityHeat, brokerId, baseSeverity);
    for (const peerId of pubSubPeersOnBroker(schema, brokerId)) {
      if (peerId === fault.nodeId) continue;
      mergeIntegrity(integrityHeat, peerId, baseSeverity * INTEGRITY_PEER_FACTOR);
    }
  }

  if (pubSubBrokersAttachedToNode(schema, fault.nodeId).length > 0) {
    for (const peerId of pubSubPeersOnBroker(schema, fault.nodeId)) {
      mergeIntegrity(integrityHeat, peerId, baseSeverity);
    }
  }

  const integrityImpactedNodes = [...integrityHeat.entries()]
    .filter(([, intensity]) => intensity > 0)
    .map(([id]) => id);

  return { integrityHeat, integrityImpactedNodes };
}
