import type { DiagramResilienceReport, Recommendation } from '@archlens/core/recommendations';
import type { RankedOffender } from '../forensics/rankOffenders';

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
