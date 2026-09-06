/** Public IaC import facade - parsers/IR stay internal to this package. */
export {
  defaultIacPathForKind,
  parseIacBatchToSchema,
  type IacParseResult,
  type IacSourceFile,
  type IacSourceKind,
} from './rules/iacImport';
export {
  classifyIacResource,
  infrastructureServesOf,
  projectMeaningfulIacExternals,
  schemaForIacDiagramImport,
  type IacExternalClassification,
  type IacResourceKind,
  type IacResourceRef,
  type IacSignificance,
  type MeaningfulIacExternalsProjection,
  type ProjectMeaningfulIacExternalsOptions,
} from './rules/iacImport/iacExternalSignificance';
export {
  isPulumiProjectContent,
  isPulumiProjectFileName,
  isPulumiSourceFileForRuntime,
  readPulumiProjectRuntime,
  type PulumiRuntime,
} from './rules/pulumi';
