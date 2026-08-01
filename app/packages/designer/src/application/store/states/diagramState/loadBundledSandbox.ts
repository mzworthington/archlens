import { resolveWorkspaceEntityRefs, type SystemSchema } from '@archlens/core';
import { buildBundledPathCatalog, startBundledBlueprintPrefetch } from './bundledBlueprintLoader';
import {
  getBlueprintPathsForSandbox,
  buildSandboxInitialSystems,
  type SandboxContextPath,
} from '../../defaultData';
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
import { loadWorkspaceSession, saveWorkspaceSession } from '../../workspaceSession';
import {
  APPLICATION_CONTEXT_PATH,
  GOLDEN_PATHS_CONTAINERS_PATH,
  GOLDEN_PATHS_CONTEXT_PATH,
} from '../../defaultData';

export function resolveBundledSandboxSystems(
  contextPath: SandboxContextPath = GOLDEN_PATHS_CONTEXT_PATH
): HydrateSystem[] {
  return buildSandboxInitialSystems(contextPath);
}

export function pickSandboxEntryDiagram(
  systems: HydrateSystem[],
  preferredContextPath?: SandboxContextPath
): HydrateSystem | undefined {
  if (preferredContextPath) {
    const preferred = systems.find(system => system.path === preferredContextPath);
    if (preferred) return preferred;
  }

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
  contextPath: SandboxContextPath = GOLDEN_PATHS_CONTEXT_PATH,
  systems: HydrateSystem[] = resolveBundledSandboxSystems(contextPath)
): void {
  if (get().isWorkspaceOpen || systems.length === 0) return;

  const resolved = resolveWorkspaceEntityRefs(
    systems.map(sys => ({ path: sys.path, schema: sys.schema }))
  );
  const systemsWithResolved = systems.map(sys => ({
    ...sys,
    schema: resolved.schemas[sys.path] || sys.schema,
  }));
  const entry = pickSandboxEntryDiagram(systemsWithResolved, contextPath);
  if (!entry) return;

  const workspaceCatalog = buildBundledPathCatalog(getBlueprintPathsForSandbox(contextPath));

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
    activeSandboxContextPath: contextPath,
  });

  get().initSchema(entry.schema);
  saveWorkspaceSession({ mode: 'sandbox', sandboxContextPath: contextPath });
}

export async function reloadBundledSandbox(
  set: ActivateBundledSandboxSet,
  get: ActivateBundledSandboxGet,
  contextPath: SandboxContextPath = GOLDEN_PATHS_CONTEXT_PATH
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

    const systems = resolveBundledSandboxSystems(contextPath);
    activateBundledSandbox(set, get, contextPath, systems);
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

  const session = loadWorkspaceSession();
  const contextPath =
    (session?.sandboxContextPath as SandboxContextPath | undefined) ?? GOLDEN_PATHS_CONTEXT_PATH;

  beginDiagramLoad(get, set, SANDBOX_LOADING_MESSAGE);
  await yieldToUi();

  try {
    const systems = resolveBundledSandboxSystems(contextPath);
    activateBundledSandbox(set, get, contextPath, systems);
    startBundledBlueprintPrefetch({ get, set });
  } finally {
    endDiagramLoad(get, set);
  }
}
