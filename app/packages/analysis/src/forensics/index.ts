export {
  attachForensicsToSchema,
  aggregateNodeForensics,
  fileMetricsToNodeForensics,
  normalizeFilePath,
} from './attachForensics';
export type { FileMetrics, CoupledFileRef, ForensicClassification } from './types';
export type { ForensicReport, StructuralMetrics } from './report';
export { ForensicAnalyzer, type RunForensicsInput } from './analyzer';
export { DEFAULT_FORENSICS_OPTIONS, mergeForensicsOptions, type ForensicsOptions } from './options';
export {
  DEFAULT_FORENSICS_GLOB,
  LARGE_REPO_FILE_THRESHOLD,
  DEFAULT_MIN_CHURN_FOR_COMPLEXITY_LARGE,
  resolveEffectiveMinChurnForComplexity,
} from './forensicsGlob';
export type {
  ComplexityAnalyzerPort,
  ForensicAnalyzerPorts,
  GitHistoryPort,
  ImportGraphPort,
  ReporterPort,
  SourceFileListerPort,
} from './ports';
export {
  ContentComplexityAdapter,
  ContentFileLister,
  ContentImportGraphAdapter,
  StaticGitHistoryAdapter,
  estimateControlFlowComplexity,
} from './contentAdapters';
export { collectFileMetricsFromPorts } from './collectFileMetrics';
