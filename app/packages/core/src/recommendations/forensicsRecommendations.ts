import type { EntityRef, SystemNode, SystemSchema } from '../models/schema';
import {
  computeCompositeRiskScore,
  computeEffectiveRefactorScore,
  type ChaosRefactorContext,
} from '../forensics/compositeRisk';
import { computeRefactorScore } from '../forensics/refactorScore';
import { isHumanActorNode } from '../taxonomy/nodeOwnership';
import {
  applicabilityEvidence,
  isResilienceAdviceTarget,
  resolveAdviceApplicability,
} from './resilienceAdviceEligibility';
import type { Recommendation, RecommendationAction } from './types';

const COMPOSITE_RISK_THRESHOLD = 0.15;

export interface BuildForensicsRecommendationsInput {
  schema: SystemSchema;
  nodes: readonly SystemNode[];
  chaosContext?: Map<EntityRef, ChaosRefactorContext>;
}

function recommendationId(entityRef: EntityRef): string {
  return `reduce-composite-risk:${entityRef}`;
}

function qualifiesForCompositeRisk(
  hotspotScore: number,
  refactorScore: number,
  chaos: ChaosRefactorContext | undefined
): boolean {
  if (hotspotScore <= 0 && refactorScore <= 0) return false;
  if ((chaos?.blastRadius ?? 0) <= 0 && !chaos?.isSpof) return false;
  return (
    computeCompositeRiskScore(hotspotScore, chaos?.blastRadius ?? 0) >= COMPOSITE_RISK_THRESHOLD
  );
}

function compositeRiskActions(
  schema: SystemSchema,
  adviceTargetEntityRef: EntityRef,
  adviceTargetName: string,
  chaos: ChaosRefactorContext | undefined
): RecommendationAction[] {
  const actions: RecommendationAction[] = [
    {
      kind: 'review-refactor-plan',
      label: `Review refactor plan for ${adviceTargetName}`,
      targetEntityRef: adviceTargetEntityRef,
    },
  ];

  if (
    chaos &&
    chaos.safeguardCoverage < 0.5 &&
    isResilienceAdviceTarget(schema, adviceTargetEntityRef)
  ) {
    actions.push({
      kind: 'add-safeguards',
      label: `Add outbound safeguards in ${adviceTargetName}`,
      targetEntityRef: adviceTargetEntityRef,
    });
  }

  return actions;
}

function tryBuildForensicsRecommendation(
  schema: SystemSchema,
  node: SystemNode,
  chaosContext: Map<EntityRef, ChaosRefactorContext> | undefined
): Recommendation | null {
  if (isHumanActorNode(node)) return null;

  const forensics = node.forensics;
  if (!forensics) return null;

  const hotspotScore = forensics.hotspotScore ?? 0;
  const refactorScore = computeRefactorScore(forensics);
  const chaos = chaosContext?.get(node.entityRef);

  if (!qualifiesForCompositeRisk(hotspotScore, refactorScore, chaos)) return null;

  const blastRadius = chaos?.blastRadius ?? 0;
  const compositeRiskScore = computeCompositeRiskScore(hotspotScore, blastRadius);
  const applicability = resolveAdviceApplicability(schema, node.entityRef);

  const effectiveRefactorScore =
    chaos && refactorScore > 0
      ? computeEffectiveRefactorScore(refactorScore, chaos)
      : refactorScore;

  const priority = Math.round(Math.min(100, compositeRiskScore * 100 + (chaos?.isSpof ? 15 : 0)));

  const contributorNote =
    applicability.contributorName && applicability.contributorName !== applicability.scopeName
      ? ` (driven by ${applicability.contributorName} at code level)`
      : '';

  return {
    id: recommendationId(applicability.adviceTargetEntityRef),
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
    actions: compositeRiskActions(
      schema,
      applicability.adviceTargetEntityRef,
      applicability.adviceTargetName,
      chaos
    ),
  };
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
    const recommendation = tryBuildForensicsRecommendation(schema, node, chaosContext);
    if (!recommendation || seen.has(recommendation.id)) continue;
    seen.add(recommendation.id);
    recommendations.push(recommendation);
  }

  return recommendations.sort((a, b) => b.priority - a.priority);
}
