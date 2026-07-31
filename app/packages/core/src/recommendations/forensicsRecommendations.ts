import type { EntityRef, SystemNode, SystemSchema } from '../models/schema';
import {
  computeCompositeRiskScore,
  computeEffectiveRefactorScore,
  type ChaosRefactorContext,
} from '../forensics/compositeRisk';
import { computeRefactorScore } from '../forensics/refactorScore';
import {
  applicabilityEvidence,
  isResilienceAdviceTarget,
  resolveAdviceApplicability,
} from './resilienceAdviceEligibility';
import type { Recommendation } from './types';

const COMPOSITE_RISK_THRESHOLD = 0.15;

export interface BuildForensicsRecommendationsInput {
  schema: SystemSchema;
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
  const { schema, nodes, chaosContext } = input;
  const recommendations: Recommendation[] = [];
  const seen = new Set<string>();

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

    const applicability = resolveAdviceApplicability(schema, node.entityRef);
    const recommendationKey = recommendationId(applicability.adviceTargetEntityRef);
    if (seen.has(recommendationKey)) continue;
    seen.add(recommendationKey);

    const effectiveRefactorScore =
      chaos && refactorScore > 0
        ? computeEffectiveRefactorScore(refactorScore, chaos)
        : refactorScore;

    const priority = Math.round(Math.min(100, compositeRiskScore * 100 + (chaos?.isSpof ? 15 : 0)));

    const contributorNote =
      applicability.contributorName && applicability.contributorName !== applicability.scopeName
        ? ` (driven by ${applicability.contributorName} at code level)`
        : '';

    recommendations.push({
      id: recommendationKey,
      kind: 'reduce-composite-risk',
      source: 'tracelens',
      targetEntityRef: applicability.adviceTargetEntityRef,
      targetName: applicability.adviceTargetName,
      title: 'Reduce composite risk',
      detail: `${applicability.scopeName} combines elevated change risk with high blast exposure${contributorNote} — prioritize refactoring or add outbound safeguards in application code before the next incident.`,
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
        ...applicabilityEvidence(applicability),
      },
      actions: [
        {
          kind: 'review-refactor-plan',
          label: `Review refactor plan for ${applicability.adviceTargetName}`,
          targetEntityRef: applicability.adviceTargetEntityRef,
        },
        ...(chaos &&
        chaos.safeguardCoverage < 0.5 &&
        isResilienceAdviceTarget(schema, applicability.adviceTargetEntityRef)
          ? [
              {
                kind: 'add-safeguards',
                label: `Add outbound safeguards in ${applicability.adviceTargetName}`,
                targetEntityRef: applicability.adviceTargetEntityRef,
              },
            ]
          : []),
      ],
    });
  }

  return recommendations.sort((a, b) => b.priority - a.priority);
}
