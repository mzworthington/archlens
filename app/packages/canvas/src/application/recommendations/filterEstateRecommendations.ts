import { churnAccelerationRatio } from '@archlens/core/forensics';
import type { Recommendation } from '@archlens/core/recommendations';
import {
  findForensicsOffenderByEntityRef,
  offenderMatchesEntityScope,
  type LoadedSystemRef,
  type OffenderScope,
  type OffenderSignalFilter,
  type OffenderTestFilter,
  type RankedOffender,
} from '../forensics/rankOffenders';
import type { EstateRecommendation, RankedEstateItem } from './estateRecommendationTypes';

function matchesScope(schemaLevel: RankedOffender['schemaLevel'], scope: OffenderScope): boolean {
  if (scope === 'components') return schemaLevel === 'component' || schemaLevel === 'code';
  return schemaLevel === 'container' || schemaLevel === 'context';
}

const HOTSPOT_RECOMMENDATION_KINDS = new Set([
  'reduce-composite-risk',
  'review-timeouts-fallbacks',
  'add-circuit-breaker',
]);

function matchesRecommendationKindFilter(
  kind: Recommendation['kind'],
  filter: OffenderSignalFilter
): boolean {
  if (filter === 'all') return true;
  if (filter === 'refactor' || filter === 'silos') return kind.startsWith('refactor-');
  if (filter === 'hotspots') return HOTSPOT_RECOMMENDATION_KINDS.has(kind);
  return false;
}

function matchesRecommendationFilter(
  item: RankedEstateItem,
  filter: OffenderSignalFilter
): boolean {
  if (item.offender) return matchesOffenderFilter(item.offender, filter);
  return matchesRecommendationKindFilter(item.recommendation.kind, filter);
}

function isHeatingOffender(offender: RankedOffender): boolean {
  const ratio = churnAccelerationRatio(
    offender.churn30 ?? 0,
    offender.churn365 ?? offender.churn ?? 0
  );
  return ratio != null && ratio >= 2;
}

function matchesOffenderFilter(offender: RankedOffender, filter: OffenderSignalFilter): boolean {
  if (filter === 'all') return true;
  if (filter === 'hotspots') {
    return (
      offender.classifications.includes('hotspot') ||
      offender.hotspotScore >= 0.5 ||
      (offender.hotspotCount ?? 0) > 0
    );
  }
  if (filter === 'refactor') return offender.refactorScore > 0;
  if (filter === 'heating') return isHeatingOffender(offender);
  return (
    offender.classifications.includes('knowledge-silo') || (offender.knowledgeSiloCount ?? 0) > 0
  );
}

function matchesTestFilter(
  systems: readonly LoadedSystemRef[],
  entityRef: string,
  testFilter: OffenderTestFilter
): boolean {
  if (testFilter === 'all') return true;
  const node = systems
    .flatMap(system => system.schema.nodes)
    .find(candidate => candidate.entityRef === entityRef);
  if (!node) return false;
  const isTest = node.isTest === true;
  return testFilter === 'test' ? isTest : !isTest;
}

function matchesEntityScopeFilter(
  item: RankedEstateItem,
  scopeEntityRef: string,
  systems: readonly LoadedSystemRef[]
): boolean {
  if (item.offender) {
    return offenderMatchesEntityScope(item.offender, scopeEntityRef, systems);
  }
  const entityRef = item.recommendation.targetEntityRef;
  return entityRef === scopeEntityRef || entityRef.startsWith(`${scopeEntityRef}/`);
}

function matchesEstateQuery(item: RankedEstateItem, normalizedQuery: string): boolean {
  if (!normalizedQuery) return true;
  const recommendation = item.recommendation;
  return (
    recommendation.title.toLowerCase().includes(normalizedQuery) ||
    recommendation.targetName.toLowerCase().includes(normalizedQuery) ||
    recommendation.targetEntityRef.toLowerCase().includes(normalizedQuery) ||
    recommendation.diagramName.toLowerCase().includes(normalizedQuery) ||
    recommendation.kind.toLowerCase().includes(normalizedQuery) ||
    (item.offender?.parentLabel.toLowerCase().includes(normalizedQuery) ?? false)
  );
}

function matchesRecommendationQuery(
  recommendation: EstateRecommendation,
  normalizedQuery: string
): boolean {
  if (!normalizedQuery) return true;
  return (
    recommendation.title.toLowerCase().includes(normalizedQuery) ||
    recommendation.targetName.toLowerCase().includes(normalizedQuery) ||
    recommendation.targetEntityRef.toLowerCase().includes(normalizedQuery) ||
    recommendation.diagramName.toLowerCase().includes(normalizedQuery) ||
    recommendation.kind.toLowerCase().includes(normalizedQuery)
  );
}

function matchesRecommendationScope(
  recommendation: EstateRecommendation,
  scopeEntityRef: string,
  systems: readonly LoadedSystemRef[]
): boolean {
  const offender = findForensicsOffenderByEntityRef([...systems], recommendation.targetEntityRef);
  if (offender) return offenderMatchesEntityScope(offender, scopeEntityRef, systems);
  return (
    recommendation.targetEntityRef === scopeEntityRef ||
    recommendation.targetEntityRef.startsWith(`${scopeEntityRef}/`)
  );
}

export function filterRankedEstateItems(
  items: readonly RankedEstateItem[],
  {
    scope,
    scopeEntityRef,
    systems,
    filter,
    testFilter,
    query,
  }: {
    scope: OffenderScope;
    scopeEntityRef?: string | null;
    systems: readonly LoadedSystemRef[];
    filter: OffenderSignalFilter;
    testFilter: OffenderTestFilter;
    query?: string;
  }
): RankedEstateItem[] {
  const normalizedQuery = query?.trim().toLowerCase() ?? '';

  return items.filter(item => {
    const offender = item.offender;
    if (offender) {
      if (!matchesScope(offender.schemaLevel, scope)) return false;
      if (!matchesOffenderFilter(offender, filter)) return false;
      if (!matchesTestFilter(systems, offender.entityRef, testFilter)) return false;
    } else if (!matchesRecommendationFilter(item, filter)) {
      return false;
    }

    if (scopeEntityRef && !matchesEntityScopeFilter(item, scopeEntityRef, systems)) {
      return false;
    }

    return matchesEstateQuery(item, normalizedQuery);
  });
}

export function filterEstateRecommendations(
  recommendations: readonly EstateRecommendation[],
  {
    scopeEntityRef,
    systems,
    source,
    query,
  }: {
    scopeEntityRef?: string | null;
    systems: readonly LoadedSystemRef[];
    source?: 'all' | Recommendation['source'];
    query?: string;
  }
): EstateRecommendation[] {
  const normalizedQuery = query?.trim().toLowerCase() ?? '';

  return recommendations.filter(recommendation => {
    if (scopeEntityRef && !matchesRecommendationScope(recommendation, scopeEntityRef, systems)) {
      return false;
    }
    if (source && source !== 'all' && recommendation.source !== source) return false;
    return matchesRecommendationQuery(recommendation, normalizedQuery);
  });
}
