import type { NodeForensics, SystemNode } from '@archlens/core';
import {
  computeCompositeRiskScore,
  computeEffectiveRefactorScore,
  computeRefactorScore,
  describeChaosRiskContext,
  type ChaosRefactorContext,
} from '@archlens/core/forensics';
import { evaluateForensicsConcern } from './concern';
import type { LoadedSystemRef, RankedOffender } from './rankOffenders';

function resolveChaosScores(
  forensics: NodeForensics,
  refactorScore: number,
  chaos: ChaosRefactorContext | undefined
) {
  const blastRadius = chaos?.blastRadius;
  const compositeRiskScore =
    blastRadius != null && blastRadius > 0
      ? computeCompositeRiskScore(forensics.hotspotScore ?? 0, blastRadius)
      : undefined;
  const effectiveRefactorScore =
    chaos && refactorScore > 0 ? computeEffectiveRefactorScore(refactorScore, chaos) : undefined;

  return {
    blastRadius,
    compositeRiskScore,
    effectiveRefactorScore,
    isResilienceSpof: chaos?.isSpof,
    onResilienceCriticalPath: chaos?.onCriticalPath,
    chaosRiskLabel: chaos ? describeChaosRiskContext(chaos) : undefined,
  };
}

export function toRankedOffender(
  node: SystemNode,
  system: LoadedSystemRef,
  chaosContext?: Map<string, ChaosRefactorContext>
): RankedOffender {
  const forensics = node.forensics!;
  const containerHint =
    typeof node.properties?.containerId === 'string' ? node.properties.containerId : undefined;
  const dependencyCount = system.schema.dependencies.filter(
    dependency => dependency.from === node.entityRef || dependency.to === node.entityRef
  ).length;
  const refactorScore = computeRefactorScore(forensics);
  const chaosScores = resolveChaosScores(
    forensics,
    refactorScore,
    chaosContext?.get(node.entityRef)
  );

  return {
    entityRef: node.entityRef,
    name: node.name,
    type: node.type,
    parentLabel: containerHint || system.schema.name || system.name,
    schemaPath: system.path,
    schemaLevel: system.schema.level,
    diagramEntityRef: system.schema.entityRef || system.schema.name || system.path,
    hotspotScore: forensics.hotspotScore ?? 0,
    refactorScore,
    complexity: forensics.complexity,
    churn: forensics.churn,
    churn30: forensics.churn30,
    churn365: forensics.churn365,
    lineChurn: forensics.lineChurn,
    topAuthorPercent: forensics.topAuthorPercent,
    authorCount: forensics.authorCount,
    hotspotCount: forensics.hotspotCount,
    knowledgeSiloCount: forensics.knowledgeSiloCount,
    classifications: forensics.classifications ?? [],
    concern: evaluateForensicsConcern(forensics),
    sinceDays: forensics.sinceDays,
    dependencyCount,
    churnByWeek: forensics.churnByWeek,
    ...chaosScores,
  };
}
