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

  it('loads sandbox on bare /workspace when no folder session exists', async () => {
    const loadBundledSandbox = vi.fn().mockResolvedValue(undefined);
    useBlueprintStore.setState({ loadBundledSandbox });

    renderHook(() => useAutoLoadWorkspace('/workspace', setIsStartupOpen, setLocation));

    await waitFor(() => {
      expect(loadBundledSandbox).toHaveBeenCalled();
    });
    expect(setIsStartupOpen).toHaveBeenCalledWith(false);
    expect(setLocation).toHaveBeenCalledWith('/workspace/blueprint', { replace: true });
  });
});
