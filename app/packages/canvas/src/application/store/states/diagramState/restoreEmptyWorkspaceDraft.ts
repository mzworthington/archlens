import { buildChildZoomDiagram, buildWorkspaceCatalog, type SystemSchema } from '@archlens/core';
import type { WorkingCopyPort } from '../../../../core';
import type { BlueprintStoreSet } from '../../store';
import { markFolderWorkspacePreferred } from '../../workspaceOpenSession';
import {
  claimEmptyWorkspaceDraftRestore,
  shouldRestoreEmptyWorkspaceDraft,
} from './emptyWorkspaceDraft';
import {
  EMPTY_WORKSPACE_ENTITY_REF,
  EMPTY_WORKSPACE_PATH,
  EMPTY_WORKSPACE_SCHEMA,
} from './resetToEmptyWorkspace';
import { blankCanvasRootForUrl, readBlankCanvasSession } from '../ioState/blankCanvasSession';

type LoadedDiagram = { path: string; name: string; schema: SystemSchema };

/** Parent node whose diagram the URL is, or a node on that diagram. */
function zoomNodeForUrl(
  parent: SystemSchema,
  expectedEntityRef: string | undefined
): { entityRef: string; name: string } | undefined {
  if (!expectedEntityRef || expectedEntityRef === parent.entityRef) return undefined;

  let match: { entityRef: string; name: string } | undefined;
  for (const node of parent.nodes) {
    if (!node.entityRef || node.external) continue;
    const ref = node.entityRef;
    if (expectedEntityRef !== ref && !expectedEntityRef.startsWith(`${ref}/`)) continue;
    if (!match || ref.length > match.entityRef.length) {
      match = { entityRef: ref, name: node.name };
    }
  }
  return match;
}

async function loadStoredChildDiagram(
  parent: SystemSchema,
  parentPath: string,
  node: { entityRef: string; name: string },
  existingPaths: readonly string[],
  workingCopyPort: WorkingCopyPort
): Promise<LoadedDiagram | null> {
  const built = buildChildZoomDiagram({
    nodeEntityRef: node.entityRef,
    nodeName: node.name,
    parentLevel: parent.level,
    version: parent.version,
    parentPath,
    existingPaths,
  });
  if (!built) return null;

  let stored: SystemSchema | null = null;
  try {
    stored = await workingCopyPort.loadWorkingSchema({
      filePath: built.path,
      systemName: built.schema.name,
      systemVersion: built.schema.version,
      systemLevel: built.schema.level,
      systemEntityRef: built.schema.entityRef,
    });
  } catch {
    stored = null;
  }

  const schema: SystemSchema = stored
    ? {
        ...built.schema,
        nodes: stored.nodes,
        dependencies: stored.dependencies,
        ...(stored.source !== undefined ? { source: stored.source } : {}),
      }
    : built.schema;

  return { path: built.path, name: schema.name, schema };
}

/**
 * Walk create-zoom parents until the URL target (or the deepest reachable child).
 * Nested zooms (container → component → code) each have their own working copy.
 */
async function loadCreateZoomChain(
  root: SystemSchema,
  rootPath: string,
  expectedEntityRef: string | undefined,
  workingCopyPort: WorkingCopyPort
): Promise<LoadedDiagram[]> {
  if (!expectedEntityRef) return [];

  const chain: LoadedDiagram[] = [];
  const existingPaths = [rootPath];
  let currentSchema = root;
  let currentPath = rootPath;

  while (true) {
    const node = zoomNodeForUrl(currentSchema, expectedEntityRef);
    if (!node) break;

    const child = await loadStoredChildDiagram(
      currentSchema,
      currentPath,
      node,
      existingPaths,
      workingCopyPort
    );
    if (!child) break;

    chain.push(child);
    existingPaths.push(child.path);

    if (
      expectedEntityRef === child.schema.entityRef ||
      !expectedEntityRef.startsWith(`${child.schema.entityRef}/`)
    ) {
      break;
    }

    currentSchema = child.schema;
    currentPath = child.path;
  }

  return chain;
}

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
  const blankRoot = blankCanvasRootForUrl({ urlEntityRef: expected, session });
  if (expected && !blankRoot) return false;

  const filePath = session?.filePath || EMPTY_WORKSPACE_PATH;
  const systemName = session?.name || EMPTY_WORKSPACE_SCHEMA.name;
  const systemEntityRef = session?.entityRef || blankRoot || expected || EMPTY_WORKSPACE_ENTITY_REF;

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
  const zoomChain = await loadCreateZoomChain(schema, filePath, expected, workingCopyPort);
  const parentDiagram: LoadedDiagram = { path: filePath, name: schema.name, schema };
  const systems = [parentDiagram, ...zoomChain];
  const active = zoomChain[zoomChain.length - 1] ?? parentDiagram;

  get().clearHistory();
  // Survives create-zoom URL changes after refresh — bootstrap must not reopen Samples.
  markFolderWorkspacePreferred();
  set({
    currentFilePath: active.path,
    workspaceCatalog:
      zoomChain.length > 0
        ? buildWorkspaceCatalog(
            systems.map(system => ({ path: system.path, schema: system.schema }))
          )
        : [],
    loadedSystems: systems,
    isWorkspaceOpen: false,
    isSampleWorkspace: false,
    usesRemoteCatalog: false,
    remoteCatalogRevision: null,
    isBrowserLiteWorkspace: false,
    browserScanGit: null,
    isMemoryScanWorkspace: false,
    isScanMapPersistOpen: false,
    workspaceName: '',
    selectedNodeId: null,
    selectedEdgeId: null,
    focusedCyclePath: null,
    rightPanelTab: 'catalog',
  });
  get().initSchema(active.schema);
  return true;
}
