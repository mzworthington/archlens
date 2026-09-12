import type { CoupledPair } from '@archlens/core/forensics';
import type { FileMetrics } from './types';
import type { ForensicsOptions } from './options';

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
  options: ForensicsOptions;
  files: FileMetrics[];
  coupledPairs: CoupledPair[];
}
