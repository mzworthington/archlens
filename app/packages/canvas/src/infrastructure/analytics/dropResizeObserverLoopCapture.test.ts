import { describe, expect, it } from 'vitest';
import { dropResizeObserverLoopCapture } from './dropResizeObserverLoopCapture';

describe('dropResizeObserverLoopCapture', () => {
  it('drops $exception events whose message is a ResizeObserver loop', () => {
    expect(
      dropResizeObserverLoopCapture({
        event: '$exception',
        properties: {
          $exception_message: 'ResizeObserver loop completed with undelivered notifications.',
        },
      })
    ).toBeNull();
  });

  it('drops $exception events whose exception list value is a ResizeObserver loop', () => {
    expect(
      dropResizeObserverLoopCapture({
        event: '$exception',
        properties: {
          $exception_list: [
            {
              type: 'Error',
              value: 'ResizeObserver loop limit exceeded',
            },
          ],
        },
      })
    ).toBeNull();
  });

  it('keeps other $exception events', () => {
    const capture = {
      event: '$exception',
      properties: {
        $exception_message: 'TypeError: Failed to fetch',
      },
    };
    expect(dropResizeObserverLoopCapture(capture)).toEqual(capture);
  });

  it('keeps non-exception events', () => {
    const capture = { event: '$pageview', properties: { $current_url: 'https://archlens.dev/' } };
    expect(dropResizeObserverLoopCapture(capture)).toEqual(capture);
  });

  it('passes through a null capture', () => {
    expect(dropResizeObserverLoopCapture(null)).toBeNull();
  });
});
