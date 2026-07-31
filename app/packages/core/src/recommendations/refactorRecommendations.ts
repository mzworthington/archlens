import type { NodeForensics } from '../models/schema';
import type { OwnershipBreakdown } from '../forensics/ownership';
import type { RefactorBoundary } from '../forensics/refactorBoundary';
import {
  buildRefactorSuggestions,
  type RefactorSuggestion,
} from '../forensics/refactorSuggestions';
import type { Recommendation } from './types';

export interface BuildRefactorRecommendationsInput {
  boundary: RefactorBoundary;
  ownership?: OwnershipBreakdown;
  seedForensics?: NodeForensics;
}

function toRecommendation(
  suggestion: RefactorSuggestion,
  boundary: RefactorBoundary
): Recommendation {
  const targetEntityRef = boundary.seedEntityRef;
  return {
    id: `refactor-${suggestion.kind}:${targetEntityRef}`,
    kind: `refactor-${suggestion.kind}`,
    source: 'tracelens',
    targetEntityRef,
    targetName: boundary.seedName,
    title: suggestion.title,
    detail: suggestion.detail,
    priority: suggestion.priority,
    evidence: {
      forensics: {
        refactorScore: boundary.aggregateRefactorScore,
      },
    },
    actions: [
      {
        kind: suggestion.kind,
        label: suggestion.title,
        targetEntityRef,
      },
    ],
  };
}

/**
 * Structured refactor recommendations from a TraceLens boundary cluster.
 */
export function buildRefactorRecommendations(
  input: BuildRefactorRecommendationsInput
): Recommendation[] {
  const { boundary, ownership, seedForensics } = input;

  return buildRefactorSuggestions(boundary, { ownership, seedForensics }).map(suggestion =>
    toRecommendation(suggestion, boundary)
  );
}
