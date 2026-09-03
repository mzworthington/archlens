export const POSTHOG_KEY_VAR = 'POSTHOG_TOKEN';
export const POSTHOG_HOST_VAR = 'POSTHOG_HOST';
export const DEFAULT_POSTHOG_HOST = 'https://a.mzworthington.co.uk';
export const POSTHOG_SDK_DEFAULTS = '2026-05-30';

export const MISSING_POSTHOG_KEY_MESSAGE = `${POSTHOG_KEY_VAR} variable required by PostHog is missing or un-configured, this causes events to be silently missed. This error stops appearing once ${POSTHOG_KEY_VAR} is configured`;

export type PostHogEnv = {
  POSTHOG_TOKEN?: string;
  POSTHOG_HOST?: string;
  DEV?: boolean;
  MODE?: string;
};

export type PostHogBrowserConfig =
  { enabled: false } | { enabled: true; apiKey: string; apiHost: string };

export function resolvePostHogConfig(
  env: PostHogEnv,
  options?: { onMissingInDev?: (message: string) => void }
): PostHogBrowserConfig {
  const apiKey = env.POSTHOG_TOKEN?.trim() ?? '';
  if (apiKey === '') {
    if (env.DEV === true && env.MODE === 'development') {
      options?.onMissingInDev?.(MISSING_POSTHOG_KEY_MESSAGE);
    }
    return { enabled: false };
  }
  const apiHost = env.POSTHOG_HOST?.trim() || DEFAULT_POSTHOG_HOST;
  return { enabled: true, apiKey, apiHost };
}
