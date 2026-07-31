import type { EntityRef, SystemSchema } from '../models/schema';
import { buildChaosRiskContextMap } from '../forensics/chaosRiskContext';
import type { RefactorBoundary } from '../forensics/refactorBoundary';
import type { OwnershipBreakdown } from '../forensics/ownership';
import type { NodeSafeguards } from '../resilience/faultSpec';
import type { SimulationResult } from '../resilience/simulation';
import { buildForensicsRecommendations } from './forensicsRecommendations';
import { buildRefactorRecommendations } from './refactorRecommendations';
import { buildResilienceRecommendations } from './resilienceRecommendations';
import type { Recommendation } from './types';

export interface BuildRecommendationsInput {
  schema: SystemSchema;
  simulation?: SimulationResult | null;
  sessionSafeguards?: Partial<Record<EntityRef, NodeSafeguards>>;
  refactorBoundaries?: readonly RefactorBoundary[];
  ownershipByEntityRef?: Map<EntityRef, OwnershipBreakdown>;
}

function mergeRecommendations(lists: readonly Recommendation[][]): Recommendation[] {
  const byId = new Map<string, Recommendation>();

  for (const list of lists) {
    for (const recommendation of list) {
      const existing = byId.get(recommendation.id);
      if (!existing || recommendation.priority > existing.priority) {
        byId.set(recommendation.id, recommendation);
      }
    }
  }

  return [...byId.values()].sort((a, b) => b.priority - a.priority);
}

/**
 * Unified recommendation pipeline combining ChaosLens simulation output,
 * TraceLens refactor boundaries, and cross-signal composite risk scoring.
 */
export function buildRecommendations(input: BuildRecommendationsInput): Recommendation[] {
  const {
    schema,
    simulation,
    sessionSafeguards,
    refactorBoundaries = [],
    ownershipByEntityRef,
  } = input;

  const lists: Recommendation[][] = [];

  if (simulation) {
    lists.push(
      buildResilienceRecommendations({
        schema,
        spofs: simulation.spofs,
        heat: simulation.heat,
        propagationStoppedAt: simulation.propagationStoppedAt,
        integrityHeat: simulation.integrityHeat,
        faultNodeIds: simulation.faultNodeIds,
      })
    );
  }

  const chaosContext = buildChaosRiskContextMap([{ schema }], simulation, sessionSafeguards);

  lists.push(
    buildForensicsRecommendations({
      schema,
      nodes: schema.nodes,
      chaosContext,
    })
  );

  for (const boundary of refactorBoundaries) {
    lists.push(
      buildRefactorRecommendations({
        boundary,
        ownership: ownershipByEntityRef?.get(boundary.seedEntityRef),
      })
    );
  }

  return mergeRecommendations(lists);
}
