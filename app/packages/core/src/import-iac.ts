/** Public IaC import facade — parsers/IR stay internal to this package. */
export {
  defaultIacPathForKind,
  parseIacBatchToSchema,
  type IacParseResult,
  type IacSourceFile,
  type IacSourceKind,
} from './rules/iacImport';
export {
  isPulumiProjectFileName,
  isPulumiSourceFileForRuntime,
  readPulumiProjectRuntime,
  type PulumiRuntime,
} from './rules/pulumiStack';
