/** Shared codebase analysis + BlueprintSpec writers (CLI and browser). */

export type { CodebaseParserPort, AnalysisFileSystemPort } from './domain/ports';
export type { LoggerPort } from './domain/ports';
export type { CodebaseAnalyzerDependencies, RunAnalysisOptions } from './domain/analyzer';
export type { ParsedSourceFile, ParsedImport, ParsedNewExpression } from './domain/types';
export {
  DEFAULT_ANALYSIS_OPTIONS,
  DEFAULT_SCAN_GLOB,
  DEFAULT_STRUCTURAL_IGNORE_GLOBS,
  STRUCTURAL_IAC_IGNORE_GLOBS,
  LAYOUT_IDENTITY_DENYLIST,
  type AnalysisOptions,
} from './domain/analysisOptions';
export { CodebaseAnalyzer } from './domain/analyzer';
export { IacAnalyzer } from './domain/iac/index';
export { ModelExtractor } from './domain/modelExtractor';
export { CancellationError, isCancellationError, throwIfAborted } from './domain/cancellation';
export {
  createStructuralPathFilter,
  type SourcePathFilter,
  type StructuralPathFilterOptions,
} from './pathFilter/structuralPathFilter';
export {
  attachForensicsToSchema,
  aggregateNodeForensics,
  fileMetricsToNodeForensics,
  normalizeFilePath,
} from './forensics/attachForensics';
export type { FileMetrics, CoupledFileRef, ForensicClassification } from './forensics/types';
export {
  applyExternalDependenciesPass,
  listBlueprintSchemaPaths,
} from './writers/externalDependenciesPass';
export { BaseWriter } from './writers/baseWriter';
export {
  ContextLevelWriter,
  APPLICATION_CONTEXT_RELATIVE_PATH,
  LEGACY_CONTEXT_RELATIVE_PATH,
  resolveContextSeedRelativePath,
  contextDisplayName,
} from './writers/contextLevelWriter';
export { ContainerLevelWriter } from './writers/containerLevelWriter';
export { ComponentLevelWriter } from './writers/componentLevelWriter';
export { fileLeafEntityRef, shouldEmitRollupDrillDown } from './writers/rollupDrillDown';
export { discoverSystems, partitionFilesBySystem } from './domain/systemDiscovery/index';
export type { DiscoveredSystem } from './domain/systemDiscovery/index';
export { isTestSourcePath, detectTestFramework } from './domain/testPath';
export type { TestFramework } from './domain/testPath';
export { extractParsedSourceFileFromTree } from './parsing/treeSitterAstExtract';
export type { ExtractParsedSourceFileInput } from './parsing/treeSitterAstExtract';
