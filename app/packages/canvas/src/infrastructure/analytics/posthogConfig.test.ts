import { describe, expect, it, vi } from 'vitest';
import {
  DEFAULT_POSTHOG_HOST,
  MISSING_POSTHOG_KEY_MESSAGE,
  POSTHOG_HOST_VAR,
  POSTHOG_KEY_VAR,
  resolvePostHogConfig,
} from './posthogConfig';

describe('resolvePostHogConfig', () => {
  it('disables capture when the project key is missing', () => {
    expect(
      resolvePostHogConfig({
        [POSTHOG_KEY_VAR]: '',
        DEV: false,
        MODE: 'production',
      })
    ).toEqual({ enabled: false });
  });

  it('uses the shared reverse-proxy ingest host when the host env is unset', () => {
    expect(DEFAULT_POSTHOG_HOST).toBe('https://a.mzworthington.co.uk');
    expect(
      resolvePostHogConfig({
        [POSTHOG_KEY_VAR]: 'phc_test',
        DEV: false,
        MODE: 'production',
      })
    ).toEqual({
      enabled: true,
      apiKey: 'phc_test',
      apiHost: DEFAULT_POSTHOG_HOST,
    });
  });

  it(`honours ${POSTHOG_HOST_VAR}`, () => {
    expect(
      resolvePostHogConfig({
        [POSTHOG_KEY_VAR]: 'phc_test',
        [POSTHOG_HOST_VAR]: 'https://us.i.posthog.com',
        DEV: false,
        MODE: 'production',
      })
    ).toEqual({
      enabled: true,
      apiKey: 'phc_test',
      apiHost: 'https://us.i.posthog.com',
    });
  });

  it('reports the missing-key message in development without throwing', () => {
    const onMissingInDev = vi.fn();
    expect(
      resolvePostHogConfig(
        {
          DEV: true,
          MODE: 'development',
        },
        { onMissingInDev }
      )
    ).toEqual({ enabled: false });
    expect(onMissingInDev).toHaveBeenCalledWith(MISSING_POSTHOG_KEY_MESSAGE);
  });

  it('does not report missing keys in production or tests', () => {
    const onMissingInDev = vi.fn();
    resolvePostHogConfig({ DEV: false, MODE: 'production' }, { onMissingInDev });
    resolvePostHogConfig({ DEV: true, MODE: 'test' }, { onMissingInDev });
    expect(onMissingInDev).not.toHaveBeenCalled();
  });
});
