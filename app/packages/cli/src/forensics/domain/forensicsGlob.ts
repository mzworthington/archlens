import { DEFAULT_SCAN_GLOB } from '@archlens/analysis/options';

/** Forensics scan glob aligned with architecture defaults (source code, not IaC). */
export const DEFAULT_FORENSICS_GLOB = DEFAULT_SCAN_GLOB.replace(',tf', ',js,jsx');

export const LARGE_REPO_FILE_THRESHOLD = 2000;
export const DEFAULT_MIN_CHURN_FOR_COMPLEXITY_LARGE = 3;

export function resolveEffectiveMinChurnForComplexity(
  configured: number,
  fileCount: number
): number {
  if (configured > 0) return configured;
  if (fileCount > LARGE_REPO_FILE_THRESHOLD) return DEFAULT_MIN_CHURN_FOR_COMPLEXITY_LARGE;
  return 0;
}
