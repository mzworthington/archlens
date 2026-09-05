import type { SystemSchema, WorkspaceCatalogEntry } from '@archlens/core';
import { assessSchemaVersion, resolveWorkspaceEntityRefs } from '@archlens/core';
import type { WorkingCopyPort } from '../../../../core';
import { resolveSchemaOnWorkspaceOpen } from '../../../workspace/schemaCompare';
import {
  isWorkspaceOpenCurrent,
  markDemoWorkspacePreferred,
  markFolderWorkspacePreferred,
} from '../../workspaceOpenSession';
import type { ToastNotification } from '../uiState';
import type { BlueprintStoreSet } from '../../store';
import type { LoadedSystem, WorkspaceOpenLogger } from './openWorkspaceTypes';

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
  isBrowserLiteWorkspace?: boolean;
  openGeneration?: number;
  committedPorts?: Record<string, unknown>;
  workingCopy: WorkingCopyPort;
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
    isBrowserLiteWorkspace = false,
    openGeneration,
    committedPorts,
    workingCopy,
    logger,
    setNotification,
    initSchema,
    set,
  } = args;

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

  set({
    ...committedPorts,
    isWorkspaceOpen: true,
    isSampleWorkspace,
    isBrowserLiteWorkspace,
    browserLiteBannerOpen: isBrowserLiteWorkspace,
    isMemoryScanWorkspace: false,
    workspaceName,
    workspaceCatalog,
    loadedSystems: [entry],
    nodeRefMap: {
      [entry.path]: resolved.nodeRefMap[entry.path] || {},
    },
    currentFilePath: entry.path,
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
