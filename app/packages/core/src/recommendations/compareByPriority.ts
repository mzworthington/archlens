export function compareByPriorityDesc<T extends { priority: number }>(left: T, right: T): number {
  return right.priority - left.priority;
}
