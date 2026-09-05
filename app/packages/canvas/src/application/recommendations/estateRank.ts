export type EstateRankSignal = {
  id: string;
  priority: number;
};

export function estateRankSignalFrom(recommendation: EstateRankSignal): EstateRankSignal {
  return {
    id: recommendation.id,
    priority: recommendation.priority,
  };
}

export function compareEstateRank(left: EstateRankSignal, right: EstateRankSignal): number {
  return right.priority - left.priority;
}

export function sortByEstateRank<T extends { recommendation: EstateRankSignal }>(
  items: readonly T[]
): T[] {
  return [...items].sort((left, right) =>
    compareEstateRank(
      estateRankSignalFrom(left.recommendation),
      estateRankSignalFrom(right.recommendation)
    )
  );
}
