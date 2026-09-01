import { describe, expect, it, afterEach } from 'vitest';
import { act, renderHook } from '@testing-library/react';
import { featureStorageKey, setFeatureEnabled } from '../../application/navigation/featureGate';
import { useFeatureFlag } from './useFeatureFlag';

afterEach(() => {
  localStorage.removeItem(featureStorageKey('widgets'));
});

describe('useFeatureFlag', () => {
  it('re-renders when the flag is toggled in this tab', () => {
    const { result } = renderHook(() => useFeatureFlag('widgets'));
    expect(result.current).toBe(false);

    act(() => {
      setFeatureEnabled('widgets', true);
    });
    expect(result.current).toBe(true);

    act(() => {
      setFeatureEnabled('widgets', false);
    });
    expect(result.current).toBe(false);
  });
});
