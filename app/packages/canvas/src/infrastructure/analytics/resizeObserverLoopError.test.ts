import { describe, expect, it, vi } from 'vitest';
import {
  dropResizeObserverLoopExceptions,
  exceptionTextsFromProperties,
  isResizeObserverLoopError,
  suppressResizeObserverLoopErrors,
} from './resizeObserverLoopError';

describe('isResizeObserverLoopError', () => {
  it('matches Chromium ResizeObserver loop notifications', () => {
    expect(
      isResizeObserverLoopError('ResizeObserver loop completed with undelivered notifications.')
    ).toBe(true);
    expect(isResizeObserverLoopError('ResizeObserver loop limit exceeded')).toBe(true);
  });

  it('does not match unrelated failures', () => {
    expect(isResizeObserverLoopError('TypeError: Failed to fetch')).toBe(false);
    expect(isResizeObserverLoopError('ResizeObserver is not defined')).toBe(false);
  });
});

describe('exceptionTextsFromProperties', () => {
  it('reads PostHog exception message and list values', () => {
    expect(
      exceptionTextsFromProperties({
        $exception_message: 'ResizeObserver loop limit exceeded',
        $exception_list: [{ type: 'Error', value: 'ResizeObserver loop limit exceeded' }],
      })
    ).toEqual(['ResizeObserver loop limit exceeded', 'ResizeObserver loop limit exceeded']);
  });
});

describe('dropResizeObserverLoopExceptions', () => {
  it('drops $exception events whose message is a ResizeObserver loop', () => {
    expect(
      dropResizeObserverLoopExceptions({
        event: '$exception',
        properties: {
          $exception_message: 'ResizeObserver loop completed with undelivered notifications.',
        },
      })
    ).toBeNull();
  });

  it('keeps other $exception clusters and non-exception events', () => {
    const productException = {
      event: '$exception',
      properties: { $exception_message: 'TypeError: Failed to fetch' },
    };
    const pageview = { event: '$pageview', properties: { $current_url: 'https://archlens.dev/' } };
    expect(dropResizeObserverLoopExceptions(productException)).toEqual(productException);
    expect(dropResizeObserverLoopExceptions(pageview)).toEqual(pageview);
    expect(dropResizeObserverLoopExceptions(null)).toBeNull();
  });
});

describe('suppressResizeObserverLoopErrors', () => {
  it('handles ResizeObserver loop onerror so the SDK does not see an uncaught error', () => {
    const previous = vi.fn(() => false);
    const target = {
      onerror: previous as OnErrorEventHandler,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    };

    const restore = suppressResizeObserverLoopErrors(target);
    expect(
      target.onerror?.(
        'ResizeObserver loop completed with undelivered notifications.',
        '',
        0,
        0,
        new Error('ResizeObserver loop completed with undelivered notifications.')
      )
    ).toBe(true);
    expect(previous).not.toHaveBeenCalled();

    expect(
      target.onerror?.('TypeError: Failed to fetch', '', 1, 1, new Error('Failed to fetch'))
    ).toBe(false);
    expect(previous).toHaveBeenCalledOnce();

    restore();
    expect(target.onerror).toBe(previous);
  });

  it('prevents the capture-phase error event from remaining uncaught', () => {
    const listeners = new Set<(event: Event) => void>();
    const target = {
      onerror: null as OnErrorEventHandler,
      addEventListener: (_type: string, listener: (event: Event) => void) => {
        listeners.add(listener);
      },
      removeEventListener: (_type: string, listener: (event: Event) => void) => {
        listeners.delete(listener);
      },
    };

    suppressResizeObserverLoopErrors(target);
    const event = new ErrorEvent('error', {
      message: 'ResizeObserver loop limit exceeded',
      cancelable: true,
    });
    const preventDefault = vi.spyOn(event, 'preventDefault');
    const stopImmediatePropagation = vi.spyOn(event, 'stopImmediatePropagation');
    for (const listener of listeners) {
      listener(event);
    }
    expect(preventDefault).toHaveBeenCalledOnce();
    expect(stopImmediatePropagation).toHaveBeenCalledOnce();
  });
});
