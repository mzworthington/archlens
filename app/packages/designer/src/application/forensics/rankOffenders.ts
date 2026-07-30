import type { C4Level, ForensicClassification, SystemNode, SystemSchema } from '@archlens/core';
import {
  churnAccelerationRatio,
  computeCompositeRiskScore,
  computeEffectiveRefactorScore,
  computeRefactorScore,
  type ChaosRefactorContext,
} from '@archlens/core/forensics';
import { evaluateForensicsConcern, type ForensicsConcern } from './concern';

export type OffenderScope = 'components' | 'containers';
export type OffenderSignalFilter = 'all' | 'hotspots' | 'silos' | 'refactor' | 'heating';
export type OffenderTestFilter = 'all' | 'prod' | 'test';

export type LoadedSystemRef = {
  path: string;
  name: string;
  schema: SystemSchema;
};

export type RankedOffender = {
  entityRef: string;
  name: string;
  type: string;
  /** Diagram / parent label for context in the list. */
  parentLabel: string;
  schemaPath: string;
  schemaLevel: C4Level;
  /** Diagram identity used for `/workspace/{ref}` navigation. */
  diagramEntityRef: string;
  hotspotScore: number;
  refactorScore: number;
  complexity?: number;
  churn?: number;
  churn30?: number;
  churn365?: number;
  lineChurn?: number;
  topAuthorPercent?: number;
  authorCount?: number;
  hotspotCount?: number;
  knowledgeSiloCount?: number;
  classifications: ForensicClassification[];
  concern: ForensicsConcern;
  sinceDays?: number;
  /** Incident edge count - structural context only, not a forensics signal. */
  dependencyCount: number;
  /** ChaosLens blast exposure when simulation is active. */
  blastRadius?: number;
  /** hotspotScore × blastRadius when both are available. */
  compositeRiskScore?: number;
  /** Refactor score boosted by critical-path / weak-safeguard context. */
  effectiveRefactorScore?: number;
};

function hasUsefulForensics(node: SystemNode): boolean {
  const f = node.forensics;
  if (!f) return false;
  return (
    (f.hotspotScore ?? 0) > 0 ||
    (f.complexity ?? 0) > 0 ||
    (f.churn ?? 0) > 0 ||
    (f.hotspotCount ?? 0) > 0 ||
    (f.knowledgeSiloCount ?? 0) > 0 ||
    (f.classifications?.length ?? 0) > 0
  );
}

function toOffender(
  node: SystemNode,
  system: LoadedSystemRef,
  chaosContext?: Map<string, ChaosRefactorContext>
): RankedOffender {
  const f = node.forensics!;
  const containerHint =
    typeof node.properties?.containerId === 'string' ? node.properties.containerId : undefined;
  const dependencyCount = system.schema.dependencies.filter(
    d => d.from === node.entityRef || d.to === node.entityRef
  ).length;
  const refactorScore = computeRefactorScore(f);
  const chaos = chaosContext?.get(node.entityRef);
  const blastRadius = chaos?.blastRadius;
  const compositeRiskScore =
    blastRadius != null && blastRadius > 0
      ? computeCompositeRiskScore(f.hotspotScore ?? 0, blastRadius)
      : undefined;
  const effectiveRefactorScore =
    chaos && refactorScore > 0 ? computeEffectiveRefactorScore(refactorScore, chaos) : undefined;

  return {
    entityRef: node.entityRef,
    name: node.name,
    type: node.type,
    parentLabel: containerHint || system.schema.name || system.name,
    schemaPath: system.path,
    schemaLevel: system.schema.level,
    diagramEntityRef: system.schema.entityRef || system.schema.name || system.path,
    hotspotScore: f.hotspotScore ?? 0,
    refactorScore,
    complexity: f.complexity,
    churn: f.churn,
    churn30: f.churn30,
    churn365: f.churn365,
    lineChurn: f.lineChurn,
    topAuthorPercent: f.topAuthorPercent,
    authorCount: f.authorCount,
    hotspotCount: f.hotspotCount,
    knowledgeSiloCount: f.knowledgeSiloCount,
    classifications: f.classifications ?? [],
    concern: evaluateForensicsConcern(f),
    sinceDays: f.sinceDays,
    dependencyCount,
    blastRadius,
    compositeRiskScore,
    effectiveRefactorScore,
  };
}

function matchesScope(schemaLevel: C4Level, scope: OffenderScope): boolean {
  if (scope === 'components') return schemaLevel === 'component' || schemaLevel === 'code';
  return schemaLevel === 'container' || schemaLevel === 'context';
}

function matchesFilter(offender: RankedOffender, filter: OffenderSignalFilter): boolean {
  if (filter === 'all') return true;
  if (filter === 'hotspots') {
    return (
      offender.classifications.includes('hotspot') ||
      offender.hotspotScore >= 0.5 ||
      (offender.hotspotCount ?? 0) > 0
    );
  }
  if (filter === 'refactor') {
    return offender.refactorScore > 0;
  }
  if (filter === 'heating') {
    const ratio = churnAccelerationRatio(
      offender.churn30 ?? 0,
      offender.churn365 ?? offender.churn ?? 0
    );
    return ratio != null && ratio >= 2;
  }
  return (
    offender.classifications.includes('knowledge-silo') || (offender.knowledgeSiloCount ?? 0) > 0
  );
}

function compareOffenders(
  a: RankedOffender,
  b: RankedOffender,
  filter: OffenderSignalFilter
): number {
  if (filter === 'refactor') {
    const aScore = a.effectiveRefactorScore ?? a.refactorScore;
    const bScore = b.effectiveRefactorScore ?? b.refactorScore;
    if (aScore !== bScore) return bScore - aScore;
    const aComposite = a.compositeRiskScore ?? 0;
    const bComposite = b.compositeRiskScore ?? 0;
    if (aComposite !== bComposite) return bComposite - aComposite;
    if (a.hotspotScore !== b.hotspotScore) return b.hotspotScore - a.hotspotScore;
    return (b.complexity ?? 0) - (a.complexity ?? 0);
  }

  const aHot = a.classifications.includes('hotspot') || (a.hotspotCount ?? 0) > 0 ? 1 : 0;
  const bHot = b.classifications.includes('hotspot') || (b.hotspotCount ?? 0) > 0 ? 1 : 0;
  if (aHot !== bHot) return bHot - aHot;

  if (a.hotspotScore !== b.hotspotScore) return b.hotspotScore - a.hotspotScore;

  const aSilo =
    a.classifications.includes('knowledge-silo') || (a.knowledgeSiloCount ?? 0) > 0 ? 1 : 0;
  const bSilo =
    b.classifications.includes('knowledge-silo') || (b.knowledgeSiloCount ?? 0) > 0 ? 1 : 0;
  if (aSilo !== bSilo) return bSilo - aSilo;

  const aRollup = (a.hotspotCount ?? 0) + (a.knowledgeSiloCount ?? 0);
  const bRollup = (b.hotspotCount ?? 0) + (b.knowledgeSiloCount ?? 0);
  if (aRollup !== bRollup) return bRollup - aRollup;

  return (b.complexity ?? 0) - (a.complexity ?? 0);
}

function matchesTestFilter(node: SystemNode, testFilter: OffenderTestFilter): boolean {
  if (testFilter === 'all') return true;
  const isTest = node.isTest === true;
  return testFilter === 'test' ? isTest : !isTest;
}

/**
 * Collect and rank nodes with forensics across loaded blueprint systems.
 */
export function rankForensicsOffenders(
  systems: LoadedSystemRef[],
  scope: OffenderScope,
  filter: OffenderSignalFilter = 'all',
  chaosContext?: Map<string, ChaosRefactorContext>,
  testFilter: OffenderTestFilter = 'all'
): RankedOffender[] {
  const collected: RankedOffender[] = [];

  for (const system of systems) {
    if (!matchesScope(system.schema.level, scope)) continue;
    for (const node of system.schema.nodes) {
      if (!hasUsefulForensics(node)) continue;
      if (!matchesTestFilter(node, testFilter)) continue;
      collected.push(toOffender(node, system, chaosContext));
    }
  }

  return collected
    .filter(o => matchesFilter(o, filter))
    .sort((a, b) => compareOffenders(a, b, filter));
}

/** Resolve a ranked offender row by entity ref (ignores scope/filter). */
export function findForensicsOffenderByEntityRef(
  systems: LoadedSystemRef[],
  entityRef: string,
  chaosContext?: Map<string, ChaosRefactorContext>
): RankedOffender | undefined {
  for (const system of systems) {
    for (const node of system.schema.nodes) {
      if (node.entityRef === entityRef && hasUsefulForensics(node)) {
        return toOffender(node, system, chaosContext);
      }
    }
  }
  return undefined;
}

/** Lookback window shown in the forensics chrome (max across ranked rows). */
export function resolveLookbackDays(offenders: RankedOffender[]): number | undefined {
  let max: number | undefined;
  for (const o of offenders) {
    if (o.sinceDays == null) continue;
    max = max == null ? o.sinceDays : Math.max(max, o.sinceDays);
  }
  return max;
}

/** True when any loaded schema node carries a forensics block. */
export function loadedSystemsHaveForensics(systems: LoadedSystemRef[]): boolean {
  for (const system of systems) {
    for (const node of system.schema.nodes) {
      if (node.forensics) return true;
    }
  }
  return false;
}
