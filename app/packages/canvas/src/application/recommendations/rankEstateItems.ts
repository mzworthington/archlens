import { rankForensicsOffenders, type LoadedSystemRef } from '../forensics/rankOffenders';
import {
  buildEstateRecommendations,
  type BuildEstateRecommendationsOptions,
  type EstateRecommendationsReport,
  type RankedEstateItem,
} from './buildEstateRecommendations';
import { diagramForEntity, offenderFallbackRecommendation } from './estateRecommendationCopy';
import { sortByEstateRank } from './estateRank';
import type { DiagramResilienceReport } from '@archlens/core/recommendations';

export function rankEstateItems(
  systems: readonly LoadedSystemRef[],
  options: BuildEstateRecommendationsOptions = {}
): {
  items: RankedEstateItem[];
  summary: EstateRecommendationsReport['summary'];
  diagrams: DiagramResilienceReport[];
  report: EstateRecommendationsReport;
} {
  const report = buildEstateRecommendations(systems, options);
  const offenders = rankForensicsOffenders(systems, 'components', 'all');
  const offenderByRef = new Map(offenders.map(offender => [offender.entityRef, offender]));
  const entitiesWithRecommendations = new Set(
    report.recommendations.map(recommendation => recommendation.targetEntityRef)
  );

  const items: RankedEstateItem[] = report.recommendations.map(recommendation => ({
    recommendation,
    offender: offenderByRef.get(recommendation.targetEntityRef),
  }));

  for (const offender of offenders) {
    if (entitiesWithRecommendations.has(offender.entityRef)) continue;
    items.push({
      recommendation: offenderFallbackRecommendation(
        offender,
        diagramForEntity(systems, offender.entityRef)
      ),
      offender,
      isFallback: true,
    });
  }

  return {
    items: sortByEstateRank(items),
    summary: report.summary,
    diagrams: report.diagrams,
    report,
  };
}
