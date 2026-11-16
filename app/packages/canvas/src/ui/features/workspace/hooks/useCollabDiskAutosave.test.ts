import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useCollabDiskAutosave, COLLAB_DISK_AUTOSAVE_MS } from './useCollabDiskAutosave';
import { useBlueprintStore } from '../../../../application/store/store';

describe('useCollabDiskAutosave', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    useBlueprintStore.setState({
      collabRoomActive: true,
      isWorkspaceOpen: true,
      isSampleWorkspace: false,
      hasPendingChanges: true,
      yamlCode: 'name: Shop\nnodes: []\n',
      currentFilePath: 'blueprints/shop.yaml',
      saveActiveDiagram: vi.fn().mockResolvedValue(true),
    });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('quietly commits pending folder changes after the debounce while a room is active', async () => {
    const saveActiveDiagram = vi.fn().mockResolvedValue(true);
    useBlueprintStore.setState({ saveActiveDiagram });

    renderHook(() => useCollabDiskAutosave());
    await act(async () => {
      vi.advanceTimersByTime(COLLAB_DISK_AUTOSAVE_MS);
    });

    expect(saveActiveDiagram).toHaveBeenCalledWith({ quiet: true });
  });

  it('does not auto-save when not in a live room', async () => {
    const saveActiveDiagram = vi.fn().mockResolvedValue(true);
    useBlueprintStore.setState({ collabRoomActive: false, saveActiveDiagram });

    renderHook(() => useCollabDiskAutosave());
    await act(async () => {
      vi.advanceTimersByTime(COLLAB_DISK_AUTOSAVE_MS * 2);
    });

    expect(saveActiveDiagram).not.toHaveBeenCalled();
  });

  it('does not auto-save sample workspaces', async () => {
    const saveActiveDiagram = vi.fn().mockResolvedValue(true);
    useBlueprintStore.setState({ isSampleWorkspace: true, saveActiveDiagram });

    renderHook(() => useCollabDiskAutosave());
    await act(async () => {
      vi.advanceTimersByTime(COLLAB_DISK_AUTOSAVE_MS * 2);
    });

    expect(saveActiveDiagram).not.toHaveBeenCalled();
  });
});
