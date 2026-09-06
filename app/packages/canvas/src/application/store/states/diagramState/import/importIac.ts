import {
  parseIacBatchToSchema,
  projectMeaningfulIacExternals,
  type IacParseResult,
  type IacSourceFile,
  type IacSourceKind,
} from '@archlens/core/import-iac';
import type { ConflictResolutions, SystemNode, SystemSchema } from '@archlens/core';
import {
  buildDiagramImportContext,
  executeDiagramImport,
  parentEntityRefForImport,
  previewDiagramImport,
  type DiagramImportContext,
  type DiagramImportPreview,
} from './diagramImportShared';
import type { BlueprintStoreSet } from '../../../store';

export type IacImportPreview = DiagramImportPreview<IacParseResult>;

export const IAC_IMPORT_FILTER_NOTE =
  'Same filter as a CLI scan: primary products become third-party externals. Lookups and helpers stay as IaC declarations.';

export const IAC_IMPORT_MERGE_FOOTER =
  'Meaningful externals match a CLI scan of this pack. Real name collisions stay listed. Changes stay in your draft until you commit via Pending Changes.';

function landscapeEntityRefForImport(infraSystemEntityRef: string): string {
  const slash = infraSystemEntityRef.indexOf('/');
  return slash === -1 ? infraSystemEntityRef : infraSystemEntityRef.slice(0, slash);
}

function projectParsedIac(
  parseResult: IacParseResult,
  infraSystemEntityRef: string
): IacParseResult {
  const landscapeEntityRef = landscapeEntityRefForImport(infraSystemEntityRef);
  const projection = projectMeaningfulIacExternals(parseResult.schema, {
    landscapeEntityRef,
    infraSystemEntityRef,
    servedSystemRefs: [landscapeEntityRef],
  });
  return { ...parseResult, schema: projection.containerSchema };
}

export function describeIacImportPreview(schema: SystemSchema): string {
  const declarations = schema.nodes.filter(n => n.properties?.['iac.view'] === 'declaration');
  const externals = schema.nodes.filter(n => n.properties?.['iac.view'] === 'resource');
  const products = externals
    .map(n => n.properties?.['iac.product'])
    .filter((product): product is string => typeof product === 'string')
    .sort();
  const productLabel = products.length > 0 ? ` (${products.join(', ')})` : '';
  const externalNoun = externals.length === 1 ? 'meaningful external' : 'meaningful externals';
  const declarationNoun = declarations.length === 1 ? 'IaC declaration' : 'IaC declarations';
  return `${externals.length} ${externalNoun}${productLabel}, ${declarations.length} ${declarationNoun}`;
}

export function describeIacImportNodeQualifier(node: SystemNode): string {
  if (node.properties?.['iac.view'] === 'resource') return ', meaningful external';
  if (node.properties?.['iac.view'] === 'declaration') {
    const significance = node.properties['iac.significance'];
    return typeof significance === 'string' ? `, ${significance}` : ', declaration';
  }
  return node.external ? ', external' : '';
}

export function previewIacImport(
  files: IacSourceFile[],
  context: DiagramImportContext,
  kind: IacSourceKind = 'auto'
): IacImportPreview {
  const infraSystemEntityRef = parentEntityRefForImport(context);
  const parseResult = parseIacBatchToSchema(files, {
    targetLevel: context.baseSchema.level,
    parentEntityRef: infraSystemEntityRef,
    kind,
  });

  return previewDiagramImport(context, projectParsedIac(parseResult, infraSystemEntityRef));
}

export function executeIacImport(
  set: BlueprintStoreSet,
  get: () => {
    schema: import('@archlens/core').SystemSchema;
    nodes: import('../../../layoutUtils').BlueprintRFNode[];
    currentFilePath: string;
    loadedSystems: Array<{
      path: string;
      name: string;
      schema: import('@archlens/core').SystemSchema;
    }>;
    workspaceName: string;
    isWorkspaceOpen: boolean;
    recordHistory: () => void;
    checkPendingChanges: () => Promise<void>;
    logger: { error: (message: string, err: unknown) => void };
  },
  files: IacSourceFile[],
  resolutions: ConflictResolutions,
  kind: IacSourceKind = 'auto'
): boolean {
  const context = buildDiagramImportContext(get);
  const { scopedImported } = previewIacImport(files, context, kind);
  return executeDiagramImport(
    set,
    get,
    context,
    scopedImported,
    resolutions,
    'Failed to import infrastructure diagram'
  );
}
