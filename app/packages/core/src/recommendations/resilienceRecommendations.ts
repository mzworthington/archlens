import type { EntityRef, SystemNode, SystemSchema } from '../models/schema';
import { pubSubBrokersForPublisher, pubSubPeersOnBroker } from '../resilience/graph';
import { INTEGRITY_PEER_FACTOR } from '../resilience/integrityRadius';
import { resolveNodeResilience } from '../resilience/nodeResilience';
import { detectSpofCallSites } from '../resilience/simulation';
import { isResilienceAdviceTarget, isThirdPartyDependency } from './resilienceAdviceEligibility';
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

interface ResilienceRecommendationContext {
  schema: SystemSchema;
  heat: Map<EntityRef, number>;
  propagationStoppedAt: EntityRef[];
  integrityHeat: Map<EntityRef, number>;
  faultNodeIds: EntityRef[];
  nodeById: Map<EntityRef, SystemNode>;
}

function nodeName(schema: SystemSchema, entityRef: EntityRef): string {
  return schema.nodes.find(node => node.entityRef === entityRef)?.name ?? entityRef;
}

function recommendationId(kind: string, targetEntityRef: EntityRef, suffix = ''): string {
  return suffix ? `${kind}:${targetEntityRef}:${suffix}` : `${kind}:${targetEntityRef}`;
}

function filterEligible(schema: SystemSchema, entityRefs: readonly EntityRef[]): EntityRef[] {
  return entityRefs.filter(entityRef => isResilienceAdviceTarget(schema, entityRef));
}

function mergeUniqueRecommendations(lists: readonly Recommendation[][]): Recommendation[] {
  const byId = new Map<string, Recommendation>();
  for (const list of lists) {
    for (const recommendation of list) {
      if (!byId.has(recommendation.id)) {
        byId.set(recommendation.id, recommendation);
      }
    }
  }
  return [...byId.values()].sort((a, b) => b.priority - a.priority);
}

function recommendCircuitBreakers(ctx: ResilienceRecommendationContext): Recommendation[] {
  const { schema, heat, nodeById } = ctx;
  const recommendations: Recommendation[] = [];

  for (const { dependencyEntityRef, callerEntityRefs } of detectSpofCallSites(schema)) {
    const dependencyName = nodeName(schema, dependencyEntityRef);
    const dependencyBlast = heat.get(dependencyEntityRef) ?? 0;
    const thirdPartyDependency = isThirdPartyDependency(schema, dependencyEntityRef);
    const dependencyNote = thirdPartyDependency
      ? 'shared third-party dependency with fan-in — isolation must be in your application code, not on the vendor'
      : 'shared dependency with fan-in and no caller-side isolation in application code';

    for (const caller of callerEntityRefs) {
      if (!isResilienceAdviceTarget(schema, caller)) continue;

      const callerNode = nodeById.get(caller);
      if (resolveNodeResilience(callerNode).circuitBreaker) continue;

      const callerName = callerNode?.name ?? caller;
      recommendations.push({
        id: recommendationId('add-circuit-breaker', caller, dependencyEntityRef),
        kind: 'add-circuit-breaker',
        source: 'chaoslens',
        targetEntityRef: caller,
        targetName: callerName,
        title: 'Add caller-side circuit breaker',
        detail: `In ${callerName}, add a circuit breaker on the outbound client to ${dependencyName} — ${dependencyNote}.`,
        priority: 95,
        evidence: {
          simulation: {
            blastRadius: dependencyBlast,
            isSpof: true,
            onCriticalPath: true,
            dependencyEntityRef,
            dependencyOwnership: thirdPartyDependency ? 'third-party' : 'owned',
          },
          applicabilityScope: {
            entityRef: dependencyEntityRef,
            name: dependencyName,
          },
        },
        actions: [
          {
            kind: 'enable-circuit-breaker',
            label: `Enable circuit breaker on ${callerName}`,
            targetEntityRef: caller,
          },
        ],
      });
    }
  }

  return recommendations;
}

function recommendKeepSafeguards(ctx: ResilienceRecommendationContext): Recommendation[] {
  const { schema, heat, propagationStoppedAt, nodeById } = ctx;
  const recommendations: Recommendation[] = [];

  for (const stopped of filterEligible(schema, propagationStoppedAt)) {
    const node = nodeById.get(stopped);
    const targetName = node?.name ?? stopped;
    recommendations.push({
      id: recommendationId('keep-safeguard', stopped),
      kind: 'keep-safeguard',
      source: 'chaoslens',
      targetEntityRef: stopped,
      targetName,
      title: 'Keep safeguard enabled',
      detail: `Circuit breaker in ${targetName} contained the blast radius — keep this outbound isolation in application code.`,
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

  return recommendations;
}

function hotBlastEntityRefs(ctx: ResilienceRecommendationContext): EntityRef[] {
  return filterEligible(
    ctx.schema,
    [...ctx.heat.entries()]
      .filter(([, intensity]) => intensity >= HIGH_BLAST_THRESHOLD)
      .map(([entityRef]) => entityRef)
  );
}

function recommendTimeoutsFallbacks(ctx: ResilienceRecommendationContext): Recommendation[] {
  const hotNodes = hotBlastEntityRefs(ctx);
  if (hotNodes.length === 0) return [];

  const { schema, heat } = ctx;
  const primary = hotNodes[0];
  const names = hotNodes.map(id => nodeName(schema, id));

  return [
    {
      id: recommendationId('review-timeouts-fallbacks', primary),
      kind: 'review-timeouts-fallbacks',
      source: 'chaoslens',
      targetEntityRef: primary,
      targetName: nodeName(schema, primary),
      title: 'Review timeouts and fallbacks',
      detail: `High-impact services: ${names.join(', ')}. Review outbound timeouts and fallbacks in application code.`,
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
    },
  ];
}

function collectStalePeers(
  ctx: ResilienceRecommendationContext,
  faultId: EntityRef
): Set<EntityRef> {
  const { schema, integrityHeat } = ctx;
  const stalePeers = new Set<EntityRef>();

  for (const brokerId of pubSubBrokersForPublisher(schema, faultId)) {
    for (const peerId of pubSubPeersOnBroker(schema, brokerId)) {
      if (peerId === faultId) continue;
      if (!isResilienceAdviceTarget(schema, peerId)) continue;
      const peerHeat = integrityHeat.get(peerId) ?? 0;
      if (peerHeat >= INTEGRITY_PEER_FACTOR * 0.5) stalePeers.add(peerId);
    }
  }

  return stalePeers;
}

function recommendEventStaleness(ctx: ResilienceRecommendationContext): Recommendation[] {
  const { schema, heat, integrityHeat, faultNodeIds, nodeById } = ctx;
  const recommendations: Recommendation[] = [];

  for (const faultId of faultNodeIds) {
    if (!isResilienceAdviceTarget(schema, faultId)) continue;
    if (pubSubBrokersForPublisher(schema, faultId).length === 0) continue;

    const stalePeers = collectStalePeers(ctx, faultId);
    if (stalePeers.size === 0) continue;

    const publisherName = nodeById.get(faultId)?.name ?? faultId;
    const peerNames = [...stalePeers].map(id => nodeName(schema, id));
    const primaryPeer = [...stalePeers][0];

    recommendations.push({
      id: recommendationId('handle-event-staleness', primaryPeer),
      kind: 'handle-event-staleness',
      source: 'chaoslens',
      targetEntityRef: primaryPeer,
      targetName: nodeName(schema, primaryPeer),
      title: 'Handle event staleness',
      detail: `${publisherName} stopped publishing — in ${peerNames.join(', ')}, handle stale or missing events in consumer logic.`,
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

  return recommendations;
}

function integrityOnlyEntityRefs(ctx: ResilienceRecommendationContext): EntityRef[] {
  return filterEligible(
    ctx.schema,
    [...ctx.integrityHeat.entries()]
      .filter(
        ([entityRef, intensity]) =>
          intensity >= HIGH_BLAST_THRESHOLD &&
          (ctx.heat.get(entityRef) ?? 0) < INTEGRITY_ONLY_AVAILABILITY_THRESHOLD
      )
      .map(([entityRef]) => entityRef)
  );
}

function recommendIntegrityHandling(ctx: ResilienceRecommendationContext): Recommendation[] {
  const integrityOnly = integrityOnlyEntityRefs(ctx);
  if (integrityOnly.length === 0) return [];

  const { schema, heat, integrityHeat } = ctx;
  const primary = integrityOnly[0];
  const names = integrityOnly.map(id => nodeName(schema, id));

  return [
    {
      id: recommendationId('verify-integrity-handling', primary),
      kind: 'verify-integrity-handling',
      source: 'chaoslens',
      targetEntityRef: primary,
      targetName: nodeName(schema, primary),
      title: 'Verify integrity handling',
      detail: `Data integrity risk without availability loss: ${names.join(', ')}. Verify staleness handling and compensating actions in application code.`,
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
    },
  ];
}

/**
 * Structured resilience recommendations from a ChaosLens simulation run.
 */
export function buildResilienceRecommendations(
  input: BuildResilienceRecommendationsInput
): Recommendation[] {
  const ctx: ResilienceRecommendationContext = {
    schema: input.schema,
    heat: input.heat,
    propagationStoppedAt: input.propagationStoppedAt,
    integrityHeat: input.integrityHeat,
    faultNodeIds: input.faultNodeIds,
    nodeById: new Map(input.schema.nodes.map(node => [node.entityRef, node])),
  };

  return mergeUniqueRecommendations([
    recommendCircuitBreakers(ctx),
    recommendKeepSafeguards(ctx),
    recommendTimeoutsFallbacks(ctx),
    recommendEventStaleness(ctx),
    recommendIntegrityHandling(ctx),
  ]);
}

/**
 * Legacy advice strings for backward-compatible simulation output.
 */
export function resilienceRecommendationsToAdvice(recommendations: Recommendation[]): string[] {
  return recommendations.map(recommendation => recommendation.detail);
}
