import {
  buildAdviceLensArtifact,
  buildRefactorRecommendations,
  formatAdviceLensArtifact,
  runEstateResilience,
  type AdviceLensArtifact,
  type AdviceLensArtifactFormat,
  type DiagramResilienceReport,
  type Recommendation,
} from '@archlens/core/recommendations';
import {
  buildOwnershipBreakdown,
  buildRefactorBoundary,
  churnAccelerationRatio,
} from '@archlens/core/forensics';
import { collectRefactorBoundaryNodes } from '../forensics/buildRefactorPlan';
import {
  findForensicsOffenderByEntityRef,
  offenderMatchesEntityScope,
  rankForensicsOffenders,
  type LoadedSystemRef,
  type OffenderScope,
  type OffenderSignalFilter,
  type OffenderTestFilter,
  type RankedOffender,
} from '../forensics/rankOffenders';
import { compareEstateRank, estateRankSignalFrom } from './estateRank';

export type EstateRecommendation = Recommendation & {
  diagramPath: string;
  diagramName: string;
};

export type RankedEstateItem = {
  recommendation: EstateRecommendation;
  offender?: RankedOffender;
  /** Forensics-only row when no structured recommendation exists yet. */
  isFallback?: boolean;
};

export interface EstateRecommendationsReport {
  recommendations: EstateRecommendation[];
  summary: {
    diagramCount: number;
    totalScenarios: number;
    worstOverallSla: number;
    totalSpofs: number;
    recommendationCount: number;
  };
  /** Worst-case per-diagram reports from the estate resilience sweep (for CI/UI export). */
  diagrams: DiagramResilienceReport[];
}

export interface BuildEstateRecommendationsOptions {
  /** Lighter defaults for interactive TraceLens scans. */
  maxRegionOutageTargets?: number;
  maxFanInProbes?: number;
  /** Top refactor-ranked offenders to expand into boundary recommendations. */
  maxRefactorSeeds?: number;
}

const DEFAULT_MAX_REGION_OUTAGE = 5;
const DEFAULT_MAX_FAN_IN_PROBES = 3;
const DEFAULT_MAX_REFACTOR_SEEDS = 20;

function diagramForEntity(
  systems: readonly LoadedSystemRef[],
  entityRef: string
): LoadedSystemRef | undefined {
  return systems.find(system => system.schema.nodes.some(node => node.entityRef === entityRef));
}

function attachDiagram(
  recommendation: Recommendation,
  system: LoadedSystemRef | undefined
): EstateRecommendation {
  return {
    ...recommendation,
    diagramPath: system?.path ?? '',
    diagramName: system?.name ?? 'Unknown diagram',
  };
}

function mergeEstateRecommendations(
  primary: readonly EstateRecommendation[],
  extra: readonly EstateRecommendation[]
): EstateRecommendation[] {
  const byId = new Map<string, EstateRecommendation>();

  for (const recommendation of [...primary, ...extra]) {
    const existing = byId.get(recommendation.id);
    if (!existing || recommendation.priority > existing.priority) {
      byId.set(recommendation.id, recommendation);
    }
  }

  return [...byId.values()].sort((a, b) =>
    compareEstateRank(estateRankSignalFrom(a), estateRankSignalFrom(b))
  );
}

/**
 * Headless estate scan across loaded diagrams plus refactor-boundary recommendations
 * for top-ranked offenders.
 */
export function buildEstateRecommendations(
  systems: readonly LoadedSystemRef[],
  options: BuildEstateRecommendationsOptions = {}
): EstateRecommendationsReport {
  const diagrams = systems.map(system => ({
    path: system.path,
    relativePath: system.path,
    schema: system.schema,
  }));

  const resilienceReport = runEstateResilience(diagrams, {
    maxRegionOutageTargets: options.maxRegionOutageTargets ?? DEFAULT_MAX_REGION_OUTAGE,
    maxFanInProbes: options.maxFanInProbes ?? DEFAULT_MAX_FAN_IN_PROBES,
    loadedSystems: systems.map(system => ({
      path: system.path,
      name: system.name,
      schema: system.schema,
    })),
  });

  const resilienceRecommendations = resilienceReport.recommendations.map(recommendation =>
    attachDiagram(recommendation, diagramForEntity(systems, recommendation.targetEntityRef))
  );

  const boundaryNodes = collectRefactorBoundaryNodes(systems);
  const refactorSeeds = rankForensicsOffenders(systems, 'components', 'refactor').slice(
    0,
    options.maxRefactorSeeds ?? DEFAULT_MAX_REFACTOR_SEEDS
  );

  const refactorRecommendations: EstateRecommendation[] = [];
  for (const offender of refactorSeeds) {
    const boundary = buildRefactorBoundary(offender.entityRef, boundaryNodes);
    if (!boundary) continue;

    const seedNode = systems
      .flatMap(system => system.schema.nodes)
      .find(node => node.entityRef === offender.entityRef);
    const ownership = buildOwnershipBreakdown(seedNode?.forensics);
    const system = diagramForEntity(systems, offender.entityRef);

    for (const recommendation of buildRefactorRecommendations({
      boundary,
      ownership,
      seedForensics: seedNode?.forensics,
    })) {
      refactorRecommendations.push(attachDiagram(recommendation, system));
    }
  }

  const recommendations = mergeEstateRecommendations(
    resilienceRecommendations,
    refactorRecommendations
  );

  return {
    recommendations,
    summary: {
      ...resilienceReport.summary,
      recommendationCount: recommendations.length,
    },
    diagrams: resilienceReport.diagrams,
  };
}

function toCoreRecommendation(recommendation: EstateRecommendation): Recommendation {
  const { diagramPath: _diagramPath, diagramName: _diagramName, ...core } = recommendation;
  return core;
}

/** Same JSON artifact shape as `archlens resilience --format=json`. */
export function estateRecommendationsToAdviceLensArtifact(
  report: EstateRecommendationsReport
): AdviceLensArtifact {
  return buildAdviceLensArtifact({
    summary: report.summary,
    recommendations: report.recommendations.map(toCoreRecommendation),
    diagrams: report.diagrams,
  });
}

export function formatEstateAdviceLensArtifact(
  report: EstateRecommendationsReport,
  format: AdviceLensArtifactFormat = 'yaml'
): string {
  return formatAdviceLensArtifact(estateRecommendationsToAdviceLensArtifact(report), format);
}

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
  return false; // heating has no recommendation-only match
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
