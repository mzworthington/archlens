import { test, expect } from '@playwright/test';
import { loadSandbox } from './helpers/workspace';
import { expectCanvasReady } from './helpers/canvas';

/**
 * Bundled sandbox catalog navigation — consume side of the publish→catalog story
 * without hitting live R2 (main playwright.config clears VITE_REMOTE_CATALOG_BASE_URL).
 */
test.describe('Bundled sandbox catalog consume', () => {
  test('navigates between catalog estates on the canvas', async ({ page }) => {
    test.setTimeout(180_000);
    await loadSandbox(page, '/workspace/samples/golden-journey');
    await expect(page.getByText('Golden Journey').first()).toBeVisible({ timeout: 60_000 });

    await loadSandbox(page, '/workspace/samples/chaoslens-stress');
    await expectCanvasReady(page);
    await expect(page).toHaveURL(/chaoslens-stress/);
    await expect(page.locator('.react-flow__node').first()).toBeVisible({ timeout: 60_000 });
  });
});
