import { resolveWorkspaceEntityRefs, type SystemSchema } from '@archlens/core';
import { buildBundledPathCatalog, startBundledBlueprintPrefetch } from './bundledBlueprintLoader';
import {
  getBlueprintPathsForSandbox,
  getDefaultLoadedSystems,
  setActiveSandboxKind,
  type SandboxKind,
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
import { saveWorkspaceSession } from '../../workspaceSession';

export function resolveBundledSandboxSystems(kind: SandboxKind = 'application'): HydrateSystem[] {
  return getDefaultLoadedSystems(kind);
}

export function pickSandboxEntryDiagram(systems: HydrateSystem[]): HydrateSystem | undefined {
  return (
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

/**
 * Load the bundled demo blueprints into the store (sandbox mode).
 * Replaces any prior empty/import canvas state with the full bundled tree.
 */
export function activateBundledSandbox(
  set: ActivateBundledSandboxSet,
  get: ActivateBundledSandboxGet,
  systems: HydrateSystem[] = resolveBundledSandboxSystems(),
  kind: SandboxKind = 'application'
): void {
  if (get().isWorkspaceOpen || systems.length === 0) return;

  setActiveSandboxKind(kind);

  const resolved = resolveWorkspaceEntityRefs(
    systems.map(sys => ({ path: sys.path, schema: sys.schema }))
  );
  const systemsWithResolved = systems.map(sys => ({
    ...sys,
    schema: resolved.schemas[sys.path] || sys.schema,
  }));
  const entry = pickSandboxEntryDiagram(systemsWithResolved);
  if (!entry) return;

  const workspaceCatalog = buildBundledPathCatalog(getBlueprintPathsForSandbox(kind));

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
    sandboxKind: kind,
  });

  get().initSchema(entry.schema);
  saveWorkspaceSession({ mode: 'sandbox', sandboxKind: kind });
}

/**
 * Clear IndexedDB, in-memory session caches, and undo history, then load bundled demo YAML.
 */
export async function reloadBundledSandbox(
  set: ActivateBundledSandboxSet,
  get: ActivateBundledSandboxGet,
  kind: SandboxKind = 'application'
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

    const systems = resolveBundledSandboxSystems(kind);
    activateBundledSandbox(set, get, systems, kind);
    startBundledBlueprintPrefetch({ get, set });
  } finally {
    endDiagramLoad(get, set);
    if (get().systemSelectInFlight === SANDBOX_RELOAD_IN_FLIGHT) {
      set({ systemSelectInFlight: null });
    }
  }
}

/**
 * Resume the bundled sandbox after a full page reload without clearing IndexedDB drafts.
 * Loads the entry diagram immediately; remaining blueprints prefetch in the background.
 */
export async function resumeBundledSandbox(
  set: ActivateBundledSandboxSet,
  get: ActivateBundledSandboxGet,
  kind: SandboxKind = 'application'
): Promise<void> {
  if (get().isWorkspaceOpen || get().loadedSystems.length > 0) return;

  beginDiagramLoad(get, set, SANDBOX_LOADING_MESSAGE);
  await yieldToUi();

  try {
    const systems = resolveBundledSandboxSystems(kind);
    activateBundledSandbox(set, get, systems, kind);
    startBundledBlueprintPrefetch({ get, set });
  } finally {
    endDiagramLoad(get, set);
  }
}
