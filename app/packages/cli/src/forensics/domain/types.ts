import type {
  CoupledPair,
  FileHistoryTraits,
  GitCommit,
  ImportedFileRef,
} from '@archlens/core/forensics';

export type ForensicClassification = 'hotspot' | 'knowledge-silo';

export type ImportCouplingKind = ImportedFileRef['kind'];

export type { CoupledPair, FileHistoryTraits, GitCommit };

export interface CoupledFileRef {
  path: string;
  score: number;
  sharedCommits: number;
}

export interface FileMetrics {
  path: string;
  complexity: number;
  loc: number;
  sloc: number;
  /** Primary churn (long window, typically 365d). */
  churn: number;
  /** Short-window churn for trend comparison (typically 30d). */
  churn30?: number;
  /** Long-window churn (typically 365d); mirrors `churn` when dual windows are enabled. */
  churn365?: number;
  churnByWeek?: number[];
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

export interface StructuralMetrics {
  path: string;
  complexity: number;
  loc: number;
  sloc: number;
}

export interface ForensicReport {
  generatedAt: string;
  rootPath: string;
  options: import('./options.ts').ForensicsOptions;
  files: FileMetrics[];
  coupledPairs: CoupledPair[];
}
