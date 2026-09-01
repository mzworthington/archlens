import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { useBundledWorkspaceBootstrap } from './useBundledWorkspaceBootstrap';
import { useBlueprintStore } from '../../../../application/store/store';
import { resetWorkspaceOpenSessionForTests } from '../../../../application/store/workspaceOpenSession';
import {
  COLLABORATION_FEATURE,
  featureStorageKey,
} from '../../../../application/navigation/featureGate';

let mockLocation = '/workspace';
let mockSearch = '';
let mockParams: { '*': string } | null = { '*': '' };
const mockSetLocation = vi.fn();

vi.mock('wouter', () => ({
  useLocation: () => [mockLocation, mockSetLocation],
  useRoute: () => [true, mockParams],
  useSearch: () => mockSearch,
}));

describe('useBundledWorkspaceBootstrap', () => {
  beforeEach(() => {
    resetWorkspaceOpenSessionForTests();
    localStorage.removeItem(featureStorageKey(COLLABORATION_FEATURE));
    mockLocation = '/workspace';
    mockSearch = '';
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

  it('opens the startup chooser on /workspace/ trailing slash without looping', async () => {
    mockLocation = '/workspace/';
    mockParams = { '*': '' };
    const openBundledSample = vi.fn().mockResolvedValue(true);
    useBlueprintStore.setState({ openBundledSample });

    const { rerender } = renderHook(() => useBundledWorkspaceBootstrap());
    // Simulate wouter returning a new params object identity each render.
    mockParams = { '*': '' };
    rerender();
    mockParams = { '*': '' };
    rerender();

    await waitFor(() => {
      expect(useBlueprintStore.getState().isStartupOpen).toBe(true);
    });
    expect(openBundledSample).not.toHaveBeenCalled();
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

  it('does not auto-open sandbox for /workspace/empty-workspace when collab is enabled', async () => {
    mockLocation = '/workspace/empty-workspace';
    mockParams = { '*': 'empty-workspace' };
    mockSearch = '';
    localStorage.setItem(featureStorageKey(COLLABORATION_FEATURE), '1');
    const openBundledSample = vi.fn().mockResolvedValue(true);
    useBlueprintStore.setState({ openBundledSample, isStartupOpen: true });

    renderHook(() => useBundledWorkspaceBootstrap());

    await waitFor(() => {
      expect(useBlueprintStore.getState().isStartupOpen).toBe(false);
    });
    expect(openBundledSample).not.toHaveBeenCalled();
  });

  it('does not auto-open sandbox when a collab room is in the query without the flag already on', async () => {
    mockLocation = '/workspace/golden-journey';
    mockParams = { '*': 'golden-journey' };
    mockSearch = '?room=b361b20b-f34f-4bbe-935e-f39c0f6aea44';
    const openBundledSample = vi.fn().mockResolvedValue(true);
    useBlueprintStore.setState({ openBundledSample, isStartupOpen: true });

    renderHook(() => useBundledWorkspaceBootstrap());

    await waitFor(() => {
      expect(useBlueprintStore.getState().isStartupOpen).toBe(false);
    });
    expect(openBundledSample).not.toHaveBeenCalled();
    expect(localStorage.getItem(featureStorageKey(COLLABORATION_FEATURE))).toBe('1');
  });

  it('does not open the startup chooser when a collab room is on bare /workspace', async () => {
    mockLocation = '/workspace';
    mockParams = { '*': '' };
    mockSearch = '?room=abcdefgh';
    localStorage.setItem(featureStorageKey(COLLABORATION_FEATURE), '1');
    const openBundledSample = vi.fn().mockResolvedValue(true);
    useBlueprintStore.setState({ openBundledSample });

    renderHook(() => useBundledWorkspaceBootstrap());

    await waitFor(() => {
      expect(useBlueprintStore.getState().isStartupOpen).toBe(false);
    });
    expect(openBundledSample).not.toHaveBeenCalled();
  });
});
