import { describe, expect, it } from 'vitest';
import { dropBenignBrowserExceptionCapture } from './dropResizeObserverLoopCapture';

describe('dropBenignBrowserExceptionCapture', () => {
  it('drops $exception events for a failed service worker script fetch', () => {
    expect(
      dropBenignBrowserExceptionCapture({
        event: '$exception',
        properties: {
          $exception_message:
            "Failed to update a ServiceWorker for scope ('https://archlens.dev/') with script ('https://archlens.dev/sw.js'): An unknown error occurred when fetching the script.",
        },
      })
    ).toBeNull();
  });

  it('drops $exception events for a synthetic service worker install failure', () => {
    expect(
      dropBenignBrowserExceptionCapture({
        event: '$exception',
        properties: {
          $exception_list: [
            {
              type: 'TypeError',
              value:
                'ServiceWorker script at https://archlens.dev/sw.js for scope https://archlens.dev/ encountered an error during installation.',
            },
          ],
        },
      })
    ).toBeNull();
  });

  it('drops $exception events that only expose $exception_values (PostHog before_send shape)', () => {
    expect(
      dropBenignBrowserExceptionCapture({
        event: '$exception',
        properties: {
          $exception_types: ['TypeError'],
          $exception_values: [
            'ServiceWorker script at https://archlens.dev/sw.js for scope https://archlens.dev/ encountered an error during installation.',
          ],
        },
      })
    ).toBeNull();
  });

  it('still drops ResizeObserver loop notifications', () => {
    expect(
      dropBenignBrowserExceptionCapture({
        event: '$exception',
        properties: {
          $exception_message: 'ResizeObserver loop completed with undelivered notifications.',
        },
      })
    ).toBeNull();
  });

  it('keeps a Chrome ServiceWorker MIME TypeError', () => {
    const capture = {
      event: '$exception',
      properties: {
        $exception_message:
          "Failed to update a ServiceWorker for scope ('https://archlens.dev/') with script ('https://archlens.dev/sw.js'): The script has an unsupported MIME type ('text/html').",
      },
    };
    expect(dropBenignBrowserExceptionCapture(capture)).toEqual(capture);
  });

  it('keeps unrelated $exception events', () => {
    const capture = {
      event: '$exception',
      properties: {
        $exception_message: 'TypeError: Failed to fetch',
      },
    };
    expect(dropBenignBrowserExceptionCapture(capture)).toEqual(capture);
  });
});
