import type { EntityRef, SystemNode } from '../models/schema';
import {
  computeCompositeRiskScore,
  computeEffectiveRefactorScore,
  type ChaosRefactorContext,
} from '../forensics/compositeRisk';
import { computeRefactorScore } from '../forensics/refactorScore';
import type { Recommendation } from './types';

const COMPOSITE_RISK_THRESHOLD = 0.15;

export interface BuildForensicsRecommendationsInput {
  nodes: readonly SystemNode[];
  chaosContext?: Map<EntityRef, ChaosRefactorContext>;
}

function recommendationId(entityRef: EntityRef): string {
  return `reduce-composite-risk:${entityRef}`;
}

/**
 * Cross-signal recommendations for nodes with elevated composite risk
 * (TraceLens hotspot × ChaosLens blast exposure).
 */
export function buildForensicsRecommendations(
  input: BuildForensicsRecommendationsInput
): Recommendation[] {
  const { nodes, chaosContext } = input;
  const recommendations: Recommendation[] = [];

  for (const node of nodes) {
    const forensics = node.forensics;
    if (!forensics) continue;

    const hotspotScore = forensics.hotspotScore ?? 0;
    const refactorScore = computeRefactorScore(forensics);
    const chaos = chaosContext?.get(node.entityRef);
    const blastRadius = chaos?.blastRadius ?? 0;

    if (hotspotScore <= 0 && refactorScore <= 0) continue;
    if (blastRadius <= 0 && !chaos?.isSpof) continue;

    const compositeRiskScore = computeCompositeRiskScore(hotspotScore, blastRadius);
    if (compositeRiskScore < COMPOSITE_RISK_THRESHOLD) continue;

    const effectiveRefactorScore =
      chaos && refactorScore > 0
        ? computeEffectiveRefactorScore(refactorScore, chaos)
        : refactorScore;

    const priority = Math.round(Math.min(100, compositeRiskScore * 100 + (chaos?.isSpof ? 15 : 0)));

    recommendations.push({
      id: recommendationId(node.entityRef),
      kind: 'reduce-composite-risk',
      source: 'tracelens',
      targetEntityRef: node.entityRef,
      targetName: node.name,
      title: 'Reduce composite risk',
      detail: `${node.name} combines elevated change risk with high blast exposure — prioritize refactoring or add safeguards before the next incident.`,
      priority,
      evidence: {
        forensics: {
          hotspotScore,
          refactorScore,
          effectiveRefactorScore,
          complexity: forensics.complexity,
          churn: forensics.churn,
          authorCount: forensics.authorCount,
          topAuthorPercent: forensics.topAuthorPercent,
          classifications: forensics.classifications,
        },
        simulation: chaos
          ? {
              blastRadius: chaos.blastRadius,
              isSpof: chaos.isSpof,
              onCriticalPath: chaos.onCriticalPath,
              safeguardCoverage: chaos.safeguardCoverage,
            }
          : undefined,
        compositeRiskScore,
      },
      actions: [
        {
          kind: 'review-refactor-plan',
          label: `Review refactor plan for ${node.name}`,
          targetEntityRef: node.entityRef,
        },
        ...(chaos && chaos.safeguardCoverage < 0.5
          ? [
              {
                kind: 'add-safeguards',
                label: `Add safeguards on ${node.name}`,
                targetEntityRef: node.entityRef,
              },
            ]
          : []),
      ],
    });
  }

  return recommendations.sort((a, b) => b.priority - a.priority);
}
