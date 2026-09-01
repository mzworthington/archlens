import type { CoupledPair, GitCommit } from '@archlens/core/forensics';
import type { CoupledFileRef, FileMetrics } from '@archlens/analysis/forensics';

export type { CoupledFileRef, FileMetrics };
export type { CoupledPair, GitCommit };

export interface StructuralMetrics {
  path: string;
  complexity: number;
  loc: number;
  sloc: number;
  complexityPeak?: number;
  cognitiveComplexity?: number;
  functionCount?: number;
}

export interface ForensicReport {
  generatedAt: string;
  rootPath: string;
  options: import('./options.ts').ForensicsOptions;
  files: FileMetrics[];
  coupledPairs: CoupledPair[];
}
