import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { useBundledWorkspaceBootstrap } from './useBundledWorkspaceBootstrap';
import { useBlueprintStore } from '../../../../application/store/store';
import { resetWorkspaceOpenSessionForTests } from '../../../../application/store/workspaceOpenSession';
import { resetEmptyWorkspaceDraftSessionForTests } from '../../../../application/store/states/diagramState/emptyWorkspaceDraft';
import { persistBlankCanvasSession } from '../../../../application/store/states/ioState/blankCanvasSession';

let mockLocation = '/workspace';
let mockSearch = '';
let mockParams: { '*': string } | null = { '*': '' };
const mockSetLocation = vi.fn();

vi.mock('wouter', () => ({
  useLocation: () => [mockLocation, mockSetLocation],
  useRoute: () => [true, mockParams],
  useSearch: () => mockSearch,
}));

const namedSession = {
  filePath: 'super_amazing.yaml',
  entityRef: 'super-amazing',
  name: 'Super amazing',
  placement: 'unsaved' as const,
};

function renderBootstrap(entityRef: string, options?: { session?: boolean }) {
  if (options?.session !== false) persistBlankCanvasSession(namedSession);
  mockLocation = `/workspace/${entityRef}`;
  mockParams = { '*': entityRef };
  mockSearch = '';
  const openBundledSample = vi.fn().mockResolvedValue(true);
  const restoreEmptyWorkspaceDraft = vi.fn().mockResolvedValue(true);
  useBlueprintStore.setState({
    openBundledSample,
    restoreEmptyWorkspaceDraft,
    isWorkspaceOpen: false,
    isStartupOpen: true,
  });
  renderHook(() => useBundledWorkspaceBootstrap());
  return { openBundledSample, restoreEmptyWorkspaceDraft };
}

describe('useBundledWorkspaceBootstrap', () => {
  beforeEach(() => {
    resetWorkspaceOpenSessionForTests();
    resetEmptyWorkspaceDraftSessionForTests();
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

  it('does not auto-open sandbox for /workspace/empty-workspace', async () => {
    const { openBundledSample, restoreEmptyWorkspaceDraft } = renderBootstrap('empty-workspace', {
      session: false,
    });

    await waitFor(() => {
      expect(useBlueprintStore.getState().isStartupOpen).toBe(false);
    });
    expect(openBundledSample).not.toHaveBeenCalled();
    expect(restoreEmptyWorkspaceDraft).toHaveBeenCalledWith({
      expectedEntityRef: 'empty-workspace',
    });
  });

  it.each([
    'super-amazing',
    'super-amazing/software-system-1204',
    'empty-workspace/software-system-1204',
  ])('restores the blank canvas for /workspace/%s instead of opening Samples', async entityRef => {
    const { openBundledSample, restoreEmptyWorkspaceDraft } = renderBootstrap(entityRef);

    await waitFor(() => {
      expect(restoreEmptyWorkspaceDraft).toHaveBeenCalledWith({ expectedEntityRef: entityRef });
    });
    expect(openBundledSample).not.toHaveBeenCalled();
    expect(useBlueprintStore.getState().isStartupOpen).toBe(false);
  });

  it('still opens Samples for a nested catalog deep link outside the blank session', async () => {
    const { openBundledSample } = renderBootstrap('golden-journey/checkout');

    await waitFor(() => {
      expect(openBundledSample).toHaveBeenCalled();
    });
  });

  it('does not restore an empty-workspace draft when a collab room is present', async () => {
    mockLocation = '/workspace/empty-workspace';
    mockParams = { '*': 'empty-workspace' };
    mockSearch = '?room=abcdefgh';
    const restoreEmptyWorkspaceDraft = vi.fn().mockResolvedValue(false);
    useBlueprintStore.setState({ restoreEmptyWorkspaceDraft, isStartupOpen: true });

    renderHook(() => useBundledWorkspaceBootstrap());

    await waitFor(() => {
      expect(useBlueprintStore.getState().isStartupOpen).toBe(false);
    });
    expect(restoreEmptyWorkspaceDraft).not.toHaveBeenCalled();
  });

  it('does not auto-open sandbox when a collab room is in the query', async () => {
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
  });

  it('does not open the startup chooser when a collab room is on bare /workspace', async () => {
    mockLocation = '/workspace';
    mockParams = { '*': '' };
    mockSearch = '?room=abcdefgh';
    const openBundledSample = vi.fn().mockResolvedValue(true);
    useBlueprintStore.setState({ openBundledSample });

    renderHook(() => useBundledWorkspaceBootstrap());

    await waitFor(() => {
      expect(useBlueprintStore.getState().isStartupOpen).toBe(false);
    });
    expect(openBundledSample).not.toHaveBeenCalled();
  });

  it('does not open the startup chooser or demo when new=1 is in the query', async () => {
    mockLocation = '/workspace';
    mockParams = { '*': '' };
    mockSearch = '?new=1';
    const openBundledSample = vi.fn().mockResolvedValue(true);
    useBlueprintStore.setState({ openBundledSample, isStartupOpen: true });

    renderHook(() => useBundledWorkspaceBootstrap());

    await waitFor(() => {
      expect(useBlueprintStore.getState().isStartupOpen).toBe(false);
    });
    expect(openBundledSample).not.toHaveBeenCalled();
  });
});
