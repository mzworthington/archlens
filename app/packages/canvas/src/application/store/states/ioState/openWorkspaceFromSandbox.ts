import type { WorkspaceCatalogEntry } from '@archlens/core';
import type { WorkspacePort } from '../../../../core';
import { selectBundledSampleEntryPath } from '../../samplesWorkspace';
import { isWorkspaceOpenCurrent } from '../../workspaceOpenSession';
import { loadWorkspaceFromCatalog } from './openWorkspaceFromCatalog';
import type { WorkspaceOpenSink } from './openWorkspaceShared';

export type SandboxWorkspaceSession = {
  catalog: WorkspaceCatalogEntry[];
  workspacePort: Pick<WorkspacePort, 'readFile' | 'getDirectoryName'>;
};

export type LoadWorkspaceFromSandboxDeps = WorkspaceOpenSink & {
  loadSession: () => Promise<SandboxWorkspaceSession>;
  /** When set, finalize is skipped if a newer open started. */
  openGeneration?: number;
  /** Called after a successful sandbox open (e.g. warm remaining catalog YAML). */
  onOpened?: (catalog: WorkspaceCatalogEntry[]) => void;
};

/**
 * Open the bundled/remote sandbox. Owns session load, entry selection, and sample ports.
 * Catalog fetch stays in `loadWorkspaceFromCatalog` so a sandbox-only bug cannot hide there.
 */
export async function loadWorkspaceFromSandbox(
  deps: LoadWorkspaceFromSandboxDeps
): Promise<boolean> {
  const { loadSession, openGeneration, onOpened, ...catalogSink } = deps;
  const session = await loadSession();
  if (openGeneration != null && !isWorkspaceOpenCurrent(openGeneration)) return false;

  const catalog = session.catalog;
  const entryPath = selectBundledSampleEntryPath(catalog);
  const opened = await loadWorkspaceFromCatalog({
    ...catalogSink,
    catalog,
    entryPath,
    readFile: relativePath => session.workspacePort.readFile(relativePath),
    getDirectoryName: () => session.workspacePort.getDirectoryName(),
    isSampleWorkspace: true,
    openGeneration,
    committedPorts: {
      workspacePort: session.workspacePort,
      sampleWorkspacePort: session.workspacePort,
    },
  });
  if (opened) {
    onOpened?.(catalog);
  }
  return opened;
}
