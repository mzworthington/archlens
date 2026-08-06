import type { C4Level, SystemNode } from '@archlens/core';
import { churnAccelerationRatio } from '@archlens/core/forensics';
import type {
  OffenderScope,
  OffenderSignalFilter,
  OffenderTestFilter,
  RankedOffender,
} from './rankOffenders';

export function hasUsefulForensics(node: SystemNode): boolean {
  const forensics = node.forensics;
  if (!forensics) return false;

  const signals = [
    forensics.hotspotScore ?? 0,
    forensics.complexity ?? 0,
    forensics.churn ?? 0,
    forensics.hotspotCount ?? 0,
    forensics.knowledgeSiloCount ?? 0,
    forensics.classifications?.length ?? 0,
  ];
  return signals.some(value => value > 0);
}

export function matchesOffenderScope(schemaLevel: C4Level, scope: OffenderScope): boolean {
  if (scope === 'components') return schemaLevel === 'component' || schemaLevel === 'code';
  return schemaLevel === 'container' || schemaLevel === 'context';
}

function isHotspotOffender(offender: RankedOffender): boolean {
  return (
    offender.classifications.includes('hotspot') ||
    offender.hotspotScore >= 0.5 ||
    (offender.hotspotCount ?? 0) > 0
  );
}

function isHeatingOffender(offender: RankedOffender): boolean {
  const ratio = churnAccelerationRatio(
    offender.churn30 ?? 0,
    offender.churn365 ?? offender.churn ?? 0
  );
  return ratio != null && ratio >= 2;
}

function isSiloOffender(offender: RankedOffender): boolean {
  return (
    offender.classifications.includes('knowledge-silo') || (offender.knowledgeSiloCount ?? 0) > 0
  );
}

export function matchesOffenderSignalFilter(
  offender: RankedOffender,
  filter: OffenderSignalFilter
): boolean {
  switch (filter) {
    case 'all':
      return true;
    case 'hotspots':
      return isHotspotOffender(offender);
    case 'refactor':
      return offender.refactorScore > 0;
    case 'heating':
      return isHeatingOffender(offender);
    case 'silos':
      return isSiloOffender(offender);
  }
}

export function matchesOffenderTestFilter(
  node: SystemNode,
  testFilter: OffenderTestFilter
): boolean {
  if (testFilter === 'all') return true;
  const isTest = node.isTest === true;
  return testFilter === 'test' ? isTest : !isTest;
}
