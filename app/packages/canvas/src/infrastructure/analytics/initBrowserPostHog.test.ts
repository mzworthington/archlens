import { describe, expect, it, vi } from 'vitest';
import { initBrowserPostHog } from './initBrowserPostHog';

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
    });
    expect(startExceptionAutocapture).toHaveBeenCalledOnce();
  });
});
