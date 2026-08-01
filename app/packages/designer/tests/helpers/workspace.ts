import { expect, type Page } from '@playwright/test';
import { continueWithSample } from './toolbar';
import { expectCanvasReady } from './canvas';
import { gotoApp } from './navigation';

/** Open the Golden Paths sample and wait for the diagram canvas. */
export async function loadSandbox(page: Page, path = '/workspace/golden-paths') {
  await gotoApp(page, '/workspace');
  await continueWithSample(page);
  await expect(page).toHaveURL(/\/workspace\/golden-paths(?:\/|$)/, { timeout: 60_000 });
  if (path !== '/workspace/golden-paths') {
    await gotoApp(page, path);
  }
  await expectCanvasReady(page);
}

/** Navigate to bare workspace so the startup chooser stays visible. */
export async function keepStartupChooserOpen(page: Page) {
  await gotoApp(page, '/workspace');
}

/** Wait until TraceLens has ranked estate rows (prefers loaded diagrams to avoid full prefetch). */
export async function waitForForensicsOffenders(page: Page) {
  await expect(page.getByTestId('offender-list')).toBeVisible({ timeout: 90_000 });

  const rankLoaded = page.getByTestId('forensics-rank-loaded-only');
  if (await rankLoaded.isVisible().catch(() => false)) {
    await rankLoaded.click();
  }

  await expect(
    page.locator('[data-testid^="estate-row-"], [data-testid^="offender-row-"]').first()
  ).toBeVisible({ timeout: 90_000 });
}

export async function workspaceSlug(page: Page): Promise<string> {
  const { pathname } = new URL(page.url());
  const prefix = '/workspace/';
  if (!pathname.startsWith(prefix)) return '';
  const rest = pathname.slice(prefix.length).replace(/\/$/, '');
  return decodeURIComponent(rest);
}
