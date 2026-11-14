import {
  buildChildZoomDiagram,
  buildWorkspaceCatalog,
  resolveChildDiagramEntry,
  serializeSchemaToYaml,
} from '@archlens/core';
import type { SystemSchema } from '@archlens/core';
import { markFolderWorkspacePreferred } from '../../workspaceOpenSession';
import type { DiagramStateDeps } from './types';
import type { BlueprintStoreSet } from '../../store';

type SetFn = BlueprintStoreSet;
type GetFn = () => DiagramStateDeps;
type LoadedSystem = { path: string; name: string; schema: SystemSchema };

function systemsWithActiveDiagram(state: DiagramStateDeps): LoadedSystem[] {
  const parentPath = state.currentFilePath || 'blueprint.yaml';
  const active: LoadedSystem = {
    path: parentPath,
    name: state.schema.name,
    schema: state.schema,
  };
  return [active, ...state.loadedSystems.filter(system => system.path !== parentPath)];
}

/** Add an empty child diagram for a node and open it. Returns false when the node cannot zoom. */
export function createCreateChildZoom(set: SetFn, get: GetFn) {
  return async (nodeEntityRef: string): Promise<boolean> => {
    const ref = nodeEntityRef.trim();
    if (!ref) return false;

    const state = get();
    if (resolveChildDiagramEntry(state.workspaceCatalog, ref)) return true;

    const node = state.schema.nodes.find(candidate => candidate.entityRef === ref);
    if (!node || node.external) return false;

    const systems = systemsWithActiveDiagram(state);
    const parentPath = systems[0]?.path ?? 'blueprint.yaml';
    const built = buildChildZoomDiagram({
      nodeEntityRef: ref,
      nodeName: node.name,
      parentLevel: state.schema.level,
      version: state.schema.version,
      parentPath,
      existingPaths: systems.map(system => system.path),
    });
    if (!built) return false;

    const nextSystems: LoadedSystem[] = [
      ...systems,
      { path: built.path, name: built.schema.name, schema: built.schema },
    ];
    set({
      loadedSystems: nextSystems,
      workspaceCatalog: buildWorkspaceCatalog(
        nextSystems.map(system => ({ path: system.path, schema: system.schema })),
        state.workspaceName
      ),
      currentFilePath: built.path,
      selectedNodeId: null,
      selectedEdgeId: null,
      focusedCyclePath: null,
    });
    get().clearHistory();
    get().initSchema(built.schema);

    const opened = get();
    // Blank Ideate sessions keep isWorkspaceOpen false; create-zoom changes the URL
    // off empty-workspace, so re-assert the no-demo preference for this page session.
    if (!opened.isWorkspaceOpen && !opened.isSampleWorkspace) {
      markFolderWorkspacePreferred();
    }
    if (opened.isWorkspaceOpen && !opened.isSampleWorkspace && !opened.isMemoryScanWorkspace) {
      const yaml = opened.yamlCode || serializeSchemaToYaml(opened.schema);
      const written = await opened.workspacePort.writeFile(built.path, yaml);
      if (written) {
        await opened.workingCopyPort.saveBaselineSchema({
          filePath: built.path,
          schema: get().schema,
          systemId: built.schema.entityRef ?? ref,
          nodeRefMap: get().nodeRefMap[built.path] ?? {},
        });
      }
    }

    if (get().collabSessionPort.isActive()) {
      get().collabSessionPort.focusDiagram(built.path, get().schema);
    }

    return true;
  };
}
