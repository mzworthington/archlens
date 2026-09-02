import { systemSchemaPublicUrl, type SystemSchema } from '@archlens/core';
import type { BlueprintStoreSet } from '../../store';

export const EMPTY_WORKSPACE_SCHEMA: SystemSchema = {
  name: 'Empty Workspace',
  version: systemSchemaPublicUrl(),
  level: 'container',
  nodes: [],
  dependencies: [],
};

export const EMPTY_WORKSPACE_PATH = 'blueprint.yaml';

/** URL entity for the intentional blank starter (`/workspace/empty-workspace`). */
export const EMPTY_WORKSPACE_ENTITY_REF = 'empty-workspace';

/**
 * Replace the active diagram with a blank canvas (no workspace systems).
 * Used when starting from Mermaid import so merge is not against bundled demos.
 */
export function resetToEmptyWorkspace(
  set: BlueprintStoreSet,
  get: () => {
    initSchema: (schema: SystemSchema) => void;
    clearHistory: () => void;
  }
): void {
  get().clearHistory();

  const empty = { ...EMPTY_WORKSPACE_SCHEMA, nodes: [], dependencies: [] };

  set({
    currentFilePath: EMPTY_WORKSPACE_PATH,
    workspaceCatalog: [],
    loadedSystems: [{ path: EMPTY_WORKSPACE_PATH, name: empty.name, schema: empty }],
    isWorkspaceOpen: false,
    isSampleWorkspace: false,
    isBrowserLiteWorkspace: false,
    workspaceName: '',
    selectedNodeId: null,
    selectedEdgeId: null,
    focusedCyclePath: null,
    rightPanelTab: 'catalog',
  });

  get().initSchema(empty);
}
