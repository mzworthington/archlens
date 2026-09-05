import posthog from 'posthog-js';
import {
  dropResizeObserverLoopCapture,
  type PostHogCaptureResult,
} from './dropResizeObserverLoopCapture';
import { POSTHOG_SDK_DEFAULTS, type PostHogBrowserConfig } from './posthogConfig';

export type PostHogInitOptions = {
  api_host: string;
  ui_host: string;
  defaults: typeof POSTHOG_SDK_DEFAULTS;
  capture_pageview: 'history_change';
  persistence: 'localStorage+cookie';
  person_profiles: 'never';
  before_send: (event: PostHogCaptureResult | null) => PostHogCaptureResult | null;
};

export type PostHogSessionClient = {
  init: (apiKey: string, options: PostHogInitOptions) => unknown;
  startExceptionAutocapture?: () => void;
  opt_in_capturing?: () => void;
  opt_out_capturing?: () => void;
  reset?: () => void;
};

const defaultPostHogClient: PostHogSessionClient = {
  init: (apiKey, options) => {
    posthog.init(apiKey, {
      api_host: options.api_host,
      ui_host: options.ui_host,
      defaults: options.defaults,
      capture_pageview: options.capture_pageview,
      persistence: options.persistence,
      person_profiles: options.person_profiles,
      before_send: event => dropResizeObserverLoopCapture(event),
    });
  },
  startExceptionAutocapture: () => {
    posthog.startExceptionAutocapture();
  },
  opt_in_capturing: () => {
    posthog.opt_in_capturing();
  },
  opt_out_capturing: () => {
    posthog.opt_out_capturing();
  },
  reset: () => {
    posthog.reset();
  },
};

export type AnalyticsSession = {
  start: (config: PostHogBrowserConfig) => boolean;
  stop: () => void;
};

export function createAnalyticsSession(
  client: PostHogSessionClient = defaultPostHogClient
): AnalyticsSession {
  let started = false;
  return {
    start(config) {
      if (!config.enabled) {
        return false;
      }
      if (started) {
        client.opt_in_capturing?.();
        return true;
      }
      client.init(config.apiKey, {
        api_host: config.apiHost,
        ui_host: 'https://eu.posthog.com',
        defaults: POSTHOG_SDK_DEFAULTS,
        capture_pageview: 'history_change',
        persistence: 'localStorage+cookie',
        person_profiles: 'never',
        before_send: dropResizeObserverLoopCapture,
      });
      client.startExceptionAutocapture?.();
      started = true;
      return true;
    },
    stop() {
      if (!started) {
        return;
      }
      client.opt_out_capturing?.();
      client.reset?.();
    },
  };
}
