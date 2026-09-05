import { describe, expect, it, vi } from 'vitest';
import { initBrowserPostHog } from './initBrowserPostHog';
import { dropResizeObserverLoopExceptions } from './resizeObserverLoopError';

describe('initBrowserPostHog', () => {
  it('does not call the client when analytics is disabled', () => {
    const init = vi.fn();
    const startExceptionAutocapture = vi.fn();
    const suppressLayoutErrors = vi.fn();
    expect(
      initBrowserPostHog(
        { enabled: false },
        { init, startExceptionAutocapture },
        suppressLayoutErrors
      )
    ).toBe(false);
    expect(suppressLayoutErrors).toHaveBeenCalledOnce();
    expect(init).not.toHaveBeenCalled();
    expect(startExceptionAutocapture).not.toHaveBeenCalled();
  });

  it('initialises the client for SPA navigation, replay and error tracking', () => {
    const init = vi.fn();
    const startExceptionAutocapture = vi.fn();
    const suppressLayoutErrors = vi.fn();
    expect(
      initBrowserPostHog(
        {
          enabled: true,
          apiKey: 'phc_test',
          apiHost: 'https://a.mzworthington.co.uk',
        },
        { init, startExceptionAutocapture },
        suppressLayoutErrors
      )
    ).toBe(true);
    expect(suppressLayoutErrors).toHaveBeenCalledOnce();
    expect(init).toHaveBeenCalledWith('phc_test', {
      api_host: 'https://a.mzworthington.co.uk',
      ui_host: 'https://eu.posthog.com',
      defaults: '2026-05-30',
      capture_pageview: 'history_change',
      cookieless_mode: 'always',
      person_profiles: 'never',
      before_send: dropResizeObserverLoopExceptions,
    });
    expect(startExceptionAutocapture).toHaveBeenCalledOnce();
    expect(suppressLayoutErrors.mock.invocationCallOrder[0]).toBeLessThan(
      init.mock.invocationCallOrder[0]
    );
    expect(init.mock.invocationCallOrder[0]).toBeLessThan(
      startExceptionAutocapture.mock.invocationCallOrder[0]
    );
  });
});
