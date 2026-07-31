import type { RecommendationEvidence } from './types';

function pushNumeric(citations: string[], key: string, value: number | undefined): void {
  if (value == null || Number.isNaN(value)) return;
  citations.push(`${key}:${value.toFixed(2)}`);
}

function pushBoolean(citations: string[], key: string, value: boolean | undefined): void {
  if (value == null) return;
  citations.push(`${key}:${value}`);
}

/**
 * Stable evidence keys for AdviceLens Narration grounding.
 * Narrators should only cite keys present in this list.
 */
export function listEvidenceCitations(evidence: RecommendationEvidence): string[] {
  const citations: string[] = [];

  pushNumeric(citations, 'compositeRiskScore', evidence.compositeRiskScore);

  const forensics = evidence.forensics;
  if (forensics) {
    pushNumeric(citations, 'hotspotScore', forensics.hotspotScore);
    pushNumeric(citations, 'complexity', forensics.complexity);
    pushNumeric(citations, 'churn', forensics.churn);
    pushNumeric(citations, 'authorCount', forensics.authorCount);
    pushNumeric(citations, 'topAuthorPercent', forensics.topAuthorPercent);
    pushNumeric(citations, 'refactorScore', forensics.refactorScore);
    pushNumeric(citations, 'effectiveRefactorScore', forensics.effectiveRefactorScore);
    for (const classification of forensics.classifications ?? []) {
      citations.push(`classification:${classification}`);
    }
  }

  const simulation = evidence.simulation;
  if (simulation) {
    pushNumeric(citations, 'blastRadius', simulation.blastRadius);
    pushNumeric(citations, 'integrityHeat', simulation.integrityHeat);
    pushBoolean(citations, 'isSpof', simulation.isSpof);
    pushBoolean(citations, 'onCriticalPath', simulation.onCriticalPath);
    pushNumeric(citations, 'overallSla', simulation.overallSla);
    pushNumeric(citations, 'safeguardCoverage', simulation.safeguardCoverage);
  }

  return citations;
}
