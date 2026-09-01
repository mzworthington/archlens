import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useCollabShareSession } from './useCollabShareSession';
import {
  COLLABORATION_FEATURE,
  featureStorageKey,
  isFeatureEnabled,
  setFeatureEnabled,
} from '../../../../application/navigation/featureGate';

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
    }),
}));

describe('useCollabShareSession', () => {
  beforeEach(() => {
    localStorage.removeItem(featureStorageKey(COLLABORATION_FEATURE));
  });

  afterEach(() => {
    setFeatureEnabled(COLLABORATION_FEATURE, false);
  });

  it('enables the collaboration feature flag when opening the share dialog', () => {
    const { result } = renderHook(() => useCollabShareSession());

    expect(isFeatureEnabled(COLLABORATION_FEATURE)).toBe(false);

    act(() => {
      result.current.openShareDialog();
    });

    expect(isFeatureEnabled(COLLABORATION_FEATURE)).toBe(true);
    expect(result.current.shareOpen).toBe(true);
  });
});
