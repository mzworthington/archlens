import {
  parseIacBatchToSchema,
  projectMeaningfulIacExternals,
  type IacParseResult,
  type IacSourceFile,
  type IacSourceKind,
} from '@archlens/core/import-iac';
import type { ConflictResolutions } from '@archlens/core';
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
