import { test, expect } from '@playwright/test';
import { expectCanvasReady } from './helpers/canvas';
import { continueWithSample } from './helpers/toolbar';
import { gotoApp } from './helpers/navigation';

const rev2Manifest = JSON.stringify({
  revision: 'e2e-rev2',
  publishedAt: '2026-08-10T12:00:00.000Z',
  snapshotPrefix: 'snapshots/e2e-rev2/',
});

async function publishLatest(body: string | null) {
  await fetch('http://127.0.0.1:5199/__e2e/latest', {
    method: 'POST',
    body: body ?? '',
  });
}

/**
 * Publish→consume (Canvas side): ADR-0010 remote catalog via fixture server.
 * Requires playwright.remote-catalog.config.ts (Vite with VITE_REMOTE_CATALOG_BASE_URL).
 */
test.describe('Remote catalog consume', () => {
  test.beforeAll(async () => {
    await publishLatest(null);
  });

  test('Open demo loads remote fixture diagram', async ({ page }) => {
    test.setTimeout(180_000);
    await gotoApp(page, '/workspace');
    await continueWithSample(page);

    await expect(page).toHaveURL(/\/workspace\/samples(?:\/|$)/);
    await expectCanvasReady(page);
    await expect(page.getByText('E2E Remote Probe', { exact: true }).first()).toBeVisible({
      timeout: 60_000,
    });
    await expect(page.getByText('E2E Remote Catalog').first()).toBeVisible();
  });

  test('refresh loads a newer snapshot without a full page reload', async ({ page }) => {
    test.setTimeout(180_000);
    await publishLatest(null);
    try {
      await gotoApp(page, '/workspace');
      await continueWithSample(page);
      await expectCanvasReady(page);
      await expect(page.getByText('E2E Remote Probe', { exact: true }).first()).toBeVisible({
        timeout: 60_000,
      });
      await page.evaluate(() => {
        (window as Window & { __archlensStay?: string }).__archlensStay = 'stay';
      });

      await publishLatest(rev2Manifest);
      await page.evaluate(() => window.dispatchEvent(new Event('focus')));
      const offer = page.getByRole('status', { name: 'Newer snapshot available' });
      await expect(offer).toBeVisible({ timeout: 15_000 });
      await offer.getByRole('button', { name: 'Refresh in place' }).evaluate(button => {
        (button as HTMLButtonElement).click();
      });

      await expect(page.getByText('E2E Refreshed Probe', { exact: true }).first()).toBeVisible({
        timeout: 60_000,
      });
      await expect(page.getByText('E2E Remote Probe', { exact: true })).toHaveCount(0);
      expect(
        await page.evaluate(() => (window as Window & { __archlensStay?: string }).__archlensStay)
      ).toBe('stay');
    } finally {
      await publishLatest(null);
    }
  });
});
