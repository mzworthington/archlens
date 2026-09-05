import type { RankedOffender } from '../forensics/rankOffenders';
import type { RankedEstateItem } from './estateRecommendationTypes';

/** Numeric estate rank. Copy, title, detail, and narration must not feed this. */
export function fallbackEstateRankScore(offender: RankedOffender): number {
  return Math.max(
    1,
    Math.round(
      Math.min(
        55,
        (offender.effectiveRefactorScore ?? offender.refactorScore) * 0.35 +
          offender.hotspotScore * 35 +
          (offender.compositeRiskScore ?? 0) * 20
      )
    )
  );
}

export function estateRankScore(item: RankedEstateItem): number {
  if (item.isFallback && item.offender) {
    return fallbackEstateRankScore(item.offender);
  }
  return item.recommendation.priority;
}

export function compareByEstateRankScore(left: RankedEstateItem, right: RankedEstateItem): number {
  return estateRankScore(right) - estateRankScore(left);
}
