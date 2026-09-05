import {
  buildAdviceLensArtifact,
  buildRefactorRecommendations,
  compareByPriorityDesc,
  formatAdviceLensArtifact,
  runEstateResilience,
  type AdviceLensArtifact,
  type AdviceLensArtifactFormat,
  type Recommendation,
} from '@archlens/core/recommendations';
import { buildOwnershipBreakdown, buildRefactorBoundary } from '@archlens/core/forensics';
import { collectRefactorBoundaryNodes } from '../forensics/build/buildRefactorPlan';
import { rankForensicsOffenders, type LoadedSystemRef } from '../forensics/rankOffenders';
import type {
  BuildEstateRecommendationsOptions,
  EstateRecommendation,
  EstateRecommendationsReport,
} from './estateRecommendationTypes';

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

  return [...byId.values()].sort(compareByPriorityDesc);
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
