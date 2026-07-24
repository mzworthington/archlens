import { parseMermaidToSchema, type MermaidParseResult } from '@blueprint/core/import-mermaid';
import type { ConflictResolutions } from '@blueprint/core';
import {
  buildDiagramImportContext,
  executeDiagramImport,
  parentEntityRefForImport,
  previewDiagramImport,
  resolveScopedSchema,
  type DiagramImportContext,
  type DiagramImportPreview,
} from './diagramImportShared';

export type MermaidImportContext = DiagramImportContext;
export type MermaidImportPreview = DiagramImportPreview<MermaidParseResult>;

export function previewMermaidImport(
  mermaid: string,
  context: DiagramImportContext
): MermaidImportPreview {
  const parseResult = parseMermaidToSchema(mermaid, {
    targetLevel: context.baseSchema.level,
    parentEntityRef: parentEntityRefForImport(context),
  });

  return previewDiagramImport(context, parseResult);
}

export function executeMermaidImport(
  set: (partial: Record<string, unknown>) => void,
  get: () => {
    schema: import('@blueprint/core').SystemSchema;
    nodes: import('../../layoutUtils').BlueprintRFNode[];
    currentFilePath: string;
    loadedSystems: Array<{
      path: string;
      name: string;
      schema: import('@blueprint/core').SystemSchema;
    }>;
    workspaceName: string;
    isWorkspaceOpen: boolean;
    recordHistory: () => void;
    checkPendingChanges: () => Promise<void>;
    logger: { error: (message: string, err: unknown) => void };
  },
  mermaid: string,
  resolutions: ConflictResolutions
): boolean {
  const context = buildDiagramImportContext(get);
  const { scopedImported } = previewMermaidImport(mermaid, context);
  return executeDiagramImport(
    set,
    get,
    context,
    scopedImported,
    resolutions,
    'Failed to import Mermaid diagram'
  );
}

export { resolveScopedSchema };
