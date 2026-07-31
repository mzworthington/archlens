import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { useAutoLoadWorkspace } from './useAutoLoadWorkspace';
import { useBlueprintStore } from '../../../../application/store/store';
import { GOLDEN_PATHS_CONTEXT_PATH } from '../../../../application/store/defaultData';

const setIsStartupOpen = vi.fn();
const setLocation = vi.fn();

vi.mock('wouter', () => ({
  useLocation: () => ['/workspace', setLocation],
}));

describe('useAutoLoadWorkspace', () => {
  beforeEach(() => {
    setIsStartupOpen.mockClear();
    setLocation.mockClear();
    useBlueprintStore.setState({
      loadedSystems: [],
      isWorkspaceOpen: false,
      loadBundledSandbox: vi.fn().mockResolvedValue(undefined),
      selectSystem: vi.fn().mockResolvedValue(undefined),
    });
  });

  it('auto-loads the Golden Paths context on bare /workspace', async () => {
    renderHook(() => useAutoLoadWorkspace('/workspace', setIsStartupOpen));

    await waitFor(() => {
      expect(useBlueprintStore.getState().loadBundledSandbox).toHaveBeenCalled();
    });

    await waitFor(() => {
      expect(useBlueprintStore.getState().selectSystem).toHaveBeenCalledWith(
        GOLDEN_PATHS_CONTEXT_PATH
      );
      expect(setIsStartupOpen).toHaveBeenCalledWith(false);
      expect(setLocation).toHaveBeenCalledWith('/workspace/golden-paths', {
        replace: true,
      });
    });
  });

  it('does nothing on deep-linked workspace routes', () => {
    renderHook(() => useAutoLoadWorkspace('/workspace/application', setIsStartupOpen));

    expect(setIsStartupOpen).not.toHaveBeenCalled();
    expect(useBlueprintStore.getState().loadBundledSandbox).not.toHaveBeenCalled();
  });
});
