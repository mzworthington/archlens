import { expect, type Page } from '@playwright/test';
import { continueWithSandbox } from './toolbar';
import { expectCanvasReady } from './canvas';
import { gotoApp } from './navigation';

/** Open the bundled sandbox and wait for the diagram canvas. */
export async function loadSandbox(page: Page, path = '/workspace/blueprint') {
  await gotoApp(page, '/workspace');
  await continueWithSandbox(page);
  await expect(page).toHaveURL(/\/workspace\/blueprint/, { timeout: 60_000 });
  if (path !== '/workspace/blueprint') {
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

/** Wait until background sandbox prefetch has loaded ranked estate rows. */
export async function waitForForensicsOffenders(page: Page) {
  await expect(page.getByTestId('offender-list')).toBeVisible({ timeout: 90_000 });
  await expect(
    page.locator('[data-testid^="estate-row-"], [data-testid^="offender-row-"]').first()
  ).toBeVisible({ timeout: 180_000 });
}

export async function workspaceSlug(page: Page): Promise<string> {
  return page.locator('#workspace-slug-input').inputValue();
}
