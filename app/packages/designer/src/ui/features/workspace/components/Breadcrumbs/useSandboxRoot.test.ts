import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useSandboxRoot } from './useSandboxRoot';
import { useBlueprintStore } from '../../../../../application/store/store';

const setLocation = vi.fn();

vi.mock('wouter', () => ({
  useLocation: () => ['/', setLocation],
}));

describe('useSandboxRoot', () => {
  beforeEach(() => {
    setLocation.mockClear();
    useBlueprintStore.setState({
      isWorkspaceOpen: false,
      sandboxKind: 'application',
      loadedSystems: [
        {
          path: 'context.yaml',
          name: 'Blueprint',
          schema: {
            name: 'Blueprint',
            version: '1.0.0',
            level: 'context',
            nodes: [],
            dependencies: [],
          },
        },
      ],
      loadBundledSandbox: vi.fn().mockResolvedValue(undefined),
    });
  });

  it('shows the sandbox root when bundled diagrams are loaded', () => {
    const { result } = renderHook(() => useSandboxRoot());
    expect(result.current.showSandboxRoot).toBe(true);
    expect(result.current.activeLabel).toBe('Application');
    expect(result.current.siblingKinds).toEqual(['infrastructure']);
  });

  it('switches sandbox kind and navigates to the context diagram', async () => {
    const loadBundledSandbox = vi.fn().mockResolvedValue(undefined);
    useBlueprintStore.setState({ loadBundledSandbox });

    const { result } = renderHook(() => useSandboxRoot());

    await act(async () => {
      await result.current.switchTo('infrastructure');
    });

    expect(loadBundledSandbox).toHaveBeenCalledWith('infrastructure');
    expect(setLocation).toHaveBeenCalledWith('/workspace/blueprint', { replace: true });
  });
});
