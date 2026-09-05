import type { ExternalSummaryBand } from '@archlens/core';
import { parseSchemaFromYaml, parseSchemaFromJson, assessSchemaVersion } from '@archlens/core';
import { applyStateUpdates } from './applyStateUpdates';
import {
  addExternalDependencies as addExternalDependenciesAction,
  expandExternalSummaryHub as expandExternalSummaryHubAction,
  listWorkspaceExternalCandidates as listWorkspaceExternalCandidatesAction,
  syncSuggestedExternals as syncSuggestedExternalsAction,
} from './externalDependencies';
import { importSchemaContent } from './import/importSchema';
import { createDiagramInitialState } from './initialState';
import { applyRefactorBoundaryAsDraft } from '../../../forensics/apply/applyRefactorBoundaryAsDraft';
import { resetToEmptyWorkspace as resetToEmptyWorkspaceAction } from './resetToEmptyWorkspace';
import { restoreEmptyWorkspaceDraft as restoreEmptyWorkspaceDraftAction } from './restoreEmptyWorkspaceDraft';
import { materializeCouplingGhostOnDiagram } from '../../../forensics/materializeCouplingGhost';
import { createHistoryActions } from './historyActions';
import { createCheckPendingChanges } from './pendingChanges';
import { createSelectSystem } from './selectSystem';
import { createInitSchema } from './initSchema';
import { createApplyClientLayout } from './applyClientLayout';
import { applyRemoteCollabSchema } from './applyRemoteCollabSchema';
import { createCanvasGraphActions } from './canvasGraphActions';
import { blankCanvasEntityRefFromName } from '../ioState/blankCanvasSession';
import type { BlueprintStoreSet } from '../../store';
import type { DiagramState, DiagramStateDeps } from './types';

export type { DiagramState } from './types';

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
    isMemoryScanWorkspace: false,
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

    restoreEmptyWorkspaceDraft: options => restoreEmptyWorkspaceDraftAction(set, get, options),

    updateSchemaName: name => {
      const { schema, isWorkspaceOpen } = get();
      const level = schema.level;
      if (level === 'container' || level === 'context') {
        set({ workspaceName: name });
      }
      if (!isWorkspaceOpen) {
        applyStateUpdates(
          set,
          get,
          get().nodes,
          get().edges,
          name,
          undefined,
          blankCanvasEntityRefFromName(name)
        );
        return;
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
      const { previewMermaidImport } = await import('./import/importMermaid');
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
      const { executeMermaidImport } = await import('./import/importMermaid');
      return executeMermaidImport(set, get, mermaid, resolutions);
    },

    previewIacImport: async (files, kind = 'auto') => {
      const { previewIacImport } = await import('./import/importIac');
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
      const { executeIacImport } = await import('./import/importIac');
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
