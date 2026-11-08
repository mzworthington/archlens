import type { SystemSchema } from '@archlens/core';
import {
  mapDomainDepsToRFEdges,
  mapDomainNodesToRFNodes,
  refreshGroupBoundsFromChildren,
  sortNodesForReactFlow,
} from '../../layoutUtils';
import { applyStateUpdates } from './applyStateUpdates';
import type { DiagramStateDeps } from './types';
import type { BlueprintStoreSet } from '../../store';

type SetFn = BlueprintStoreSet;
type GetFn = () => DiagramStateDeps;

/**
 * Show one diagram from a workspace room.
 * The path is selected before the schema is applied, so a peer on another file is not overwritten.
 */
export function applyRemoteCollabDiagram(
  set: SetFn,
  get: GetFn,
  path: string,
  schema: SystemSchema
): void {
  const loaded = get().loadedSystems ?? [];
  if (!loaded.some(system => system.path === path)) {
    set({
      loadedSystems: [...loaded, { path, name: schema.name || path, schema }],
    });
  }
  if (get().currentFilePath !== path) {
    set({
      currentFilePath: path,
      selectedNodeId: null,
      selectedEdgeId: null,
      focusedCyclePath: null,
    });
    if (get().isWorkspaceOpen && !get().isSampleWorkspace) {
      void get().loadPersistedComments(path);
    }
  }
  applyRemoteCollabSchema(set, get, schema);
}

/** Apply a schema that arrived from the collab session without echoing it back. */
export function applyRemoteCollabSchema(set: SetFn, get: GetFn, schema: SystemSchema): void {
  const rfNodes = sortNodesForReactFlow(
    refreshGroupBoundsFromChildren(mapDomainNodesToRFNodes(schema.nodes))
  );
  const rfEdges = mapDomainDepsToRFEdges(schema.dependencies);
  applyStateUpdates(
    set,
    get,
    rfNodes,
    rfEdges,
    schema.name,
    schema.level,
    schema.entityRef ?? null,
    schema.source,
    { pushCollab: false }
  );
}
