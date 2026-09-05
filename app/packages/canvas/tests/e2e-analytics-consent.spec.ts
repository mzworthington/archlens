import { expect, test } from '@playwright/test';
import { ANALYTICS_CONSENT_KEY } from '../src/infrastructure/analytics/analyticsConsent';
import { gotoApp } from './helpers/navigation';

test.describe('analytics consent', () => {
  test('asks once, then remembers a decline', async ({ page }) => {
    await gotoApp(page, '/', { analyticsConsent: 'unset' });
    const dialog = page.getByRole('dialog', { name: /help us improve archlens/i });
    await expect(dialog).toBeVisible();
    await expect(dialog).toContainText(/product analytics/i);
    await page.getByRole('button', { name: "Don't track me" }).click();
    await expect(dialog).toBeHidden();
    expect(await page.evaluate(key => localStorage.getItem(key), ANALYTICS_CONSENT_KEY)).toBe(
      'denied'
    );
    await page.reload({ waitUntil: 'domcontentloaded' });
    await expect(page.getByRole('dialog', { name: /help us improve archlens/i })).toHaveCount(0);
  });

  test('opt-in is reversible from the privacy page', async ({ page }) => {
    await gotoApp(page, '/privacy', { analyticsConsent: 'granted' });
    const preference = page.getByTestId('analytics-preference');
    await expect(preference).toBeVisible();
    await expect(preference).toContainText(/opted in/i);
    await page.getByRole('button', { name: 'Stop tracking' }).click();
    await expect(preference).toContainText(/not to be tracked/i);
    expect(await page.evaluate(key => localStorage.getItem(key), ANALYTICS_CONSENT_KEY)).toBe(
      'denied'
    );
  });
});
