import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { useBundledWorkspaceBootstrap } from './useBundledWorkspaceBootstrap';
import { useBlueprintStore } from '../../../../application/store/store';
import { resetWorkspaceOpenSessionForTests } from '../../../../application/store/workspaceOpenSession';

let mockLocation = '/workspace';
let mockParams: { '*': string } | null = { '*': '' };
const mockSetLocation = vi.fn();

vi.mock('wouter', () => ({
  useLocation: () => [mockLocation, mockSetLocation],
  useRoute: () => [true, mockParams],
}));

describe('useBundledWorkspaceBootstrap', () => {
  beforeEach(() => {
    resetWorkspaceOpenSessionForTests();
    mockLocation = '/workspace';
    mockParams = { '*': '' };
    mockSetLocation.mockClear();
    useBlueprintStore.setState({
      isWorkspaceOpen: false,
      isSampleWorkspace: false,
      isStartupOpen: false,
      loadedSystems: [],
      openBundledSample: vi.fn().mockResolvedValue(true),
    });
  });

  it('opens the startup chooser on bare /workspace instead of auto-loading demo', async () => {
    const openBundledSample = vi.fn().mockResolvedValue(true);
    useBlueprintStore.setState({ openBundledSample });

    renderHook(() => useBundledWorkspaceBootstrap());

    await waitFor(() => {
      expect(useBlueprintStore.getState().isStartupOpen).toBe(true);
    });
    expect(openBundledSample).not.toHaveBeenCalled();
    expect(mockSetLocation).not.toHaveBeenCalled();
  });

  it('auto-opens sandbox for deep-linked /workspace/<entityRef>', async () => {
    mockLocation = '/workspace/golden-journey';
    mockParams = { '*': 'golden-journey' };
    const openBundledSample = vi.fn().mockResolvedValue(true);
    useBlueprintStore.setState({ openBundledSample, isStartupOpen: true });

    renderHook(() => useBundledWorkspaceBootstrap());

    await waitFor(() => {
      expect(openBundledSample).toHaveBeenCalled();
    });
    await waitFor(() => {
      expect(useBlueprintStore.getState().isStartupOpen).toBe(false);
    });
  });

  it('does not reopen the chooser when a workspace is already open', async () => {
    useBlueprintStore.setState({
      isWorkspaceOpen: true,
      isStartupOpen: false,
      openBundledSample: vi.fn(),
    });

    renderHook(() => useBundledWorkspaceBootstrap());

    await waitFor(() => {
      expect(useBlueprintStore.getState().isStartupOpen).toBe(false);
    });
  });
});
