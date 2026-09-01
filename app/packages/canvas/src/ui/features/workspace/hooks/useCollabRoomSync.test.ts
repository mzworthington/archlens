import { describe, it, expect, vi, beforeEach } from 'vitest';
import { act, renderHook } from '@testing-library/react';
import { useCollabRoomSync } from './useCollabRoomSync';
import { useBlueprintStore } from '../../../../application/store/store';
import {
  COLLABORATION_FEATURE,
  featureStorageKey,
  setFeatureEnabled,
} from '../../../../application/navigation/featureGate';

let mockSearch = '';

vi.mock('wouter', () => ({
  useSearch: () => mockSearch,
}));

describe('useCollabRoomSync', () => {
  beforeEach(() => {
    mockSearch = '';
    localStorage.removeItem(featureStorageKey(COLLABORATION_FEATURE));
    useBlueprintStore.setState({
      isWorkspaceOpen: false,
      joinCollabRoom: vi.fn().mockResolvedValue(undefined),
      leaveCollabRoom: vi.fn(),
    });
  });

  it('does not join a room when collaboration is flagged off', () => {
    mockSearch = '?room=abcdefgh';
    renderHook(() => useCollabRoomSync());
    expect(useBlueprintStore.getState().joinCollabRoom).not.toHaveBeenCalled();
  });

  it('joins a room from the URL on a blank canvas when the flag is on', () => {
    localStorage.setItem(featureStorageKey(COLLABORATION_FEATURE), '1');
    mockSearch = '?room=abcdefgh';
    renderHook(() => useCollabRoomSync());
    expect(useBlueprintStore.getState().joinCollabRoom).toHaveBeenCalledWith('abcdefgh');
  });

  it('keeps joining while the room stays in the query', () => {
    localStorage.setItem(featureStorageKey(COLLABORATION_FEATURE), '1');
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
    mockSearch = '?room=abcdefgh';
    renderHook(() => useCollabRoomSync());
    expect(useBlueprintStore.getState().joinCollabRoom).toHaveBeenCalledTimes(1);

    act(() => {
      setFeatureEnabled(COLLABORATION_FEATURE, false);
    });
    expect(useBlueprintStore.getState().leaveCollabRoom).toHaveBeenCalled();
  });
});
