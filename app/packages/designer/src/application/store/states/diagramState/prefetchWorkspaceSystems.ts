import { startBundledBlueprintPrefetch } from './bundledBlueprintLoader';
import { ensureSystemLoaded } from '../ioState/ensureSystemLoaded';
import {
  beginDiagramLoad,
  endDiagramLoad,
  type DiagramLoadStoreSlice,
} from '../../diagramLoadSession';
import { yieldToUi } from '../../yieldToUi';
import type { LoggerPort, WorkspacePort, WorkingCopyPort } from '../../../../core';
import type { SystemSchema } from '@archlens/core';
import type { WorkspaceCatalogEntry } from '@archlens/core';

const FORENSICS_PREFETCH_MESSAGE = 'Loading diagrams for forensics…';

type LoadedSystem = { path: string; name: string; schema: SystemSchema };

type PrefetchGet = () => {
  loadedSystems: LoadedSystem[];
  workspaceCatalog: WorkspaceCatalogEntry[];
  workspaceName: string;
  isWorkspaceOpen: boolean;
  workspacePort: WorkspacePort;
  workingCopyPort: WorkingCopyPort;
  logger: LoggerPort;
  nodeRefMap: Record<string, Record<string, string>>;
} & DiagramLoadStoreSlice;

let prefetchInFlight: Promise<void> | null = null;

/**
 * Load every diagram in the active workspace catalog so forensics rankings cover the full tree.
 * Folder workspaces load eagerly with a loading overlay; bundled sandbox uses background prefetch.
 */
export async function prefetchAllWorkspaceSystems(
  get: PrefetchGet,
  set: (partial: Record<string, unknown>) => void
): Promise<void> {
  if (prefetchInFlight) {
    await prefetchInFlight;
    return;
  }

  prefetchInFlight = (async () => {
    const { workspaceCatalog, loadedSystems, isWorkspaceOpen } = get();
    const unloadedPaths = workspaceCatalog
      .map(entry => entry.path)
      .filter(path => !loadedSystems.some(system => system.path === path));

    if (unloadedPaths.length === 0 || !isWorkspaceOpen) {
      if (!isWorkspaceOpen) {
        startBundledBlueprintPrefetch({ get, set });
      }
      return;
    }

    beginDiagramLoad(get, set, FORENSICS_PREFETCH_MESSAGE);
    await yieldToUi();

    try {
      const { workspacePort, workingCopyPort, logger } = get();
      for (const path of unloadedPaths) {
        const ok = await ensureSystemLoaded(path, {
          workspacePort,
          workingCopyPort,
          logger,
          get,
          set,
        });
        if (!ok) {
          logger.warn('Skipped forensics prefetch for missing system', { path });
        }
        await yieldToUi();
      }
    } finally {
      endDiagramLoad(get, set);
    }
  })();

  try {
    await prefetchInFlight;
  } finally {
    prefetchInFlight = null;
  }
}
