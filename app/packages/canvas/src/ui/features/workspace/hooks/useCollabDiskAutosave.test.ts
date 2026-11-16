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

  it('schedules another quiet save when a debounce fires during an in-flight save', async () => {
    let releaseSave: (ok: boolean) => void = () => undefined;
    const saveActiveDiagram = vi.fn(
      () =>
        new Promise<boolean>(resolve => {
          releaseSave = resolve;
        })
    );
    useBlueprintStore.setState({ saveActiveDiagram });

    renderHook(() => useCollabDiskAutosave());
    await act(async () => {
      await vi.advanceTimersByTimeAsync(COLLAB_DISK_AUTOSAVE_MS);
    });
    expect(saveActiveDiagram).toHaveBeenCalledTimes(1);

    act(() => {
      useBlueprintStore.setState({ yamlCode: 'name: Shop\nnodes:\n  - id: api\n' });
    });
    await act(async () => {
      await vi.advanceTimersByTimeAsync(COLLAB_DISK_AUTOSAVE_MS);
    });
    expect(saveActiveDiagram).toHaveBeenCalledTimes(1);

    await act(async () => {
      releaseSave(true);
    });
    await act(async () => {
      await vi.advanceTimersByTimeAsync(COLLAB_DISK_AUTOSAVE_MS);
    });
    expect(saveActiveDiagram).toHaveBeenCalledTimes(2);
    expect(saveActiveDiagram).toHaveBeenLastCalledWith({ quiet: true });
    releaseSave(true);
  });

  it('schedules another quiet save after a failed save without a further edit', async () => {
    const saveActiveDiagram = vi.fn().mockResolvedValue(false);
    useBlueprintStore.setState({ saveActiveDiagram });

    renderHook(() => useCollabDiskAutosave());
    await act(async () => {
      await vi.advanceTimersByTimeAsync(COLLAB_DISK_AUTOSAVE_MS);
    });
    expect(saveActiveDiagram).toHaveBeenCalledTimes(1);

    await act(async () => {
      await vi.advanceTimersByTimeAsync(COLLAB_DISK_AUTOSAVE_MS);
    });
    expect(saveActiveDiagram).toHaveBeenCalledTimes(2);
  });

  it('does not retry a failed quiet save after the live room closes', async () => {
    const saveActiveDiagram = vi.fn().mockResolvedValue(false);
    useBlueprintStore.setState({ saveActiveDiagram });

    renderHook(() => useCollabDiskAutosave());
    await act(async () => {
      await vi.advanceTimersByTimeAsync(COLLAB_DISK_AUTOSAVE_MS);
    });

    act(() => {
      useBlueprintStore.setState({ collabRoomActive: false });
    });
    await act(async () => {
      await vi.advanceTimersByTimeAsync(COLLAB_DISK_AUTOSAVE_MS * 3);
    });
    expect(saveActiveDiagram).toHaveBeenCalledTimes(1);
  });
});
