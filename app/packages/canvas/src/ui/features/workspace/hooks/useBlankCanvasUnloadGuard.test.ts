import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useBlankCanvasUnloadGuard } from './useBlankCanvasUnloadGuard';
import { useBlueprintStore } from '../../../../application/store/store';

describe('useBlankCanvasUnloadGuard', () => {
  beforeEach(() => {
    useBlueprintStore.setState({
      isWorkspaceOpen: false,
      nodes: [{ id: 'n1', position: { x: 0, y: 0 }, data: {} } as never],
    });
  });

  afterEach(() => {
    useBlueprintStore.setState({ isWorkspaceOpen: false, nodes: [] });
  });

  it('prevents unload when the blank canvas has nodes and no folder is open', () => {
    renderHook(() => useBlankCanvasUnloadGuard());
    const event = new Event('beforeunload', { cancelable: true }) as BeforeUnloadEvent;
    Object.defineProperty(event, 'returnValue', { writable: true, value: '' });

    window.dispatchEvent(event);

    expect(event.defaultPrevented).toBe(true);
  });

  it('does not prevent unload on a truly empty canvas', () => {
    useBlueprintStore.setState({ nodes: [] });
    renderHook(() => useBlankCanvasUnloadGuard());
    const event = new Event('beforeunload', { cancelable: true }) as BeforeUnloadEvent;

    window.dispatchEvent(event);

    expect(event.defaultPrevented).toBe(false);
  });
});
