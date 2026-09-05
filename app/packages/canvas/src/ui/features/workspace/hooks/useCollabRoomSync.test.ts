import { describe, it, expect, vi, beforeEach } from 'vitest';
import { act, renderHook } from '@testing-library/react';
import { useCollabRoomSync } from './useCollabRoomSync';
import { useBlueprintStore } from '../../../../application/store/store';
import { setCollabDisplayName } from '../../../../application/collab/collabDisplayName';

let mockSearch = '';
const mockSetLocation = vi.fn();

vi.mock('wouter', () => ({
  useSearch: () => mockSearch,
  useLocation: () => ['/workspace', mockSetLocation],
}));

describe('useCollabRoomSync', () => {
  beforeEach(() => {
    mockSearch = '';
    mockSetLocation.mockReset();
    sessionStorage.clear();
    localStorage.removeItem('archlens.collab.displayName');
    useBlueprintStore.setState({
      isWorkspaceOpen: false,
      collabJoinError: null,
      joinCollabRoom: vi.fn().mockResolvedValue(undefined),
      leaveCollabRoom: vi.fn(),
    });
  });

  it('does not join a room when there is no share link', () => {
    mockSearch = '';
    renderHook(() => useCollabRoomSync());
    expect(useBlueprintStore.getState().joinCollabRoom).not.toHaveBeenCalled();
  });

  it('does not join an invalid room param', () => {
    mockSearch = '?room=nope';
    renderHook(() => useCollabRoomSync());
    expect(useBlueprintStore.getState().joinCollabRoom).not.toHaveBeenCalled();
  });

  it('waits for a display name before joining a share link', () => {
    mockSearch = '?room=b361b20b-f34f-4bbe-935e-f39c0f6aea44';
    const { result } = renderHook(() => useCollabRoomSync());
    expect(useBlueprintStore.getState().joinCollabRoom).not.toHaveBeenCalled();
    expect(result.current.needsDisplayName).toBe(true);
  });

  it('joins after a display name is provided', () => {
    mockSearch = '?room=abcdefgh';
    const { result } = renderHook(() => useCollabRoomSync());
    expect(useBlueprintStore.getState().joinCollabRoom).not.toHaveBeenCalled();

    act(() => {
      result.current.confirmJoin('Ada', '');
    });

    expect(useBlueprintStore.getState().joinCollabRoom).toHaveBeenCalledWith(
      'abcdefgh',
      'Ada',
      expect.objectContaining({})
    );
  });

  it('sends a guest secret when joining a protected room', () => {
    mockSearch = '?room=abcdefgh';
    const { result } = renderHook(() => useCollabRoomSync());

    act(() => {
      result.current.confirmJoin('Ada', 'correct-secret');
    });

    expect(useBlueprintStore.getState().joinCollabRoom).toHaveBeenCalledWith(
      'abcdefgh',
      'Ada',
      expect.objectContaining({ secret: 'correct-secret' })
    );
  });

  it('joins a named session from the URL on a blank canvas', () => {
    setCollabDisplayName('Ada');
    mockSearch = '?room=abcdefgh';
    renderHook(() => useCollabRoomSync());
    expect(useBlueprintStore.getState().joinCollabRoom).toHaveBeenCalledWith(
      'abcdefgh',
      'Ada',
      expect.objectContaining({})
    );
  });

  it('keeps joining while the room stays in the query', () => {
    setCollabDisplayName('Ada');
    mockSearch = '?room=abcdefgh';
    const { rerender } = renderHook(() => useCollabRoomSync());
    expect(useBlueprintStore.getState().joinCollabRoom).toHaveBeenCalledTimes(1);

    mockSearch = '?room=abcdefgh';
    rerender();
    expect(useBlueprintStore.getState().joinCollabRoom).toHaveBeenCalledTimes(1);
    expect(useBlueprintStore.getState().leaveCollabRoom).not.toHaveBeenCalled();
  });

  it('leaves the room when the room query is removed', () => {
    setCollabDisplayName('Ada');
    mockSearch = '?room=abcdefgh';
    const { rerender } = renderHook(() => useCollabRoomSync());
    expect(useBlueprintStore.getState().joinCollabRoom).toHaveBeenCalledTimes(1);

    mockSearch = '';
    rerender();
    expect(useBlueprintStore.getState().leaveCollabRoom).toHaveBeenCalled();
  });

  it('strips the room from the URL when a guest cancels join', () => {
    mockSearch = '?room=abcdefgh';
    const { result } = renderHook(() => useCollabRoomSync());
    act(() => {
      result.current.cancelJoin();
    });
    expect(mockSetLocation).toHaveBeenCalledWith('/workspace');
    expect(useBlueprintStore.getState().leaveCollabRoom).toHaveBeenCalled();
  });
});
