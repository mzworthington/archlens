import type { EntityRef } from '../models/schema';
import type { SimulationResult } from '../resilience/simulation';
import type { EstateResilienceReport, DiagramResilienceReport } from './runEstateResilience';
import type { Recommendation } from './types';

export const ADVICELENS_ARTIFACT_KIND = 'advicelens-estate-report' as const;
export const ADVICELENS_ARTIFACT_VERSION = 1 as const;

/** JSON-safe simulation payload (Maps become plain records). */
export type SerializedSimulationResult = Omit<
  SimulationResult,
  'heat' | 'heatHops' | 'integrityHeat'
> & {
  heat: Record<EntityRef, number>;
  heatHops: Record<EntityRef, number>;
  integrityHeat: Record<EntityRef, number>;
};

export type AdviceLensDiagramArtifact = Omit<DiagramResilienceReport, 'simulation'> & {
  simulation: SerializedSimulationResult;
};

/**
 * Stable AdviceLens estate report for CLI `--format=json`, CI artifacts,
 * and designer Download/Copy export.
 */
export type AdviceLensArtifact = {
  kind: typeof ADVICELENS_ARTIFACT_KIND;
  version: typeof ADVICELENS_ARTIFACT_VERSION;
  summary: EstateResilienceReport['summary'];
  recommendations: Recommendation[];
  diagrams: AdviceLensDiagramArtifact[];
};

export type AdviceLensGateOptions = {
  minSla: number;
  failOnRecommendations?: boolean;
};

export type AdviceLensGateResult = {
  ok: boolean;
  belowSlaThreshold: boolean;
  hasRecommendations: boolean;
  reasons: string[];
};

function mapToRecord(map: Map<EntityRef, number>): Record<EntityRef, number> {
  return Object.fromEntries(map.entries()) as Record<EntityRef, number>;
}

export function serializeSimulationResult(result: SimulationResult): SerializedSimulationResult {
  return {
    ...result,
    heat: mapToRecord(result.heat),
    heatHops: mapToRecord(result.heatHops),
    integrityHeat: mapToRecord(result.integrityHeat),
  };
}

export function serializeEstateResilienceReport(
  report: EstateResilienceReport
): AdviceLensArtifact {
  return {
    kind: ADVICELENS_ARTIFACT_KIND,
    version: ADVICELENS_ARTIFACT_VERSION,
    summary: report.summary,
    recommendations: report.recommendations,
    diagrams: report.diagrams.map(diagram => ({
      diagramPath: diagram.diagramPath,
      diagramRef: diagram.diagramRef,
      scenarioCount: diagram.scenarioCount,
      worstOverallSla: diagram.worstOverallSla,
      spofCount: diagram.spofCount,
      simulation: serializeSimulationResult(diagram.simulation),
      recommendations: diagram.recommendations,
    })),
  };
}

/** Build an artifact when the caller already has a recommendation list + summary. */
export function buildAdviceLensArtifact(input: {
  summary: EstateResilienceReport['summary'];
  recommendations: readonly Recommendation[];
  diagrams?: readonly DiagramResilienceReport[];
}): AdviceLensArtifact {
  return serializeEstateResilienceReport({
    summary: input.summary,
    recommendations: [...input.recommendations],
    diagrams: input.diagrams ? [...input.diagrams] : [],
  });
}

export function formatAdviceLensArtifactJson(artifact: AdviceLensArtifact): string {
  return `${JSON.stringify(artifact, null, 2)}\n`;
}

/**
 * CI / CLI gate: fail when worst SLA is below threshold, and optionally when
 * any recommendation was emitted.
 */
export function evaluateAdviceLensGate(
  summary: EstateResilienceReport['summary'],
  options: AdviceLensGateOptions
): AdviceLensGateResult {
  const belowSlaThreshold = summary.worstOverallSla < options.minSla;
  const hasRecommendations = summary.recommendationCount > 0;
  const reasons: string[] = [];

  if (belowSlaThreshold) {
    reasons.push(`Worst SLA ${summary.worstOverallSla}% is below --min-sla=${options.minSla}`);
  }
  if (options.failOnRecommendations && hasRecommendations) {
    reasons.push(
      `${summary.recommendationCount} AdviceLens recommendation(s) emitted (--fail-on-recommendations)`
    );
  }

  const ok = options.failOnRecommendations
    ? !(hasRecommendations || belowSlaThreshold)
    : !belowSlaThreshold;

  return { ok, belowSlaThreshold, hasRecommendations, reasons };
}
