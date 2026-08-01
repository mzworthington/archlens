import { expect, type Page } from '@playwright/test';
import { continueWithSandbox } from './toolbar';
import { expectCanvasReady } from './canvas';
import { gotoApp } from './navigation';

/** Open the bundled sandbox and wait for the diagram canvas. */
export async function loadSandbox(page: Page, path = '/workspace/application') {
  await gotoApp(page, '/workspace');
  await continueWithSandbox(page);
  await expect(page).toHaveURL(/\/workspace\/golden-paths(?:\/|$)/, { timeout: 60_000 });
  if (path !== '/workspace/application') {
    await gotoApp(page, path);
  }
  await expectCanvasReady(page);
}

/** Prevent first-visit auto sandbox load so the startup chooser stays visible. */
export async function keepStartupChooserOpen(page: Page) {
  await page.addInitScript(() => {
    localStorage.setItem(
      'archlens.workspaceSession',
      JSON.stringify({ mode: 'folder', workspaceName: 'E2E' })
    );
  });
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
