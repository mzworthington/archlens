import { describe, expect, it, vi } from 'vitest';
import { createAnalyticsSession, type PostHogSessionClient } from './initBrowserPostHog';

function mockClient(): PostHogSessionClient {
  return {
    init: vi.fn(),
    startExceptionAutocapture: vi.fn(),
    opt_in_capturing: vi.fn(),
    opt_out_capturing: vi.fn(),
    reset: vi.fn(),
  };
}

describe('createAnalyticsSession', () => {
  it('does not call the client when analytics is disabled', () => {
    const client = mockClient();
    const session = createAnalyticsSession(client);
    expect(session.start({ enabled: false })).toBe(false);
    expect(client.init).not.toHaveBeenCalled();
    expect(client.startExceptionAutocapture).not.toHaveBeenCalled();
  });

  it('initialises cookie persistence for SPA navigation, replay and error tracking', () => {
    const client = mockClient();
    const session = createAnalyticsSession(client);
    expect(
      session.start({
        enabled: true,
        apiKey: 'phc_test',
        apiHost: 'https://a.mzworthington.co.uk',
      })
    ).toBe(true);
    expect(client.init).toHaveBeenCalledWith('phc_test', {
      api_host: 'https://a.mzworthington.co.uk',
      ui_host: 'https://eu.posthog.com',
      defaults: '2026-05-30',
      capture_pageview: 'history_change',
      persistence: 'localStorage+cookie',
      person_profiles: 'never',
      before_send: expect.any(Function),
    });
    expect(client.startExceptionAutocapture).toHaveBeenCalledOnce();
    const beforeSend = vi.mocked(client.init).mock.calls[0]?.[1]?.before_send;
    expect(beforeSend).toBeDefined();
    expect(
      beforeSend?.({
        event: '$exception',
        properties: {
          $exception_message: 'ResizeObserver loop completed with undelivered notifications.',
        },
      })
    ).toBeNull();
  });

  it('opts back in without a second init after stop', () => {
    const client = mockClient();
    const session = createAnalyticsSession(client);
    const config = {
      enabled: true as const,
      apiKey: 'phc_test',
      apiHost: 'https://a.mzworthington.co.uk',
    };
    session.start(config);
    session.stop();
    expect(client.opt_out_capturing).toHaveBeenCalledOnce();
    expect(client.reset).toHaveBeenCalledOnce();
    session.start(config);
    expect(client.init).toHaveBeenCalledOnce();
    expect(client.opt_in_capturing).toHaveBeenCalledOnce();
  });

  it('does not opt out when tracking never started', () => {
    const client = mockClient();
    createAnalyticsSession(client).stop();
    expect(client.opt_out_capturing).not.toHaveBeenCalled();
    expect(client.reset).not.toHaveBeenCalled();
  });
});
