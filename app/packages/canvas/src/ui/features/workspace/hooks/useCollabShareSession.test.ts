import { describe, it, expect, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useCollabShareSession } from './useCollabShareSession';

vi.mock('wouter', () => ({
  useLocation: () => ['/workspace/empty-workspace', vi.fn()],
  useSearch: () => '',
}));

vi.mock('../../../../application/store/store', () => ({
  useBlueprintStore: (selector: (s: Record<string, unknown>) => unknown) =>
    selector({
      setNotification: vi.fn(),
      collabPresence: { participants: [] },
      updateCollabDisplayName: vi.fn(() => true),
      endCollabRoom: vi.fn(),
    }),
}));

describe('useCollabShareSession', () => {
  it('opens the share dialog', () => {
    const { result } = renderHook(() => useCollabShareSession());

    expect(result.current.shareOpen).toBe(false);

    act(() => {
      result.current.openShareDialog();
    });

    expect(result.current.shareOpen).toBe(true);
  });
});
