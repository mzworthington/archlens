import type {
  CoupledPair,
  FileHistoryTraits,
  GitCommit,
  ImportedFileRef,
} from '@archlens/core/forensics';
import type { CoupledFileRef, FileMetrics, ForensicClassification } from '@archlens/analysis';

export type { CoupledFileRef, FileMetrics, ForensicClassification };
export type ImportCouplingKind = ImportedFileRef['kind'];

export type { CoupledPair, FileHistoryTraits, GitCommit };

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
