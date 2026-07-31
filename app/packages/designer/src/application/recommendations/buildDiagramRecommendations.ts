import type { EntityRef, SystemSchema } from '@archlens/core';
import { buildRecommendations, type Recommendation } from '@archlens/core/recommendations';
import type { OwnershipBreakdown, RefactorBoundary } from '@archlens/core/forensics';
import type { NodeSafeguards, SimulationResult } from '@archlens/core/resilience';

export interface BuildDiagramRecommendationsInput {
  schema: SystemSchema;
  simulation?: SimulationResult | null;
  sessionSafeguards?: Partial<Record<EntityRef, NodeSafeguards>>;
  boundary?: RefactorBoundary | null;
  ownership?: OwnershipBreakdown;
}

export function buildDiagramRecommendations(
  input: BuildDiagramRecommendationsInput
): Recommendation[] {
  const { schema, simulation, sessionSafeguards, boundary, ownership } = input;

  return buildRecommendations({
    schema,
    simulation,
    sessionSafeguards,
    refactorBoundaries: boundary ? [boundary] : [],
    ownershipByEntityRef:
      boundary && ownership ? new Map([[boundary.seedEntityRef, ownership]]) : undefined,
  });
}

export function recommendationsForEntity(
  recommendations: readonly Recommendation[],
  entityRef: string,
  memberEntityRefs?: readonly string[]
): Recommendation[] {
  const members = new Set(memberEntityRefs ?? []);
  return recommendations.filter(
    recommendation =>
      recommendation.targetEntityRef === entityRef || members.has(recommendation.targetEntityRef)
  );
}
