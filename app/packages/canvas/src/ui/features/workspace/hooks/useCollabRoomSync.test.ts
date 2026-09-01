import { describe, it, expect, vi, beforeEach } from 'vitest';
import { act, renderHook } from '@testing-library/react';
import { useCollabRoomSync } from './useCollabRoomSync';
import { useBlueprintStore } from '../../../../application/store/store';
import { setCollabDisplayName } from '../../../../application/collab/collabDisplayName';
import {
  COLLABORATION_FEATURE,
  featureStorageKey,
  setFeatureEnabled,
} from '../../../../application/navigation/featureGate';

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
    localStorage.removeItem(featureStorageKey(COLLABORATION_FEATURE));
    sessionStorage.clear();
    localStorage.removeItem('archlens.collab.displayName');
    useBlueprintStore.setState({
      isWorkspaceOpen: false,
      joinCollabRoom: vi.fn().mockResolvedValue(undefined),
      leaveCollabRoom: vi.fn(),
    });
  });

  it('does not join a room when there is no share link and the flag is off', () => {
    mockSearch = '';
    renderHook(() => useCollabRoomSync());
    expect(useBlueprintStore.getState().joinCollabRoom).not.toHaveBeenCalled();
  });

  it('does not join an invalid room param', () => {
    mockSearch = '?room=nope';
    renderHook(() => useCollabRoomSync());
    expect(useBlueprintStore.getState().joinCollabRoom).not.toHaveBeenCalled();
    expect(localStorage.getItem(featureStorageKey(COLLABORATION_FEATURE))).toBeNull();
  });

  it('unlocks collaboration from a share link but waits for a display name', () => {
    mockSearch = '?room=b361b20b-f34f-4bbe-935e-f39c0f6aea44';
    const { result } = renderHook(() => useCollabRoomSync());
    expect(localStorage.getItem(featureStorageKey(COLLABORATION_FEATURE))).toBe('1');
    expect(useBlueprintStore.getState().joinCollabRoom).not.toHaveBeenCalled();
    expect(result.current.needsDisplayName).toBe(true);
  });

  it('joins after a display name is provided', () => {
    localStorage.setItem(featureStorageKey(COLLABORATION_FEATURE), '1');
    mockSearch = '?room=abcdefgh';
    const { result } = renderHook(() => useCollabRoomSync());
    expect(useBlueprintStore.getState().joinCollabRoom).not.toHaveBeenCalled();

    act(() => {
      result.current.confirmDisplayName('Ada');
    });

    expect(useBlueprintStore.getState().joinCollabRoom).toHaveBeenCalledWith('abcdefgh', 'Ada');
  });

  it('joins a named session from the URL on a blank canvas when the flag is on', () => {
    localStorage.setItem(featureStorageKey(COLLABORATION_FEATURE), '1');
    setCollabDisplayName('Ada');
    mockSearch = '?room=abcdefgh';
    renderHook(() => useCollabRoomSync());
    expect(useBlueprintStore.getState().joinCollabRoom).toHaveBeenCalledWith('abcdefgh', 'Ada');
  });

  it('keeps joining while the room stays in the query', () => {
    localStorage.setItem(featureStorageKey(COLLABORATION_FEATURE), '1');
    setCollabDisplayName('Ada');
    mockSearch = '?room=abcdefgh';
    const { rerender } = renderHook(() => useCollabRoomSync());
    expect(useBlueprintStore.getState().joinCollabRoom).toHaveBeenCalledTimes(1);

    mockSearch = '?room=abcdefgh';
    rerender();
    expect(useBlueprintStore.getState().joinCollabRoom).toHaveBeenCalledTimes(1);
    expect(useBlueprintStore.getState().leaveCollabRoom).not.toHaveBeenCalled();
  });

  it('leaves the room when the flag is turned off', () => {
    localStorage.setItem(featureStorageKey(COLLABORATION_FEATURE), '1');
    setCollabDisplayName('Ada');
    mockSearch = '?room=abcdefgh';
    renderHook(() => useCollabRoomSync());
    expect(useBlueprintStore.getState().joinCollabRoom).toHaveBeenCalledTimes(1);

    act(() => {
      setFeatureEnabled(COLLABORATION_FEATURE, false);
    });
    expect(useBlueprintStore.getState().leaveCollabRoom).toHaveBeenCalled();
  });

  it('strips the room from the URL when a guest cancels join', () => {
    mockSearch = '?room=abcdefgh';
    localStorage.setItem(featureStorageKey(COLLABORATION_FEATURE), '1');
    const { result } = renderHook(() => useCollabRoomSync());
    act(() => {
      result.current.cancelJoin();
    });
    expect(mockSetLocation).toHaveBeenCalledWith('/workspace');
  });
});
