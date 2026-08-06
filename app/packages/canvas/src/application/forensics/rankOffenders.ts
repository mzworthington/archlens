import type { C4Level, ForensicClassification, SystemNode, SystemSchema } from '@archlens/core';
import { EntityRef } from '@archlens/core';
import type { ChaosRefactorContext } from '@archlens/core/forensics';
import type { ForensicsConcern } from './concern';
import { compareOffenders } from './compareOffenders';
import {
  hasUsefulForensics,
  matchesOffenderScope,
  matchesOffenderSignalFilter,
  matchesOffenderTestFilter,
} from './offenderFilters';
import { toRankedOffender } from './toRankedOffender';

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
  /** ChaosLens structural SPOF from the active simulation. */
  isResilienceSpof?: boolean;
  /** ChaosLens critical blast path from the active simulation. */
  onResilienceCriticalPath?: boolean;
  /** Plain-language ChaosLens exposure for TraceLens rows. */
  chaosRiskLabel?: string;
  /** Weekly churn counts for micro sparklines (oldest week first). */
  churnByWeek?: number[];
};

/**
 * Collect and rank nodes with forensics across loaded blueprint systems.
 */
export function rankForensicsOffenders(
  systems: readonly LoadedSystemRef[],
  scope: OffenderScope,
  filter: OffenderSignalFilter = 'all',
  chaosContext?: Map<string, ChaosRefactorContext>,
  testFilter: OffenderTestFilter = 'all'
): RankedOffender[] {
  const collected: RankedOffender[] = [];

  for (const system of systems) {
    if (!matchesOffenderScope(system.schema.level, scope)) continue;
    for (const node of system.schema.nodes) {
      if (!hasUsefulForensics(node)) continue;
      if (!matchesOffenderTestFilter(node, testFilter)) continue;
      collected.push(toRankedOffender(node, system, chaosContext));
    }
  }

  return collected
    .filter(offender => matchesOffenderSignalFilter(offender, filter))
    .sort((a, b) => compareOffenders(a, b, filter));
}

function findSystemNode(
  systems: readonly LoadedSystemRef[],
  entityRef: string
): { node: SystemNode; schemaLevel: C4Level } | undefined {
  for (const system of systems) {
    const node = system.schema.nodes.find(candidate => candidate.entityRef === entityRef);
    if (node) return { node, schemaLevel: system.schema.level };
  }
  return undefined;
}

/**
 * True when an entity (optionally on a given diagram) belongs to the subtree
 * rooted at scopeEntityRef — shared by offender ranking and complexity summary.
 */
export function entityRefMatchesEntityScope(
  entityRef: string,
  scopeEntityRef: string,
  systems: readonly LoadedSystemRef[],
  diagramEntityRef?: string
): boolean {
  if (entityRef === scopeEntityRef) return true;
  if (entityRef.startsWith(`${scopeEntityRef}/`)) return true;

  const scope = findSystemNode(systems, scopeEntityRef);
  if (scope && (scope.schemaLevel === 'container' || scope.schemaLevel === 'context')) {
    const containerId = EntityRef.leaf(scopeEntityRef);
    const node = findSystemNode(systems, entityRef)?.node;
    if (node?.properties?.containerId === containerId) return true;
  }

  if (
    diagramEntityRef &&
    (diagramEntityRef === scopeEntityRef || diagramEntityRef.startsWith(`${scopeEntityRef}/`))
  ) {
    return true;
  }

  return false;
}

/** True when an offender row belongs to the entity subtree rooted at scopeEntityRef. */
export function offenderMatchesEntityScope(
  offender: RankedOffender,
  scopeEntityRef: string,
  systems: readonly LoadedSystemRef[]
): boolean {
  return entityRefMatchesEntityScope(
    offender.entityRef,
    scopeEntityRef,
    systems,
    offender.diagramEntityRef
  );
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
        return toRankedOffender(node, system, chaosContext);
      }
    }
  }
  return undefined;
}

/** Lookback window shown in the forensics chrome (max across ranked rows). */
export function resolveLookbackDays(offenders: RankedOffender[]): number | undefined {
  let max: number | undefined;
  for (const offender of offenders) {
    if (offender.sinceDays == null) continue;
    max = max == null ? offender.sinceDays : Math.max(max, offender.sinceDays);
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
