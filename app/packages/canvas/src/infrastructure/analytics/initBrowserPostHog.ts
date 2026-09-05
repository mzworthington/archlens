import posthog from 'posthog-js';
import {
  dropResizeObserverLoopCapture,
  type PostHogCaptureResult,
} from './dropResizeObserverLoopCapture';
import { POSTHOG_SDK_DEFAULTS, type PostHogBrowserConfig } from './posthogConfig';

export type PostHogInitClient = {
  init: (
    apiKey: string,
    options: {
      api_host: string;
      ui_host: string;
      defaults: typeof POSTHOG_SDK_DEFAULTS;
      capture_pageview: 'history_change';
      cookieless_mode: 'always';
      person_profiles: 'never';
      before_send: (event: PostHogCaptureResult | null) => PostHogCaptureResult | null;
    }
  ) => unknown;
  startExceptionAutocapture?: () => void;
};

const defaultPostHogClient: PostHogInitClient = {
  init: (apiKey, options) => {
    posthog.init(apiKey, {
      api_host: options.api_host,
      ui_host: options.ui_host,
      defaults: options.defaults,
      capture_pageview: options.capture_pageview,
      cookieless_mode: options.cookieless_mode,
      person_profiles: options.person_profiles,
      before_send: event => dropResizeObserverLoopCapture(event),
    });
  },
  startExceptionAutocapture: () => {
    posthog.startExceptionAutocapture();
  },
};

export function initBrowserPostHog(
  config: PostHogBrowserConfig,
  client: PostHogInitClient = defaultPostHogClient
): boolean {
  if (!config.enabled) {
    return false;
  }
  client.init(config.apiKey, {
    api_host: config.apiHost,
    ui_host: 'https://eu.posthog.com',
    defaults: POSTHOG_SDK_DEFAULTS,
    capture_pageview: 'history_change',
    cookieless_mode: 'always',
    person_profiles: 'never',
    before_send: dropResizeObserverLoopCapture,
  });
  client.startExceptionAutocapture?.();
  return true;
}
