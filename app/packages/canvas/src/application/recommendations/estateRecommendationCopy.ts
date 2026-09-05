import type { RankedOffender, LoadedSystemRef } from '../forensics/rankOffenders';
import type { EstateRecommendation } from './buildEstateRecommendations';

export function diagramForEntity(
  systems: readonly LoadedSystemRef[],
  entityRef: string
): LoadedSystemRef | undefined {
  return systems.find(system => system.schema.nodes.some(node => node.entityRef === entityRef));
}

export function offenderFallbackRecommendation(
  offender: RankedOffender,
  system: LoadedSystemRef | undefined
): EstateRecommendation {
  const priority = Math.round(
    Math.min(
      55,
      (offender.effectiveRefactorScore ?? offender.refactorScore) * 0.35 +
        offender.hotspotScore * 35 +
        (offender.compositeRiskScore ?? 0) * 20
    )
  );

  return {
    id: `forensics-fallback:${offender.entityRef}`,
    kind: 'reduce-composite-risk',
    source: 'tracelens',
    targetEntityRef: offender.entityRef,
    targetName: offender.name,
    title: 'Review forensics signals',
    detail:
      offender.chaosRiskLabel ??
      `Elevated forensics on ${offender.name} - open the refactor plan or run a failure simulation.`,
    priority: Math.max(1, priority),
    evidence: {
      forensics: {
        hotspotScore: offender.hotspotScore,
        refactorScore: offender.refactorScore,
        effectiveRefactorScore: offender.effectiveRefactorScore,
        complexity: offender.complexity,
        churn: offender.churn,
        authorCount: offender.authorCount,
        topAuthorPercent: offender.topAuthorPercent,
        classifications: offender.classifications,
      },
      compositeRiskScore: offender.compositeRiskScore,
    },
    actions: [
      {
        kind: 'review-refactor-plan',
        label: `Review refactor plan for ${offender.name}`,
        targetEntityRef: offender.entityRef,
      },
    ],
    diagramPath: offender.schemaPath,
    diagramName: system?.name ?? offender.parentLabel,
  };
}
