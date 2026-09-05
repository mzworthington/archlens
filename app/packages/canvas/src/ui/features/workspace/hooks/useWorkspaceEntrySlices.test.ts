import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useBlueprintStore } from '../../../../application/store/store';
import { useWorkspaceBlankEntry } from './useWorkspaceBlankEntry';
import { useWorkspaceCopyEntry } from './useWorkspaceCopyEntry';
import { useWorkspacePersistEntry } from './useWorkspacePersistEntry';

const mockSetLocation = vi.fn();

vi.mock('wouter', () => ({
  useLocation: () => ['/workspace', mockSetLocation],
  useSearch: () => '',
}));

describe('workspace entry slices', () => {
  beforeEach(() => {
    mockSetLocation.mockClear();
    useBlueprintStore.setState({
      isStartupOpen: true,
      resetToEmptyWorkspace: vi.fn(),
      setIsStartupOpen: vi.fn(),
      setIsImportMermaidOpen: vi.fn(),
      setIsImportIacOpen: vi.fn(),
      openWorkspaceDirectory: vi.fn().mockResolvedValue(true),
      openBundledSample: vi.fn().mockResolvedValue(true),
      openBrowserLiteScan: vi.fn().mockResolvedValue(true),
      loadSchema: vi.fn().mockResolvedValue(true),
    });
  });

  it('blank slice starts an empty workspace without opening or copying', () => {
    const resetToEmptyWorkspace = vi.fn();
    const setIsStartupOpen = vi.fn();
    useBlueprintStore.setState({ resetToEmptyWorkspace, setIsStartupOpen });

    const { result } = renderHook(() => useWorkspaceBlankEntry());
    act(() => {
      result.current.startBlankCanvas();
    });

    expect(resetToEmptyWorkspace).toHaveBeenCalledTimes(1);
    expect(setIsStartupOpen).toHaveBeenCalledWith(false);
    expect(useBlueprintStore.getState().openWorkspaceDirectory).not.toHaveBeenCalled();
  });

  it('persist slice keeps the prior open-directory failure copy', async () => {
    const error = new Error('picker failed');
    const openWorkspaceDirectory = vi.fn().mockRejectedValue(error);
    useBlueprintStore.setState({ openWorkspaceDirectory });
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    const { result } = renderHook(() => useWorkspacePersistEntry({ startBlankCanvas: vi.fn() }));

    await act(async () => {
      await result.current.openDirectory();
    });

    expect(consoleSpy).toHaveBeenCalledWith('Failed to open workspace directory:', error);
    consoleSpy.mockRestore();
  });

  it('copy slice keeps the prior share-directory failure copy', async () => {
    const error = new Error('share picker failed');
    const openWorkspaceDirectory = vi.fn().mockRejectedValue(error);
    useBlueprintStore.setState({ openWorkspaceDirectory });
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    const { result } = renderHook(() => useWorkspaceCopyEntry({ startBlankCanvas: vi.fn() }));

    await act(async () => {
      await result.current.shareDirectory();
    });

    expect(consoleSpy).toHaveBeenCalledWith('Failed to open workspace directory for share:', error);
    consoleSpy.mockRestore();
  });
});
