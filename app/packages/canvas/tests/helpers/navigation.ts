import type { Page } from '@playwright/test';
import { ANALYTICS_CONSENT_KEY } from '../../src/infrastructure/analytics/analyticsConsent';

export type AnalyticsConsentSeed = 'unset' | 'granted' | 'denied';

/** Navigate without waiting for every asset - tests assert on specific UI instead. */
export async function gotoApp(
  page: Page,
  path: string,
  options?: { analyticsConsent?: AnalyticsConsentSeed }
) {
  const consent = options?.analyticsConsent ?? 'denied';
  if (consent !== 'unset') {
    await page.addInitScript(
      ({ key, value }) => {
        window.localStorage.setItem(key, value);
      },
      { key: ANALYTICS_CONSENT_KEY, value: consent }
    );
  }
  await page.goto(path, { waitUntil: 'domcontentloaded' });
}

/** Leave heavy workspace routes so Playwright can tear down the browser context quickly. */
export async function releaseE2ePage(page: Page) {
  await page.goto('/', { waitUntil: 'domcontentloaded', timeout: 20_000 }).catch(() => undefined);
}
