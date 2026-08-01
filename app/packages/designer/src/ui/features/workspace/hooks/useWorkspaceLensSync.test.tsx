import { describe, it, expect, beforeEach } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';
import { Router } from 'wouter';
import { memoryLocation } from 'wouter/memory-location';
import type { ReactNode } from 'react';
import { useBlueprintStore } from '../../../../application/store/store';
import { useWorkspaceLensSync } from './useWorkspaceLensSync';

function wrap(hook: ReturnType<typeof memoryLocation>['hook']) {
  return ({ children }: { children: ReactNode }) => <Router hook={hook}>{children}</Router>;
}

describe('useWorkspaceLensSync', () => {
  beforeEach(() => {
    useBlueprintStore.setState({
      isResilienceMode: false,
      isTraceLensMode: false,
      resilienceFaults: [],
      selectedNodeId: null,
    });
  });

  it('enables ChaosLens and applies faults from the URL', async () => {
    const { hook } = memoryLocation({
      path: '/workspace/shop?lens=chaoslens&fault=shop/api&type=latency&severity=0.55',
    });

    renderHook(() => useWorkspaceLensSync(), { wrapper: wrap(hook) });

    await waitFor(() => {
      expect(useBlueprintStore.getState().isResilienceMode).toBe(true);
    });
    expect(useBlueprintStore.getState().resilienceFaults).toEqual([
      { nodeId: 'shop/api', faultType: 'latency', severity: 0.55 },
    ]);
  });

  it('redirects legacy resilience=1 to sticky lens=chaoslens', async () => {
    const mem = memoryLocation({
      path: '/workspace/application?resilience=1',
      record: true,
    });

    renderHook(() => useWorkspaceLensSync(), { wrapper: wrap(mem.hook) });

    await waitFor(() => {
      expect(mem.history?.[mem.history.length - 1]).toBe('/workspace/application?lens=chaoslens');
    });
    await waitFor(() => {
      expect(useBlueprintStore.getState().isResilienceMode).toBe(true);
    });
  });

  it('writes ChaosLens query params when resilience mode is enabled', async () => {
    const mem = memoryLocation({ path: '/workspace/shop', record: true });

    renderHook(() => useWorkspaceLensSync(), { wrapper: wrap(mem.hook) });

    act(() => {
      useBlueprintStore.getState().setResilienceMode(true);
    });

    await waitFor(() => {
      expect(mem.history?.[mem.history.length - 1]).toBe('/workspace/shop?lens=chaoslens');
    });
  });
});
