import type { LoadedSystemRef, RankedOffender } from '../forensics/rankOffenders';
import { fallbackEstateRankScore } from './estateRankScore';
import type { EstateRecommendation } from './estateRecommendationTypes';

export function offenderFallbackCopy(
  offender: RankedOffender,
  system: LoadedSystemRef | undefined
): EstateRecommendation {
  const priority = fallbackEstateRankScore(offender);

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
    priority,
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
