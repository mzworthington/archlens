import posthog, { type BeforeSendFn } from 'posthog-js';
import { POSTHOG_SDK_DEFAULTS, type PostHogBrowserConfig } from './posthogConfig';

const RESIZE_OBSERVER_LOOP_MESSAGE = 'ResizeObserver loop';

// The browser reports "ResizeObserver loop completed with undelivered
// notifications" when a resize callback does not settle in one frame. React Flow
// observes the workspace canvas, so this benign warning reaches the window as a
// synthetic, unhandled exception with no stack frames. Drop it before it becomes
// an error tracking issue.
export const dropBenignBrowserExceptions: BeforeSendFn = event => {
  if (event?.event !== '$exception') {
    return event;
  }
  const exceptions = event.properties?.$exception_list;
  const isResizeObserverLoop =
    Array.isArray(exceptions) &&
    exceptions.some(
      exception =>
        typeof exception?.value === 'string' &&
        exception.value.includes(RESIZE_OBSERVER_LOOP_MESSAGE)
    );
  return isResizeObserverLoop ? null : event;
};

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
      before_send: BeforeSendFn;
    }
  ) => unknown;
  startExceptionAutocapture?: () => void;
};

const defaultPostHogClient: PostHogInitClient = {
  init: (apiKey, options) => posthog.init(apiKey, options),
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
    before_send: dropBenignBrowserExceptions,
  });
  client.startExceptionAutocapture?.();
  return true;
}
