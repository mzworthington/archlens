import { fireEvent, render, screen, within } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fetchRemoteCatalogLatestPointer } from '../../../../../infrastructure/fileSystem/remoteCatalogWorkspace';
import { useBlueprintStore } from '../../../../../application/store/store';
import { CatalogRefreshOffer } from './CatalogRefreshOffer';

vi.mock('../../../../../infrastructure/fileSystem/remoteCatalogWorkspace', () => ({
  fetchRemoteCatalogLatestPointer: vi.fn(),
}));

vi.mock('../../../../../infrastructure/fileSystem/sampleWorkspaceLoader', () => ({
  resolveRemoteCatalogBaseUrl: () => 'https://blueprints.example.dev/',
}));

const fetchLatest = vi.mocked(fetchRemoteCatalogLatestPointer);

describe('CatalogRefreshOffer', () => {
  const refreshRemoteCatalog = vi.fn();

  beforeEach(() => {
    refreshRemoteCatalog.mockReset();
    fetchLatest.mockReset();
    fetchLatest.mockResolvedValue({
      revision: 'rev2',
      publishedAt: '2026-08-05T00:00:00.000Z',
      snapshotPrefix: 'snapshots/rev2/',
    });
    useBlueprintStore.setState({
      usesRemoteCatalog: true,
      remoteCatalogRevision: 'rev1',
      hasPendingChanges: false,
      refreshRemoteCatalog,
    });
  });

  it('names the refresh controls and hides them when the user keeps the current snapshot', async () => {
    render(<CatalogRefreshOffer />);
    const offer = await screen.findByRole('status', { name: 'Newer snapshot available' });
    expect(offer).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Refresh in place' })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Keep what I have' }));
    expect(
      screen.queryByRole('status', { name: 'Newer snapshot available' })
    ).not.toBeInTheDocument();
    expect(refreshRemoteCatalog).not.toHaveBeenCalled();
  });

  it('asks before replacing drafts, and Escape keeps them', async () => {
    refreshRemoteCatalog.mockResolvedValue('needs-confirm');
    render(<CatalogRefreshOffer />);
    fireEvent.click(await screen.findByRole('button', { name: 'Refresh in place' }));
    const dialog = await screen.findByRole('dialog', { name: 'Replace draft changes?' });
    expect(dialog).toBeInTheDocument();
    expect(refreshRemoteCatalog).toHaveBeenCalledWith(false);
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(
      screen.queryByRole('dialog', { name: 'Replace draft changes?' })
    ).not.toBeInTheDocument();
    expect(refreshRemoteCatalog).toHaveBeenCalledTimes(1);
  });

  it('refreshes in place after the user confirms draft replacement', async () => {
    refreshRemoteCatalog.mockImplementation(async (confirmed?: boolean) =>
      confirmed ? 'refreshed' : 'needs-confirm'
    );
    render(<CatalogRefreshOffer />);
    fireEvent.click(await screen.findByRole('button', { name: 'Refresh in place' }));
    const dialog = await screen.findByRole('dialog', { name: 'Replace draft changes?' });
    fireEvent.click(within(dialog).getByRole('button', { name: 'Refresh in place' }));
    expect(refreshRemoteCatalog).toHaveBeenLastCalledWith(true);
  });
});
