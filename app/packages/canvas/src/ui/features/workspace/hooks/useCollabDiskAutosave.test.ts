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

    expect(saveActiveDiagram).toHaveBeenCalledWith(
      expect.objectContaining({ quiet: true, isCurrent: expect.any(Function) })
    );
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

  it('reschedules when a quiet save fails and pending changes remain', async () => {
    const saveActiveDiagram = vi.fn().mockResolvedValueOnce(false).mockResolvedValueOnce(true);
    useBlueprintStore.setState({ saveActiveDiagram, hasPendingChanges: true });

    renderHook(() => useCollabDiskAutosave());
    await act(async () => {
      vi.advanceTimersByTime(COLLAB_DISK_AUTOSAVE_MS);
      await Promise.resolve();
    });
    expect(saveActiveDiagram).toHaveBeenCalledTimes(1);

    await act(async () => {
      vi.advanceTimersByTime(COLLAB_DISK_AUTOSAVE_MS);
      await Promise.resolve();
    });
    expect(saveActiveDiagram).toHaveBeenCalledTimes(2);
  });

  it('marks isCurrent false after Keep disk clears pending changes', async () => {
    let capturedIsCurrent: (() => boolean) | undefined;
    const saveActiveDiagram = vi.fn().mockImplementation(async options => {
      capturedIsCurrent = options?.isCurrent;
      return true;
    });
    useBlueprintStore.setState({ saveActiveDiagram });

    renderHook(() => useCollabDiskAutosave());
    await act(async () => {
      vi.advanceTimersByTime(COLLAB_DISK_AUTOSAVE_MS);
      await Promise.resolve();
    });

    expect(capturedIsCurrent?.()).toBe(true);
    useBlueprintStore.setState({
      hasPendingChanges: false,
      yamlCode: 'name: Disk\nnodes: []\n',
    });
    expect(capturedIsCurrent?.()).toBe(false);
  });
});
