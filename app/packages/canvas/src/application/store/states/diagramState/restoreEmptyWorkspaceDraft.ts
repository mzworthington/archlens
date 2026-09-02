import type { SystemSchema } from '@archlens/core';
import type { WorkingCopyPort } from '../../../../core';
import type { BlueprintStoreSet } from '../../store';
import {
  claimEmptyWorkspaceDraftRestore,
  shouldRestoreEmptyWorkspaceDraft,
} from './emptyWorkspaceDraft';
import {
  EMPTY_WORKSPACE_ENTITY_REF,
  EMPTY_WORKSPACE_PATH,
  EMPTY_WORKSPACE_SCHEMA,
} from './resetToEmptyWorkspace';
import { readBlankCanvasSession } from '../ioState/blankCanvasSession';

export async function restoreEmptyWorkspaceDraft(
  set: BlueprintStoreSet,
  get: () => {
    initSchema: (schema: SystemSchema) => void;
    clearHistory: () => void;
    isWorkspaceOpen: boolean;
    nodes: unknown[];
    workingCopyPort: WorkingCopyPort;
  },
  options: { hasCollabRoom?: boolean; expectedEntityRef?: string } = {}
): Promise<boolean> {
  if (options.hasCollabRoom) return false;
  if (get().isWorkspaceOpen) return false;
  if (!claimEmptyWorkspaceDraftRestore()) return false;

  const session = readBlankCanvasSession();
  const expected = options.expectedEntityRef;
  if (
    expected &&
    expected !== EMPTY_WORKSPACE_ENTITY_REF &&
    session &&
    session.entityRef !== expected
  ) {
    return false;
  }

  const filePath = session?.filePath || EMPTY_WORKSPACE_PATH;
  const systemName = session?.name || EMPTY_WORKSPACE_SCHEMA.name;
  const systemEntityRef = session?.entityRef || expected || EMPTY_WORKSPACE_ENTITY_REF;

  const { workingCopyPort } = get();
  let draft: SystemSchema | null = null;
  try {
    draft = await workingCopyPort.loadWorkingSchema({
      filePath,
      systemName,
      systemVersion: EMPTY_WORKSPACE_SCHEMA.version,
      systemLevel: EMPTY_WORKSPACE_SCHEMA.level,
      systemEntityRef,
    });
  } catch {
    return false;
  }

  if (
    !draft ||
    !shouldRestoreEmptyWorkspaceDraft({
      isWorkspaceOpen: get().isWorkspaceOpen,
      hasCollabRoom: false,
      inMemoryNodeCount: get().nodes.length,
      draftNodeCount: draft.nodes.length,
    })
  ) {
    return false;
  }

  const schema: SystemSchema = {
    ...draft,
    name: systemName,
    entityRef: systemEntityRef,
  };

  get().clearHistory();
  set({
    currentFilePath: filePath,
    workspaceCatalog: [],
    loadedSystems: [{ path: filePath, name: schema.name, schema }],
    isWorkspaceOpen: false,
    isSampleWorkspace: false,
    isBrowserLiteWorkspace: false,
    workspaceName: '',
    selectedNodeId: null,
    selectedEdgeId: null,
    focusedCyclePath: null,
    rightPanelTab: 'catalog',
  });
  get().initSchema(schema);
  return true;
}
