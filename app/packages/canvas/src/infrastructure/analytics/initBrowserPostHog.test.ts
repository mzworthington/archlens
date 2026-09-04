import { describe, expect, it, vi } from 'vitest';
import type { CaptureResult } from 'posthog-js';
import { dropBenignBrowserExceptions, initBrowserPostHog } from './initBrowserPostHog';

function exceptionEvent(value: string): CaptureResult {
  return {
    uuid: 'test-uuid',
    event: '$exception',
    properties: { $exception_list: [{ value, mechanism: { synthetic: true, handled: false } }] },
  };
}

describe('initBrowserPostHog', () => {
  it('does not call the client when analytics is disabled', () => {
    const init = vi.fn();
    const startExceptionAutocapture = vi.fn();
    expect(initBrowserPostHog({ enabled: false }, { init, startExceptionAutocapture })).toBe(false);
    expect(init).not.toHaveBeenCalled();
    expect(startExceptionAutocapture).not.toHaveBeenCalled();
  });

  it('initialises the client for SPA navigation, replay, and error tracking', () => {
    const init = vi.fn();
    const startExceptionAutocapture = vi.fn();
    expect(
      initBrowserPostHog(
        {
          enabled: true,
          apiKey: 'phc_test',
          apiHost: 'https://a.mzworthington.co.uk',
        },
        { init, startExceptionAutocapture }
      )
    ).toBe(true);
    expect(init).toHaveBeenCalledWith('phc_test', {
      api_host: 'https://a.mzworthington.co.uk',
      ui_host: 'https://eu.posthog.com',
      defaults: '2026-05-30',
      capture_pageview: 'history_change',
      cookieless_mode: 'always',
      person_profiles: 'never',
      before_send: dropBenignBrowserExceptions,
    });
    expect(startExceptionAutocapture).toHaveBeenCalledOnce();
  });
});

describe('dropBenignBrowserExceptions', () => {
  it('drops the ResizeObserver loop notification', () => {
    const event = exceptionEvent('ResizeObserver loop completed with undelivered notifications');
    expect(dropBenignBrowserExceptions(event)).toBeNull();
  });

  it('keeps a real application exception', () => {
    const event = exceptionEvent('Cannot read properties of undefined');
    expect(dropBenignBrowserExceptions(event)).toBe(event);
  });

  it('keeps non-exception events', () => {
    const event: CaptureResult = { uuid: 'test-uuid', event: '$pageview', properties: {} };
    expect(dropBenignBrowserExceptions(event)).toBe(event);
  });

  it('passes a null event through', () => {
    expect(dropBenignBrowserExceptions(null)).toBeNull();
  });
});
