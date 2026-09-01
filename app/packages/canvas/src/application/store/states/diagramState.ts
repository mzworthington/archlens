import type { ExternalSummaryBand } from '@archlens/core';
import { parseSchemaFromYaml, parseSchemaFromJson, assessSchemaVersion } from '@archlens/core';
import { applyStateUpdates } from './diagramState/applyStateUpdates';
import {
  addExternalDependencies as addExternalDependenciesAction,
  expandExternalSummaryHub as expandExternalSummaryHubAction,
  listWorkspaceExternalCandidates as listWorkspaceExternalCandidatesAction,
  syncSuggestedExternals as syncSuggestedExternalsAction,
} from './diagramState/externalDependencies';
import { importSchemaContent } from './diagramState/importSchema';
import { createDiagramInitialState } from './diagramState/initialState';
import { applyRefactorBoundaryAsDraft } from '../../forensics/applyRefactorBoundaryAsDraft';
import { resetToEmptyWorkspace as resetToEmptyWorkspaceAction } from './diagramState/resetToEmptyWorkspace';
import { materializeCouplingGhostOnDiagram } from '../../forensics/materializeCouplingGhost';
import { createHistoryActions } from './diagramState/historyActions';
import { createCheckPendingChanges } from './diagramState/pendingChanges';
import { createSelectSystem } from './diagramState/selectSystem';
import { createInitSchema } from './diagramState/initSchema';
import { createApplyClientLayout } from './diagramState/applyClientLayout';
import { applyRemoteCollabSchema } from './diagramState/applyRemoteCollabSchema';
import { createCanvasGraphActions } from './diagramState/canvasGraphActions';
import type { BlueprintStoreSet } from '../store';
import type { DiagramState, DiagramStateDeps } from './diagramState/types';

export type { DiagramState, SelectionOptions } from './diagramState/types';

const initial = createDiagramInitialState();

export const createDiagramState = (
  set: BlueprintStoreSet,
  get: () => DiagramStateDeps
): DiagramState => {
  const historyActions = createHistoryActions(set, get);
  const canvasGraphActions = createCanvasGraphActions(set, get);

  return {
    schema: initial.schema,
    nodes: initial.nodes,
    edges: initial.edges,
    selectedNodeId: null,
    selectedEdgeId: null,
    validationResult: initial.validationResult,
    yamlCode: initial.yamlCode,
    lastError: null,
    schemaVersionWarning: assessSchemaVersion(initial.schema.version),
    currentFilePath: initial.currentFilePath,
    isWorkspaceOpen: false,
    isSampleWorkspace: false,
    isBrowserLiteWorkspace: false,
    workspaceName: '',
    workspaceCatalog: [],
    loadedSystems: initial.loadedSystems,
    nodeRefMap: initial.nodeRefMap,
    past: [],
    future: [],
    hasPendingChanges: false,
    layoutCustomized: false,
    layoutSessionId: 0,
    systemSelectInFlight: null,

    ...historyActions,
    checkPendingChanges: createCheckPendingChanges(set, get),
    initSchema: createInitSchema(set, get),
    selectSystem: createSelectSystem(set, get),
    applyClientLayout: createApplyClientLayout(set, get),
    ...canvasGraphActions,

    applyRefactorBoundaryAsDraft: boundary => applyRefactorBoundaryAsDraft(boundary, get, set),
    applyRemoteCollabSchema: schema => applyRemoteCollabSchema(set, get, schema),

    markLayoutCustomized: () => {
      if (!get().layoutCustomized) {
        set({ layoutCustomized: true });
      }
    },

    resetToEmptyWorkspace: () => {
      resetToEmptyWorkspaceAction(set, get);
    },

    updateSchemaName: name => {
      const level = get().schema.level;
      if (level === 'container' || level === 'context') {
        set({ workspaceName: name });
      }
      applyStateUpdates(set, get, get().nodes, get().edges, name);
    },

    updateSchemaLevel: level => {
      applyStateUpdates(set, get, get().nodes, get().edges, undefined, level);
    },

    importYaml: yamlContent => {
      try {
        const schema = parseSchemaFromYaml(yamlContent);
        return importSchemaContent(set, get, schema, 'YAML');
      } catch (e: unknown) {
        const errorMsg =
          (e instanceof Error ? e.message : undefined) ||
          'Failed to import YAML schema configuration';
        set({ lastError: errorMsg });
        get().logger.error('Failed to import YAML schema configuration', e);
        return false;
      }
    },

    importJson: jsonContent => {
      try {
        const schema = parseSchemaFromJson(jsonContent);
        return importSchemaContent(set, get, schema, 'JSON');
      } catch (e: unknown) {
        const errorMsg =
          (e instanceof Error ? e.message : undefined) ||
          'Failed to import JSON schema configuration';
        set({ lastError: errorMsg });
        get().logger.error('Failed to import JSON schema configuration', e);
        return false;
      }
    },

    previewMermaidImport: async mermaid => {
      const { previewMermaidImport } = await import('./diagramState/importMermaid');
      const { schema, loadedSystems, currentFilePath, workspaceName, isWorkspaceOpen } = get();
      return previewMermaidImport(mermaid, {
        baseSchema: schema,
        loadedSystems,
        currentFilePath,
        workspaceName,
        isWorkspaceOpen,
      });
    },

    importMermaid: async (mermaid, resolutions) => {
      const { executeMermaidImport } = await import('./diagramState/importMermaid');
      return executeMermaidImport(set, get, mermaid, resolutions);
    },

    previewIacImport: async (files, kind = 'auto') => {
      const { previewIacImport } = await import('./diagramState/importIac');
      const { schema, loadedSystems, currentFilePath, workspaceName, isWorkspaceOpen } = get();
      return previewIacImport(
        files,
        {
          baseSchema: schema,
          loadedSystems,
          currentFilePath,
          workspaceName,
          isWorkspaceOpen,
        },
        kind
      );
    },

    importIac: async (files, resolutions, kind = 'auto') => {
      const { executeIacImport } = await import('./diagramState/importIac');
      return executeIacImport(set, get, files, resolutions, kind);
    },

    clearError: () => {
      set({ lastError: null });
    },

    listWorkspaceExternalCandidates: (filters?) => {
      return listWorkspaceExternalCandidatesAction(get, filters);
    },

    addExternalDependencies: (entityRefs, dependencies) => {
      get().recordHistory();
      addExternalDependenciesAction(set, get, entityRefs, dependencies);
    },

    materializeCouplingGhost: ghost => {
      get().recordHistory();
      materializeCouplingGhostOnDiagram(ghost, set, () => {
        const state = get();
        return {
          nodes: state.nodes,
          edges: state.edges,
          addExternalDependencies: state.addExternalDependencies,
          markLayoutCustomized: state.markLayoutCustomized,
          logger: state.logger,
        };
      });
    },

    syncSuggestedExternals: () => {
      get().recordHistory();
      syncSuggestedExternalsAction(set, get);
    },

    expandExternalSummaryHub: (band: ExternalSummaryBand) => {
      get().recordHistory();
      expandExternalSummaryHubAction(set, get, band);
    },
  };
};
