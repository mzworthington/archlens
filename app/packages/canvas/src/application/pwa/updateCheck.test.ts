import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { startPeriodicUpdateChecks, UPDATE_CHECK_INTERVAL_MS } from './updateCheck';

describe('startPeriodicUpdateChecks', () => {
  let visible = true;
  let onVisibilityChange: (() => void) | undefined;
  const check = vi.fn();

  beforeEach(() => {
    vi.useFakeTimers();
    visible = true;
    onVisibilityChange = undefined;
    check.mockReset();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  function start(intervalMs = UPDATE_CHECK_INTERVAL_MS) {
    return startPeriodicUpdateChecks({
      check,
      isVisible: () => visible,
      subscribeVisibility: (listener: () => void) => {
        onVisibilityChange = listener;
        return () => {
          onVisibilityChange = undefined;
        };
      },
      intervalMs,
    });
  }

  it('runs a check immediately when the tab is visible', () => {
    start();
    expect(check).toHaveBeenCalledTimes(1);
  });

  it('does not check immediately when the tab is hidden', () => {
    visible = false;
    start();
    expect(check).not.toHaveBeenCalled();
  });

  it('re-checks on the interval while the tab stays visible', () => {
    start();
    expect(check).toHaveBeenCalledTimes(1);
    vi.advanceTimersByTime(UPDATE_CHECK_INTERVAL_MS - 1);
    expect(check).toHaveBeenCalledTimes(1);
    vi.advanceTimersByTime(1);
    expect(check).toHaveBeenCalledTimes(2);
    vi.advanceTimersByTime(UPDATE_CHECK_INTERVAL_MS);
    expect(check).toHaveBeenCalledTimes(3);
  });

  it('skips interval ticks while the tab is hidden', () => {
    start();
    expect(check).toHaveBeenCalledTimes(1);
    visible = false;
    vi.advanceTimersByTime(UPDATE_CHECK_INTERVAL_MS * 2);
    expect(check).toHaveBeenCalledTimes(1);
  });

  it('checks again when the tab becomes visible', () => {
    visible = false;
    start();
    visible = true;
    onVisibilityChange?.();
    expect(check).toHaveBeenCalledTimes(1);
  });

  it('does not check when visibility fires while still hidden', () => {
    visible = false;
    start();
    onVisibilityChange?.();
    expect(check).not.toHaveBeenCalled();
  });

  it('stops interval and visibility checks after unsubscribe', () => {
    const stop = start();
    expect(check).toHaveBeenCalledTimes(1);
    stop();
    vi.advanceTimersByTime(UPDATE_CHECK_INTERVAL_MS);
    onVisibilityChange?.();
    expect(check).toHaveBeenCalledTimes(1);
  });
});
