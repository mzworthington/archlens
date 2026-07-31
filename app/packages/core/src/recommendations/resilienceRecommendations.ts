import type { EntityRef, SystemNode, SystemSchema } from '../models/schema';
import { pubSubBrokersForPublisher, pubSubPeersOnBroker } from '../resilience/graph';
import { INTEGRITY_PEER_FACTOR } from '../resilience/integrityRadius';
import type { Recommendation } from './types';

const HIGH_BLAST_THRESHOLD = 0.7;
const INTEGRITY_ONLY_AVAILABILITY_THRESHOLD = 0.3;

export interface BuildResilienceRecommendationsInput {
  schema: SystemSchema;
  spofs: EntityRef[];
  heat: Map<EntityRef, number>;
  propagationStoppedAt: EntityRef[];
  integrityHeat: Map<EntityRef, number>;
  faultNodeIds: EntityRef[];
}

function nodeName(schema: SystemSchema, entityRef: EntityRef): string {
  return schema.nodes.find(node => node.entityRef === entityRef)?.name ?? entityRef;
}

function recommendationId(kind: string, targetEntityRef: EntityRef): string {
  return `${kind}:${targetEntityRef}`;
}

function pushUnique(
  list: Recommendation[],
  seen: Set<string>,
  recommendation: Recommendation
): void {
  if (seen.has(recommendation.id)) return;
  seen.add(recommendation.id);
  list.push(recommendation);
}

/**
 * Structured resilience recommendations from a ChaosLens simulation run.
 */
export function buildResilienceRecommendations(
  input: BuildResilienceRecommendationsInput
): Recommendation[] {
  const { schema, spofs, heat, propagationStoppedAt, integrityHeat, faultNodeIds } = input;
  const recommendations: Recommendation[] = [];
  const seen = new Set<string>();
  const nodeById = new Map<EntityRef, SystemNode>(schema.nodes.map(node => [node.entityRef, node]));

  for (const spof of spofs) {
    const node = nodeById.get(spof);
    const targetName = node?.name ?? spof;
    const blastRadius = heat.get(spof) ?? 0;
    pushUnique(recommendations, seen, {
      id: recommendationId('add-circuit-breaker', spof),
      kind: 'add-circuit-breaker',
      source: 'chaoslens',
      targetEntityRef: spof,
      targetName,
      title: 'Add a circuit breaker',
      detail: `Add a circuit breaker on ${targetName} - multiple services depend on it with no isolation.`,
      priority: 95,
      evidence: {
        simulation: {
          blastRadius,
          isSpof: true,
          onCriticalPath: true,
        },
      },
      actions: [
        {
          kind: 'enable-circuit-breaker',
          label: `Enable circuit breaker on ${targetName}`,
          targetEntityRef: spof,
        },
      ],
    });
  }

  for (const stopped of propagationStoppedAt) {
    const node = nodeById.get(stopped);
    const targetName = node?.name ?? stopped;
    pushUnique(recommendations, seen, {
      id: recommendationId('keep-safeguard', stopped),
      kind: 'keep-safeguard',
      source: 'chaoslens',
      targetEntityRef: stopped,
      targetName,
      title: 'Keep safeguard enabled',
      detail: `Circuit breaker on ${targetName} contained the blast radius - keep this safeguard enabled.`,
      priority: 60,
      evidence: {
        simulation: {
          blastRadius: heat.get(stopped) ?? 0,
          safeguardCoverage: 1,
        },
      },
      actions: [
        {
          kind: 'retain-circuit-breaker',
          label: `Retain circuit breaker on ${targetName}`,
          targetEntityRef: stopped,
        },
      ],
    });
  }

  const hotNodes = [...heat.entries()]
    .filter(([, intensity]) => intensity >= HIGH_BLAST_THRESHOLD)
    .map(([entityRef]) => entityRef);

  if (hotNodes.length > 0) {
    const primary = hotNodes[0];
    const names = hotNodes.map(id => nodeName(schema, id));
    pushUnique(recommendations, seen, {
      id: recommendationId('review-timeouts-fallbacks', primary),
      kind: 'review-timeouts-fallbacks',
      source: 'chaoslens',
      targetEntityRef: primary,
      targetName: nodeName(schema, primary),
      title: 'Review timeouts and fallbacks',
      detail: `High-impact nodes: ${names.join(', ')}. Review timeouts and fallbacks.`,
      priority: 85,
      evidence: {
        simulation: {
          blastRadius: heat.get(primary) ?? HIGH_BLAST_THRESHOLD,
          onCriticalPath: true,
        },
      },
      actions: hotNodes.map(entityRef => ({
        kind: 'review-timeouts',
        label: `Review timeouts on ${nodeName(schema, entityRef)}`,
        targetEntityRef: entityRef,
      })),
    });
  }

  for (const faultId of faultNodeIds) {
    const brokers = pubSubBrokersForPublisher(schema, faultId);
    if (brokers.length === 0) continue;

    const publisher = nodeById.get(faultId);
    const publisherName = publisher?.name ?? faultId;
    const stalePeers = new Set<EntityRef>();

    for (const brokerId of brokers) {
      for (const peerId of pubSubPeersOnBroker(schema, brokerId)) {
        if (peerId === faultId) continue;
        const peerHeat = integrityHeat.get(peerId) ?? 0;
        if (peerHeat >= INTEGRITY_PEER_FACTOR * 0.5) stalePeers.add(peerId);
      }
    }

    if (stalePeers.size === 0) continue;

    const peerNames = [...stalePeers].map(id => nodeName(schema, id));
    const primaryPeer = [...stalePeers][0];
    pushUnique(recommendations, seen, {
      id: recommendationId('handle-event-staleness', primaryPeer),
      kind: 'handle-event-staleness',
      source: 'chaoslens',
      targetEntityRef: primaryPeer,
      targetName: nodeName(schema, primaryPeer),
      title: 'Handle event staleness',
      detail: `${publisherName} stopped publishing - ${peerNames.join(', ')} may keep running but will miss new events.`,
      priority: 80,
      evidence: {
        simulation: {
          integrityHeat: integrityHeat.get(primaryPeer) ?? 0,
          blastRadius: heat.get(primaryPeer) ?? 0,
        },
      },
      actions: [...stalePeers].map(entityRef => ({
        kind: 'add-staleness-handling',
        label: `Add staleness handling on ${nodeName(schema, entityRef)}`,
        targetEntityRef: entityRef,
      })),
    });
  }

  const integrityOnly = [...integrityHeat.entries()]
    .filter(
      ([entityRef, intensity]) =>
        intensity >= HIGH_BLAST_THRESHOLD &&
        (heat.get(entityRef) ?? 0) < INTEGRITY_ONLY_AVAILABILITY_THRESHOLD
    )
    .map(([entityRef]) => entityRef);

  if (integrityOnly.length > 0) {
    const primary = integrityOnly[0];
    const names = integrityOnly.map(id => nodeName(schema, id));
    pushUnique(recommendations, seen, {
      id: recommendationId('verify-integrity-handling', primary),
      kind: 'verify-integrity-handling',
      source: 'chaoslens',
      targetEntityRef: primary,
      targetName: nodeName(schema, primary),
      title: 'Verify integrity handling',
      detail: `Data integrity risk without availability loss: ${names.join(', ')}. Verify staleness handling and compensating actions.`,
      priority: 80,
      evidence: {
        simulation: {
          integrityHeat: integrityHeat.get(primary) ?? HIGH_BLAST_THRESHOLD,
          blastRadius: heat.get(primary) ?? 0,
        },
      },
      actions: integrityOnly.map(entityRef => ({
        kind: 'verify-compensating-actions',
        label: `Verify compensating actions on ${nodeName(schema, entityRef)}`,
        targetEntityRef: entityRef,
      })),
    });
  }

  return recommendations.sort((a, b) => b.priority - a.priority);
}

/**
 * Legacy advice strings for backward-compatible simulation output.
 */
export function resilienceRecommendationsToAdvice(recommendations: Recommendation[]): string[] {
  return recommendations.map(recommendation => recommendation.detail);
}
