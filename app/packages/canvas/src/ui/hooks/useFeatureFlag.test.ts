import { describe, expect, it, afterEach } from 'vitest';
import { act, renderHook } from '@testing-library/react';
import {
  COLLABORATION_FEATURE,
  featureStorageKey,
  setFeatureEnabled,
} from '../../application/navigation/featureGate';
import { useFeatureFlag } from './useFeatureFlag';

afterEach(() => {
  localStorage.removeItem(featureStorageKey(COLLABORATION_FEATURE));
});

describe('useFeatureFlag', () => {
  it('re-renders when the flag is toggled in this tab', () => {
    const { result } = renderHook(() => useFeatureFlag(COLLABORATION_FEATURE));
    expect(result.current).toBe(false);

    act(() => {
      setFeatureEnabled(COLLABORATION_FEATURE, true);
    });
    expect(result.current).toBe(true);

    act(() => {
      setFeatureEnabled(COLLABORATION_FEATURE, false);
    });
    expect(result.current).toBe(false);
  });
});
