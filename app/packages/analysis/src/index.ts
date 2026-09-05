/** Shared codebase analysis + BlueprintSpec writers (CLI and browser). */

export type { CodebaseParserPort, AnalysisFileSystemPort } from './domain/ports.ts';
export type { LoggerPort } from './domain/ports.ts';
export type { CodebaseAnalyzerDependencies, RunAnalysisOptions } from './domain/analyzer.ts';
export type { ParsedSourceFile, ParsedImport, ParsedNewExpression } from './domain/types.ts';
export {
  DEFAULT_ANALYSIS_OPTIONS,
  DEFAULT_SCAN_GLOB,
  DEFAULT_STRUCTURAL_IGNORE_GLOBS,
  STRUCTURAL_IAC_IGNORE_GLOBS,
  LAYOUT_IDENTITY_DENYLIST,
  type AnalysisOptions,
} from './domain/analysisOptions.ts';
export { CodebaseAnalyzer } from './domain/analyzer.ts';
export { IacAnalyzer } from './domain/iac/index.ts';
export { ModelExtractor } from './domain/modelExtractor.ts';
export { CancellationError, isCancellationError, throwIfAborted } from './domain/cancellation.ts';
export {
  createStructuralPathFilter,
  type SourcePathFilter,
  type StructuralPathFilterOptions,
} from './pathFilter/structuralPathFilter.ts';
export {
  attachForensicsToSchema,
  aggregateNodeForensics,
  fileMetricsToNodeForensics,
  normalizeFilePath,
} from './forensics/attachForensics.ts';
export type { FileMetrics, CoupledFileRef, ForensicClassification } from './forensics/types.ts';
export {
  applyExternalDependenciesPass,
  listBlueprintSchemaPaths,
} from './writers/externalDependenciesPass.ts';
export { BaseWriter } from './writers/baseWriter.ts';
export {
  ContextLevelWriter,
  APPLICATION_CONTEXT_RELATIVE_PATH,
  LEGACY_CONTEXT_RELATIVE_PATH,
  resolveContextSeedRelativePath,
  contextDisplayName,
} from './writers/contextLevelWriter.ts';
export { ContainerLevelWriter } from './writers/containerLevelWriter.ts';
export { ComponentLevelWriter } from './writers/componentLevelWriter.ts';
export { fileLeafEntityRef, shouldEmitRollupDrillDown } from './writers/rollupDrillDown.ts';
export { discoverSystems, partitionFilesBySystem } from './domain/systemDiscovery/index.ts';
export type { DiscoveredSystem } from './domain/systemDiscovery/index.ts';
export { isTestSourcePath, detectTestFramework } from './domain/testPath.ts';
export type { TestFramework } from './domain/testPath.ts';
export { extractParsedSourceFileFromTree } from './parsing/treeSitterAstExtract.ts';
export type { ExtractParsedSourceFileInput } from './parsing/treeSitterAstExtract.ts';
