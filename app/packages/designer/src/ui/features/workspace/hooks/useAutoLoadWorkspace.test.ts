import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { useAutoLoadWorkspace } from './useAutoLoadWorkspace';
import { useBlueprintStore } from '../../../../application/store/store';

const setIsStartupOpen = vi.fn();
const setLocation = vi.fn();

describe('useAutoLoadWorkspace', () => {
  beforeEach(() => {
    setIsStartupOpen.mockClear();
    setLocation.mockClear();
    try {
      localStorage.removeItem('archlens.workspaceSession');
    } catch {
      /* ignore */
    }
    useBlueprintStore.setState({
      loadedSystems: [],
      isWorkspaceOpen: false,
      loadBundledSandbox: vi.fn().mockResolvedValue(undefined),
      restoreWorkspaceSession: vi.fn().mockResolvedValue(false),
    });
  });

  it('restores a prior sandbox session on bare /workspace', async () => {
    const restoreWorkspaceSession = vi.fn().mockResolvedValue(true);
    useBlueprintStore.setState({ restoreWorkspaceSession });

    renderHook(() => useAutoLoadWorkspace('/workspace', setIsStartupOpen, setLocation));

    await waitFor(() => {
      expect(restoreWorkspaceSession).toHaveBeenCalled();
    });
    expect(setIsStartupOpen).toHaveBeenCalledWith(false);
    expect(setLocation).toHaveBeenCalledWith('/workspace/blueprint', { replace: true });
  });

  it('keeps the startup chooser open for first-time visitors', async () => {
    renderHook(() => useAutoLoadWorkspace('/workspace', setIsStartupOpen, setLocation));

    await waitFor(() => {
      expect(useBlueprintStore.getState().restoreWorkspaceSession).toHaveBeenCalled();
    });
    expect(setIsStartupOpen).not.toHaveBeenCalledWith(false);
    expect(setLocation).not.toHaveBeenCalled();
  });
});
