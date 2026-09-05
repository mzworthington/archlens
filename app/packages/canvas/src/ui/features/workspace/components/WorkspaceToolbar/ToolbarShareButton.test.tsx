import { describe, expect, it, vi, beforeEach } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { ToolbarShareButton } from './ToolbarShareButton';
import { useBlueprintStore } from '../../../../../application/store/store';
import { noopCollabSession } from '../../../../../core';

const mockSetLocation = vi.fn();
let mockSearch = '';

vi.mock('wouter', () => ({
  useLocation: () => ['/workspace/shop', mockSetLocation],
  useSearch: () => mockSearch,
}));

describe('ToolbarShareButton', () => {
  beforeEach(() => {
    mockSearch = '?room=abcdefgh';
    mockSetLocation.mockReset();
    sessionStorage.clear();
    localStorage.removeItem('archlens.collab.displayName');
    useBlueprintStore.setState({
      isLoading: false,
      isWorkspaceOpen: true,
      setNotification: vi.fn(),
      collabSessionPort: { ...noopCollabSession, isActive: () => true, setDisplayName: vi.fn() },
      collabPresence: {
        connectedCount: 2,
        cursors: [],
        participants: [
          { clientId: 1, name: 'Ada', color: '#38bdf8', isLocal: true },
          { clientId: 2, name: 'Grace', color: '#a78bfa', isLocal: false },
        ],
      },
      updateCollabDisplayName: vi.fn().mockReturnValue(true),
      endCollabRoom: vi.fn(),
    });
    Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      value: { writeText: vi.fn().mockResolvedValue(undefined) },
    });
  });

  it('opens a session dialog with who is online instead of copying immediately', async () => {
    render(<ToolbarShareButton />);
    fireEvent.click(screen.getByTestId('toolbar-share-collab'));
    expect(screen.getByRole('dialog', { name: 'Live diagram' })).toBeInTheDocument();
    expect(screen.getByTestId('collab-share-roster')).toHaveTextContent('Grace');
    expect(mockSetLocation).not.toHaveBeenCalled();

    fireEvent.change(screen.getByLabelText('Your name'), { target: { value: 'Ada Lovelace' } });
    fireEvent.click(screen.getByRole('button', { name: 'Copy link' }));
    expect(useBlueprintStore.getState().updateCollabDisplayName).toHaveBeenCalledWith(
      'Ada Lovelace'
    );
    expect(mockSetLocation).toHaveBeenCalled();
    await waitFor(() => {
      expect(navigator.clipboard.writeText).toHaveBeenCalled();
    });
  });

  it('shows how many people are in the session', () => {
    render(<ToolbarShareButton />);
    expect(screen.getByTestId('collab-connected-count')).toHaveTextContent('2');
    expect(
      screen.getByRole('button', { name: 'Share live diagram, 2 people editing' })
    ).toBeInTheDocument();
  });
});
