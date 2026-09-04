import type { ImportedFileRef } from '@archlens/core/forensics';

export type ForensicClassification = 'hotspot' | 'knowledge-silo';

export interface CoupledFileRef {
  path: string;
  score: number;
  sharedCommits: number;
}

/** Per-file metrics attached onto BlueprintSpec nodes during analysis. */
export interface FileMetrics {
  path: string;
  complexity: number;
  complexityPeak?: number;
  cognitiveComplexity?: number;
  functionCount?: number;
  loc: number;
  sloc: number;
  /** Primary churn (long window, typically 365d). */
  churn: number;
  lineChurn?: number;
  /** Short-window churn for trend comparison (typically 30d). */
  churn30?: number;
  /** Long-window churn (typically 365d); mirrors `churn` when dual windows are enabled. */
  churn365?: number;
  churnByWeek?: number[];
  hotspotScoreByWeek?: number[];
  authorCount: number;
  topAuthorPercent: number;
  authors: { email: string; commits: number }[];
  /** Temporally coupled peers (git co-change). */
  coupledFiles: CoupledFileRef[];
  /** Static import-graph peers (direct relative imports). */
  importedFiles?: ImportedFileRef[];
  hotspotScore: number;
  classifications: ForensicClassification[];
  sinceDays?: number;
  shortChurnDays?: number;
}
