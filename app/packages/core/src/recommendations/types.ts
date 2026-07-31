import type { EntityRef, ForensicClassification, NodeForensics } from '../models/schema';
import type { RefactorSuggestionKind } from '../forensics/refactorSuggestions';

export type RecommendationSource = 'chaoslens' | 'tracelens';

/** User-facing narration provider (AdviceLens Narration layer). */
export type AdviceLensNarrationProvider = 'adviceLens';

export type ResilienceRecommendationKind =
  | 'add-circuit-breaker'
  | 'keep-safeguard'
  | 'review-timeouts-fallbacks'
  | 'handle-event-staleness'
  | 'verify-integrity-handling';

export type RefactorRecommendationKind = `refactor-${RefactorSuggestionKind}`;

export type ForensicsRecommendationKind = 'reduce-composite-risk';

export type RecommendationKind =
  ResilienceRecommendationKind | RefactorRecommendationKind | ForensicsRecommendationKind;

export interface RecommendationEvidence {
  forensics?: Pick<
    NodeForensics,
    'hotspotScore' | 'complexity' | 'churn' | 'authorCount' | 'topAuthorPercent'
  > & {
    refactorScore?: number;
    effectiveRefactorScore?: number;
    classifications?: ForensicClassification[];
  };
  simulation?: {
    blastRadius?: number;
    integrityHeat?: number;
    isSpof?: boolean;
    onCriticalPath?: boolean;
    overallSla?: number;
    safeguardCoverage?: number;
  };
  compositeRiskScore?: number;
}

export interface RecommendationAction {
  kind: string;
  label: string;
  targetEntityRef?: EntityRef;
}

/** Optional AI-enriched detail grounded on {@link RecommendationEvidence}. */
export interface RecommendationNarration {
  provider: AdviceLensNarrationProvider;
  detail: string;
  /** Stable evidence keys the narrator cited (see `listEvidenceCitations`). */
  citations: string[];
  model?: string;
}

export interface Recommendation {
  id: string;
  kind: RecommendationKind;
  source: RecommendationSource;
  targetEntityRef: EntityRef;
  targetName: string;
  title: string;
  detail: string;
  /** Comparable priority in the range 0–100 (higher = more urgent). */
  priority: number;
  evidence: RecommendationEvidence;
  actions: RecommendationAction[];
  /** AdviceLens Narration enrichment — does not affect rank order. */
  narration?: RecommendationNarration;
}
