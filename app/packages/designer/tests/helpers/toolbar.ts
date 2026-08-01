import { expect, type Page } from '@playwright/test';
import { gotoApp } from './navigation';
import { expectCanvasReady } from './canvas';

/** Dismiss the startup chooser by opening the bundled Golden Paths sample when shown. */
export async function continueWithSample(page: Page) {
  if (page.url().includes('/workspace/golden-paths/golden-journey')) {
    await expectCanvasReady(page);
    return;
  }

  const dialog = page.getByTestId('startup-workspace-dialog');
  if (!(await dialog.isVisible().catch(() => false))) {
    await dialog.waitFor({ state: 'visible', timeout: 15_000 });
  }

  await page.getByTestId('workspace-open-sample').click();
  await expect(page).toHaveURL(/\/workspace\/golden-paths\/golden-journey(?:\/|$)/, {
    timeout: 120_000,
  });
  await expect(dialog).toHaveCount(0, { timeout: 90_000 });
  await expectCanvasReady(page);
}

async function openOverflowMenu(page: Page) {
  const menuButton = page.getByRole('button', { name: 'More actions' });
  await menuButton.click();
}

/** Opens a workspace folder via the startup chooser when present, else the toolbar overflow. */
export async function openWorkspaceFolder(page: Page) {
  const startupOpen = page.getByTestId('workspace-open-directory');
  if (await startupOpen.isVisible().catch(() => false)) {
    await startupOpen.click();
    return;
  }

  await continueWithSample(page);

  const folderItem = page.getByRole('menuitem', { name: 'Open Folder' });

  if (!(await folderItem.isVisible())) {
    await openOverflowMenu(page);
  }

  await expect(folderItem).toBeVisible();
  await folderItem.click();
}

/** Opens Import Mermaid from the toolbar overflow menu. */
export async function openImportMermaid(page: Page) {
  await gotoApp(page, '/workspace');
  await continueWithSample(page);

  const importItem = page.getByRole('menuitem', { name: 'Import Mermaid' });

  if (!(await importItem.isVisible())) {
    await openOverflowMenu(page);
  }

  await expect(importItem).toBeVisible();
  await importItem.click();
  await expect(page.getByRole('dialog', { name: /Import Mermaid/i })).toBeVisible();
}
