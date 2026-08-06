/** Public IaC import facade — parsers/IR stay internal to this package. */
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
  type IacExternalClassification,
  type IacResourceKind,
  type IacResourceRef,
  type IacSignificance,
  type MeaningfulIacExternalsProjection,
  type ProjectMeaningfulIacExternalsOptions,
} from './rules/iacExternalSignificance';
export {
  isPulumiProjectContent,
  isPulumiProjectFileName,
  isPulumiSourceFileForRuntime,
  readPulumiProjectRuntime,
  type PulumiRuntime,
} from './rules/pulumiStack';
