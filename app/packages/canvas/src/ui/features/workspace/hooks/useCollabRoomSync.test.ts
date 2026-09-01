import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useCollabRoomSync } from './useCollabRoomSync';
import { useBlueprintStore } from '../../../../application/store/store';
import {
  COLLABORATION_FEATURE,
  featureStorageKey,
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
    mockSearch = '?feature-collaboration=true&room=abcdefgh';
    renderHook(() => useCollabRoomSync());
    expect(useBlueprintStore.getState().joinCollabRoom).toHaveBeenCalledWith('abcdefgh');
  });

  it('keeps joining after the flag query is dropped in the same origin', () => {
    mockSearch = '?feature-collaboration=true&room=abcdefgh';
    const { rerender } = renderHook(() => useCollabRoomSync());
    expect(useBlueprintStore.getState().joinCollabRoom).toHaveBeenCalledTimes(1);

    mockSearch = '?room=abcdefgh';
    rerender();
    expect(useBlueprintStore.getState().joinCollabRoom).toHaveBeenCalledTimes(1);
    expect(useBlueprintStore.getState().leaveCollabRoom).not.toHaveBeenCalled();
  });
});
