import { resolveWorkspaceEntityRefs, type SystemSchema } from '@archlens/core';
import { buildBundledPathCatalog, startBundledBlueprintPrefetch } from './bundledBlueprintLoader';
import { getBlueprintPaths, getDefaultLoadedSystems } from '../../defaultData';
import { clearSandboxCaches } from '../../clearSandboxCaches';
import { resetDefaultIdbSeedFlag } from './defaultIdbSeed';
import {
  beginDiagramLoad,
  endDiagramLoad,
  SANDBOX_LOADING_MESSAGE,
  SANDBOX_RELOAD_IN_FLIGHT,
} from '../../diagramLoadSession';
import { yieldToUi } from '../../yieldToUi';
import type { HydrateSystem } from './hydrateSandboxDrafts';
import { saveWorkspaceSession } from '../../workspaceSession';
import {
  APPLICATION_CONTEXT_PATH,
  GOLDEN_PATHS_CONTAINERS_PATH,
  GOLDEN_PATHS_CONTEXT_PATH,
} from '../../defaultData';

export function resolveBundledSandboxSystems(): HydrateSystem[] {
  return getDefaultLoadedSystems();
}

export function pickSandboxEntryDiagram(systems: HydrateSystem[]): HydrateSystem | undefined {
  return (
    systems.find(s => s.path === GOLDEN_PATHS_CONTEXT_PATH) ||
    systems.find(s => s.path === GOLDEN_PATHS_CONTAINERS_PATH) ||
    systems.find(s => s.path === APPLICATION_CONTEXT_PATH) ||
    systems.find(s => s.schema.level === 'context') ||
    systems.find(s => s.schema.level === 'container') ||
    systems[0]
  );
}

type ActivateBundledSandboxGet = () => {
  isWorkspaceOpen: boolean;
  initSchema: (schema: SystemSchema) => void;
  clearHistory: () => void;
  diagramLoadCount: number;
  isLoading: boolean | string;
  systemSelectInFlight: string | null;
  loadedSystems: HydrateSystem[];
  workspaceName: string;
  workingCopyPort?: {
    pathHasStoredData: (filePath: string) => Promise<boolean>;
    saveBaselineSchema: (args: {
      filePath: string;
      schema: SystemSchema;
      systemId: string;
      nodeRefMap: Record<string, string>;
    }) => Promise<void>;
    saveWorkingSchema: (args: {
      filePath: string;
      schema: SystemSchema;
      systemId: string;
      nodeRefMap: Record<string, string>;
    }) => Promise<void>;
  };
};

type ActivateBundledSandboxSet = (partial: Record<string, unknown>) => void;

export function activateBundledSandbox(
  set: ActivateBundledSandboxSet,
  get: ActivateBundledSandboxGet,
  systems: HydrateSystem[] = resolveBundledSandboxSystems()
): void {
  if (get().isWorkspaceOpen || systems.length === 0) return;

  const resolved = resolveWorkspaceEntityRefs(
    systems.map(sys => ({ path: sys.path, schema: sys.schema }))
  );
  const systemsWithResolved = systems.map(sys => ({
    ...sys,
    schema: resolved.schemas[sys.path] || sys.schema,
  }));
  const entry = pickSandboxEntryDiagram(systemsWithResolved);
  if (!entry) return;

  const workspaceCatalog = buildBundledPathCatalog(getBlueprintPaths());

  set({
    isWorkspaceOpen: false,
    workspaceName: '',
    workspaceCatalog,
    loadedSystems: systemsWithResolved,
    nodeRefMap: resolved.nodeRefMap,
    currentFilePath: entry.path,
    selectedNodeId: null,
    selectedEdgeId: null,
    focusedCyclePath: null,
    layoutCustomized: false,
    hasPendingChanges: false,
    sandboxKind: undefined,
  });

  get().initSchema(entry.schema);
  saveWorkspaceSession({ mode: 'sandbox' });
}

export async function reloadBundledSandbox(
  set: ActivateBundledSandboxSet,
  get: ActivateBundledSandboxGet
): Promise<void> {
  resetDefaultIdbSeedFlag();

  set({ systemSelectInFlight: SANDBOX_RELOAD_IN_FLIGHT });
  beginDiagramLoad(get, set, SANDBOX_LOADING_MESSAGE);
  await yieldToUi();

  try {
    await clearSandboxCaches();
    get().clearHistory();
    await yieldToUi();

    set({
      isWorkspaceOpen: false,
      workspaceName: '',
      hasPendingChanges: false,
      layoutCustomized: false,
      guidedRefactorEntityRefs: null,
      childExternalsParentRef: null,
      selectedNodeId: null,
      selectedEdgeId: null,
      focusedCyclePath: null,
    });

    const systems = resolveBundledSandboxSystems();
    activateBundledSandbox(set, get, systems);
    startBundledBlueprintPrefetch({ get, set });
  } finally {
    endDiagramLoad(get, set);
    if (get().systemSelectInFlight === SANDBOX_RELOAD_IN_FLIGHT) {
      set({ systemSelectInFlight: null });
    }
  }
}

export async function resumeBundledSandbox(
  set: ActivateBundledSandboxSet,
  get: ActivateBundledSandboxGet
): Promise<void> {
  if (get().isWorkspaceOpen || get().loadedSystems.length > 0) return;

  beginDiagramLoad(get, set, SANDBOX_LOADING_MESSAGE);
  await yieldToUi();

  try {
    const systems = resolveBundledSandboxSystems();
    activateBundledSandbox(set, get, systems);
    startBundledBlueprintPrefetch({ get, set });
  } finally {
    endDiagramLoad(get, set);
  }
}
