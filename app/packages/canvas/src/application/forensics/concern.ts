import type { C4Level, ForensicClassification, NodeForensics, SystemSchema } from '@archlens/core';

export type ConcernLevel = 'none' | 'info' | 'warning' | 'danger';

export interface ForensicsConcern {
  level: ConcernLevel;
  reasons: string[];
}

export type OffenderScope = 'components' | 'containers';
export type OffenderSignalFilter = 'all' | 'hotspots' | 'silos' | 'refactor' | 'heating';
export type OffenderTestFilter = 'all' | 'prod' | 'test';

export type LoadedSystemRef = {
  path: string;
  name: string;
  schema: SystemSchema;
};

export type RankedOffender = {
  entityRef: string;
  name: string;
  type: string;
  /** Diagram / parent label for context in the list. */
  parentLabel: string;
  schemaPath: string;
  schemaLevel: C4Level;
  /** Diagram identity used for `/workspace/{ref}` navigation. */
  diagramEntityRef: string;
  hotspotScore: number;
  refactorScore: number;
  complexity?: number;
  churn?: number;
  churn30?: number;
  churn365?: number;
  lineChurn?: number;
  topAuthorPercent?: number;
  authorCount?: number;
  hotspotCount?: number;
  knowledgeSiloCount?: number;
  classifications: ForensicClassification[];
  concern: ForensicsConcern;
  sinceDays?: number;
  /** Incident edge count - structural context only, not a forensics signal. */
  dependencyCount: number;
  /** ChaosLens blast exposure when simulation is active. */
  blastRadius?: number;
  /** hotspotScore × blastRadius when both are available. */
  compositeRiskScore?: number;
  /** Refactor score boosted by critical-path / weak-safeguard context. */
  effectiveRefactorScore?: number;
  /** ChaosLens structural SPOF from the active simulation. */
  isResilienceSpof?: boolean;
  /** ChaosLens critical blast path from the active simulation. */
  onResilienceCriticalPath?: boolean;
  /** Plain-language ChaosLens exposure for TraceLens rows. */
  chaosRiskLabel?: string;
  /** Weekly churn counts for micro sparklines (oldest week first). */
  churnByWeek?: number[];
  /** Weekly relative hotspotScore (oldest week first). */
  hotspotScoreByWeek?: number[];
};

const HOTSPOT_SCORE_THRESHOLD = 0.5;
const COMPLEXITY_THRESHOLD = 10;

/**
 * Rank forensics risk for UI highlighting.
 * Classifications from CLI scoring take precedence over raw thresholds.
 */
export function evaluateForensicsConcern(forensics?: NodeForensics): ForensicsConcern {
  if (!forensics) {
    return { level: 'none', reasons: [] };
  }

  const reasons: string[] = [];
  const classifications = forensics.classifications ?? [];
  const hasHotspot = classifications.includes('hotspot');
  const hasSilo = classifications.includes('knowledge-silo');

  if (hasHotspot) reasons.push('Hotspot');
  if (hasSilo) reasons.push('Knowledge silo');

  if (hasHotspot) {
    return { level: 'danger', reasons };
  }
  if (hasSilo) {
    return { level: 'warning', reasons };
  }

  if ((forensics.hotspotScore ?? 0) >= HOTSPOT_SCORE_THRESHOLD) {
    return { level: 'danger', reasons: ['High hotspot score'] };
  }

  const complexity = forensics.complexity ?? 0;
  if (complexity >= COMPLEXITY_THRESHOLD && forensics.authorCount === 1) {
    return { level: 'warning', reasons: ['Knowledge silo risk'] };
  }
  if (complexity >= COMPLEXITY_THRESHOLD) {
    return { level: 'info', reasons: ['Elevated complexity'] };
  }

  return { level: 'none', reasons: [] };
}
