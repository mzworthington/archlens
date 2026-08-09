import { test, expect } from '@playwright/test';
import { expectCanvasReady } from './helpers/canvas';
import { continueWithSample } from './helpers/toolbar';
import { gotoApp } from './helpers/navigation';

/**
 * Publish→consume (Canvas side): ADR-0010 remote catalog via fixture server.
 * Requires playwright.remote-catalog.config.ts (Vite with VITE_REMOTE_CATALOG_BASE_URL).
 */
test.describe('Remote catalog consume', () => {
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
});
