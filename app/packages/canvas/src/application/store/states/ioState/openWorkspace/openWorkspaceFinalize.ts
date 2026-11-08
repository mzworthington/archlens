import type { SystemSchema, WorkspaceCatalogEntry } from '@archlens/core';
import { assessSchemaVersion, resolveWorkspaceEntityRefs } from '@archlens/core';
import type { WorkingCopyPort, WorkspacePort } from '../../../../../core';
import { resolveSchemaOnWorkspaceOpen } from '../../../../workspace/schemaCompare';
import {
  isWorkspaceOpenCurrent,
  markDemoWorkspacePreferred,
  markFolderWorkspacePreferred,
} from '../../../workspaceOpenSession';
import type { ToastNotification } from '../../uiState';
import type { BrowserGitHistoryStatus } from '../../../../analysis/browserGitStatus';
import type { BlueprintStoreSet } from '../../../store';
import type { LoadedSystem, WorkspaceOpenLogger } from './openWorkspaceTypes';
import { loadCommentSidecar } from '../commentSidecarActions';

export async function applyDiskFirstDraftResolution(
  resolvedSystems: LoadedSystem[],
  resolved: ReturnType<typeof resolveWorkspaceEntityRefs>,
  workingCopy: WorkingCopyPort,
  logger: { warn: (m: string, meta?: Record<string, unknown>) => void }
): Promise<{ systems: LoadedSystem[]; discardedDraftCount: number }> {
  let discardedDraftCount = 0;
  const systems: LoadedSystem[] = [];

  for (const sys of resolvedSystems) {
    const sysId = sys.schema.entityRef || 'default';
    const fileRefMap = resolved.nodeRefMap[sys.path] || {};
    const diskSchema = sys.schema;

    try {
      await workingCopy.saveBaselineSchema({
        filePath: sys.path,
        schema: diskSchema,
        systemId: sysId,
        nodeRefMap: fileRefMap,
      });
    } catch {
      /* ignore persistence failures on open */
    }

    let workingSchema: SystemSchema | null = null;
    try {
      workingSchema = await workingCopy.loadWorkingSchema({
        filePath: sys.path,
        systemName: diskSchema.name,
        systemVersion: diskSchema.version,
        systemLevel: diskSchema.level,
        systemEntityRef: diskSchema.entityRef,
      });
    } catch {
      workingSchema = null;
    }

    const resolution = resolveSchemaOnWorkspaceOpen(diskSchema, workingSchema);
    if (resolution.discardedStaleDraft) {
      discardedDraftCount += 1;
      logger.warn('Discarding IndexedDB draft that no longer matches disk YAML', {
        path: sys.path,
      });
    }

    try {
      await workingCopy.saveWorkingSchema({
        filePath: sys.path,
        schema: resolution.schema,
        systemId: sysId,
        nodeRefMap: fileRefMap,
      });
    } catch {
      /* ignore persistence failures on open */
    }

    systems.push({
      ...sys,
      schema: resolution.schema,
    });
  }

  return { systems, discardedDraftCount };
}

export async function finalizeWorkspaceOpen(args: {
  entryCandidate: LoadedSystem;
  resolved: ReturnType<typeof resolveWorkspaceEntityRefs>;
  workspaceCatalog: WorkspaceCatalogEntry[];
  workspaceName: string;
  isSampleWorkspace: boolean;
  usesRemoteCatalog?: boolean;
  remoteCatalogRevision?: string | null;
  isBrowserLiteWorkspace?: boolean;
  browserScanGit?: BrowserGitHistoryStatus | null;
  openGeneration?: number;
  committedPorts?: Record<string, unknown>;
  workingCopy: WorkingCopyPort;
  /** When provided and not a sample workspace, comments are loaded from the sidecar. */
  workspacePort?: WorkspacePort;
  logger: WorkspaceOpenLogger;
  setNotification?: (n: ToastNotification | null) => void;
  initSchema: (schema: SystemSchema) => void;
  set: BlueprintStoreSet;
}): Promise<boolean> {
  const {
    entryCandidate,
    resolved,
    workspaceCatalog,
    workspaceName,
    isSampleWorkspace,
    usesRemoteCatalog = false,
    remoteCatalogRevision = null,
    isBrowserLiteWorkspace = false,
    browserScanGit = null,
    openGeneration,
    committedPorts,
    workingCopy,
    workspacePort: explicitWorkspacePort,
    logger,
    setNotification,
    initSchema,
    set,
  } = args;

  // Fall back to the port embedded in committedPorts when not passed explicitly.
  const workspacePort: WorkspacePort | undefined =
    explicitWorkspacePort ??
    (committedPorts &&
    typeof committedPorts === 'object' &&
    'workspacePort' in committedPorts &&
    committedPorts.workspacePort &&
    typeof (committedPorts.workspacePort as WorkspacePort).readFile === 'function'
      ? (committedPorts.workspacePort as WorkspacePort)
      : undefined);

  if (openGeneration != null && !isWorkspaceOpenCurrent(openGeneration)) return false;

  const { systems, discardedDraftCount } = await applyDiskFirstDraftResolution(
    [entryCandidate],
    resolved,
    workingCopy,
    logger
  );

  if (openGeneration != null && !isWorkspaceOpenCurrent(openGeneration)) return false;

  if (isSampleWorkspace) {
    markDemoWorkspacePreferred();
  } else {
    markFolderWorkspacePreferred();
  }

  const entry = systems[0] ?? entryCandidate;

  // Load persisted comments from the sidecar alongside the workspace open.
  const sidecarDoc =
    !isSampleWorkspace && workspacePort
      ? await loadCommentSidecar(entry.path, workspacePort)
      : null;

  set({
    ...committedPorts,
    isWorkspaceOpen: true,
    isSampleWorkspace,
    usesRemoteCatalog,
    remoteCatalogRevision: usesRemoteCatalog ? remoteCatalogRevision : null,
    isBrowserLiteWorkspace,
    browserScanGit: isBrowserLiteWorkspace ? (browserScanGit ?? 'missing') : null,
    browserLiteBannerOpen: isBrowserLiteWorkspace,
    isMemoryScanWorkspace: false,
    workspaceName,
    workspaceCatalog,
    loadedSystems: [entry],
    nodeRefMap: {
      [entry.path]: resolved.nodeRefMap[entry.path] || {},
    },
    currentFilePath: entry.path,
    persistedComments: sidecarDoc ? Object.values(sidecarDoc.comments) : [],
  });
  initSchema(entry.schema);

  logger.info('Workspace opened with lazy system load', {
    catalogSize: workspaceCatalog.length,
    entryPath: entry.path,
    isSampleWorkspace,
    isBrowserLiteWorkspace,
  });

  if (discardedDraftCount > 0) {
    setNotification?.({
      type: 'info',
      title: 'Loaded files from disk',
      message: `Discarded ${discardedDraftCount} stale local draft${
        discardedDraftCount === 1 ? '' : 's'
      } that differed from YAML on disk (e.g. after a CLI rescan).`,
    });
  } else {
    const versionWarning = assessSchemaVersion(entry.schema.version);
    if (versionWarning) {
      setNotification?.({
        type: 'warning',
        title: versionWarning.title,
        message: `${versionWarning.message} ${versionWarning.migrationHint}`,
      });
    }
  }

  return true;
}
