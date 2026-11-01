import type { WorkspaceCatalogEntry } from '@archlens/core';
import type { SampleWorkspaceSession } from '../../infrastructure/fileSystem/sampleWorkspaceLoader';

export type CatalogRefreshOffer = 'offer' | 'hidden';

export type CatalogRefreshStep = 'refresh' | 'needs-confirm';

export type RemoteCatalogRefreshResult = 'refreshed' | 'needs-confirm' | 'failed';

/** Show the banner only when a newer revision is published and not dismissed. */
export function remoteCatalogRefreshOffer(input: {
  loadedRevision: string | null;
  latestRevision: string | null;
  dismissedRevision: string | null;
}): CatalogRefreshOffer {
  if (!input.loadedRevision || !input.latestRevision) return 'hidden';
  if (input.loadedRevision === input.latestRevision) return 'hidden';
  if (input.dismissedRevision === input.latestRevision) return 'hidden';
  return 'offer';
}

/** Refresh replaces the canvas. Drafts need an explicit confirm first. */
export function catalogRefreshNextStep(
  hasPendingChanges: boolean,
  confirmed: boolean
): CatalogRefreshStep {
  if (hasPendingChanges && !confirmed) return 'needs-confirm';
  return 'refresh';
}

export async function runRemoteCatalogRefresh(deps: {
  hasPendingChanges: boolean;
  confirmed: boolean;
  currentFilePath: string;
  clearDrafts: () => Promise<void>;
  /** Drop in-memory canvas layout so a same-topology snapshot can change labels. */
  clearSessionLayout: () => void;
  invalidateCache: () => void;
  loadSession: () => Promise<SampleWorkspaceSession>;
  readLoadedRevision: () => string | null;
  openCatalog: (session: SampleWorkspaceSession, entryPath: string) => Promise<boolean>;
  selectEntryPath: (catalog: readonly WorkspaceCatalogEntry[]) => string;
}): Promise<RemoteCatalogRefreshResult> {
  if (catalogRefreshNextStep(deps.hasPendingChanges, deps.confirmed) === 'needs-confirm') {
    return 'needs-confirm';
  }

  deps.invalidateCache();
  let session: SampleWorkspaceSession;
  try {
    session = await deps.loadSession();
  } catch {
    return 'failed';
  }
  if (!session.usesRemoteCatalog) return 'failed';

  try {
    await deps.clearDrafts();
  } catch {
    return 'failed';
  }
  deps.clearSessionLayout();

  const entryStillListed = session.catalog.some(entry => entry.path === deps.currentFilePath);
  const entryPath = entryStillListed ? deps.currentFilePath : deps.selectEntryPath(session.catalog);

  const opened = await deps.openCatalog(session, entryPath);
  if (!opened) return 'failed';

  const revision = deps.readLoadedRevision();
  if (!revision) return 'failed';
  return 'refreshed';
}
