import { expect, type Page } from '@playwright/test';
import { continueWithSandbox } from './toolbar';
import { expectCanvasReady } from './canvas';

/** Open the bundled sandbox and wait for the diagram canvas. */
export async function loadSandbox(page: Page, path = '/workspace/blueprint') {
  await page.goto('/workspace');
  await continueWithSandbox(page);
  await expect(page).toHaveURL(/\/workspace\/blueprint/, { timeout: 60_000 });
  if (path !== '/workspace/blueprint') {
    await page.goto(path);
  }
  await expectCanvasReady(page);
}

/** Wait until background sandbox prefetch has loaded forensics-ranked components. */
export async function waitForForensicsOffenders(page: Page) {
  await expect(page.getByTestId('offender-list')).toBeVisible({ timeout: 60_000 });
}

export async function workspaceSlug(page: Page): Promise<string> {
  return page.locator('#workspace-slug-input').inputValue();
}
