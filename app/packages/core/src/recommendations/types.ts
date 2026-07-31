import type { EntityRef, ForensicClassification, NodeForensics } from '../models/schema';
import type { RefactorSuggestionKind } from '../forensics/refactorSuggestions';

export type RecommendationSource = 'chaoslens' | 'tracelens';

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
}
