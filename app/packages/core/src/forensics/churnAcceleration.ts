/**
 * Compare short-window churn to the long-window monthly average.
 * Returns null when acceleration cannot be computed meaningfully.
 *
 * Example: churn30=5, churn365=6 → ratio ≈ 10 (ten times the typical monthly rate).
 */
export function churnAccelerationRatio(churn30: number, churn365: number): number | null {
  if (churn30 <= 0 || churn365 <= 0) return null;
  const monthlyAverage = churn365 / 12;
  if (monthlyAverage <= 0) return null;
  return churn30 / monthlyAverage;
}

export function formatChurnAcceleration(ratio: number): string {
  if (!Number.isFinite(ratio)) return '—';
  if (ratio >= 10) return `${ratio.toFixed(0)}× monthly`;
  if (ratio >= 2) return `${ratio.toFixed(1)}× monthly`;
  return `${ratio.toFixed(2)}× monthly`;
}

export type ChurnAccelerationTone = 'danger' | 'warning' | 'none';

export function churnAccelerationTone(ratio: number): ChurnAccelerationTone {
  if (ratio >= 4) return 'danger';
  if (ratio >= 2) return 'warning';
  return 'none';
}
