import type { OffenderSignalFilter, RankedOffender } from './rankOffenders';

function compareDesc(left: number, right: number): number {
  return right - left;
}

function firstNonZero(diffs: readonly number[]): number {
  for (const diff of diffs) {
    if (diff !== 0) return diff;
  }
  return 0;
}

function hotspotFlag(offender: RankedOffender): number {
  const classified = offender.classifications.includes('hotspot');
  const counted = (offender.hotspotCount ?? 0) > 0;
  return classified || counted ? 1 : 0;
}

function siloFlag(offender: RankedOffender): number {
  const classified = offender.classifications.includes('knowledge-silo');
  const counted = (offender.knowledgeSiloCount ?? 0) > 0;
  return classified || counted ? 1 : 0;
}

function refactorSortKeys(offender: RankedOffender): number[] {
  return [
    offender.effectiveRefactorScore ?? offender.refactorScore,
    offender.compositeRiskScore ?? 0,
    offender.hotspotScore,
    offender.complexity ?? 0,
  ];
}

function defaultSortKeys(offender: RankedOffender): number[] {
  return [
    hotspotFlag(offender),
    offender.hotspotScore,
    siloFlag(offender),
    (offender.hotspotCount ?? 0) + (offender.knowledgeSiloCount ?? 0),
    offender.complexity ?? 0,
  ];
}

function compareByKeys(aKeys: readonly number[], bKeys: readonly number[]): number {
  return firstNonZero(aKeys.map((value, index) => compareDesc(value, bKeys[index]!)));
}

/** Sort comparator for TraceLens offender ranking. */
export function compareOffenders(
  a: RankedOffender,
  b: RankedOffender,
  filter: OffenderSignalFilter
): number {
  if (filter === 'refactor') {
    return compareByKeys(refactorSortKeys(a), refactorSortKeys(b));
  }
  return compareByKeys(defaultSortKeys(a), defaultSortKeys(b));
}
