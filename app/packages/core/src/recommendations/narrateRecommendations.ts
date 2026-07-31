import { listEvidenceCitations } from './evidenceCitations';
import type { Recommendation, RecommendationNarration } from './types';

export interface NarrateRecommendationInput {
  recommendation: Recommendation;
  citations: readonly string[];
  estateLabel?: string;
}

/** Port for Phase 5 LLM adapters — must not change priority or evidence. */
export interface AdviceLensNarrator {
  narrate(input: NarrateRecommendationInput): Promise<RecommendationNarration>;
}

export interface NarrateRecommendationsOptions {
  narrator?: AdviceLensNarrator;
  /** Optional estate label for narration prompts (not used for ranking). */
  estateLabel?: string;
}

function withNarration(
  recommendation: Recommendation,
  narration: RecommendationNarration
): Recommendation {
  return {
    ...recommendation,
    narration,
  };
}

/**
 * AdviceLens Narration layer — enriches recommendations with optional AI detail.
 * Without a narrator, returns the input unchanged (identity pass).
 * Never re-ranks or mutates priority or evidence.
 */
export async function narrateRecommendations(
  recommendations: readonly Recommendation[],
  options: NarrateRecommendationsOptions = {}
): Promise<Recommendation[]> {
  const { narrator, estateLabel } = options;
  if (!narrator) {
    return [...recommendations];
  }

  const narrated: Recommendation[] = [];
  for (const recommendation of recommendations) {
    const citations = listEvidenceCitations(recommendation.evidence);
    const narration = await narrator.narrate({
      recommendation,
      citations,
      estateLabel,
    });
    narrated.push(withNarration(recommendation, narration));
  }
  return narrated;
}
