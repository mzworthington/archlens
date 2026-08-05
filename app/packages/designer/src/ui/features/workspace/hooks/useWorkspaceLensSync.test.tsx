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
      isChaosSpecPickerOpen: false,
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

  it('keeps faults when the user adds one before the URL has caught up', async () => {
    const mem = memoryLocation({ path: '/workspace/shop?lens=chaoslens', record: true });

    renderHook(() => useWorkspaceLensSync(), { wrapper: wrap(mem.hook) });

    await waitFor(() => {
      expect(useBlueprintStore.getState().isResilienceMode).toBe(true);
    });

    act(() => {
      useBlueprintStore.setState({
        selectedNodeId: 'shop/api',
        resilienceFaultType: 'region-outage',
        resilienceSeverity: 1,
      });
      useBlueprintStore.getState().addResilienceFaultFromDraft();
    });

    expect(useBlueprintStore.getState().resilienceFaults).toEqual([
      { nodeId: 'shop/api', faultType: 'region-outage', severity: 1 },
    ]);

    await waitFor(() => {
      expect(mem.history?.[mem.history.length - 1]).toContain('fault=shop%2Fapi');
    });

    expect(useBlueprintStore.getState().resilienceFaults).toEqual([
      { nodeId: 'shop/api', faultType: 'region-outage', severity: 1 },
    ]);
  });

  it('opens ChaosSpec picker from browse=chaosspecs and keeps it in the URL', async () => {
    const mem = memoryLocation({
      path: '/workspace/samples?lens=chaoslens&browse=chaosspecs',
      record: true,
    });

    renderHook(() => useWorkspaceLensSync(), { wrapper: wrap(mem.hook) });

    await waitFor(() => {
      expect(useBlueprintStore.getState().isResilienceMode).toBe(true);
      expect(useBlueprintStore.getState().isChaosSpecPickerOpen).toBe(true);
    });

    act(() => {
      useBlueprintStore.getState().closeChaosSpecPicker();
    });

    await waitFor(() => {
      expect(mem.history?.[mem.history.length - 1]).toBe('/workspace/samples?lens=chaoslens');
    });
  });

  it('writes browse=chaosspecs when the ChaosSpec picker opens', async () => {
    const mem = memoryLocation({ path: '/workspace/samples?lens=chaoslens', record: true });

    renderHook(() => useWorkspaceLensSync(), { wrapper: wrap(mem.hook) });

    await waitFor(() => {
      expect(useBlueprintStore.getState().isResilienceMode).toBe(true);
    });

    act(() => {
      useBlueprintStore.getState().openChaosSpecPicker();
    });

    await waitFor(() => {
      expect(mem.history?.[mem.history.length - 1]).toBe(
        '/workspace/samples?lens=chaoslens&browse=chaosspecs'
      );
    });
  });
});
