import type { DiagramResilienceReport } from '@archlens/core/recommendations';
import { rankForensicsOffenders, type LoadedSystemRef } from '../forensics/rankOffenders';
import { buildEstateRecommendations } from './buildEstateRecommendationsReport';
import { compareByEstateRankScore } from './estateRankScore';
import type {
  BuildEstateRecommendationsOptions,
  EstateRecommendationsReport,
  RankedEstateItem,
} from './estateRecommendationTypes';
import { offenderFallbackCopy } from './offenderFallbackCopy';

function diagramForEntity(
  systems: readonly LoadedSystemRef[],
  entityRef: string
): LoadedSystemRef | undefined {
  return systems.find(system => system.schema.nodes.some(node => node.entityRef === entityRef));
}

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
      recommendation: offenderFallbackCopy(offender, diagramForEntity(systems, offender.entityRef)),
      offender,
      isFallback: true,
    });
  }

  items.sort(compareByEstateRankScore);

  return {
    items,
    summary: report.summary,
    diagrams: report.diagrams,
    report,
  };
}
