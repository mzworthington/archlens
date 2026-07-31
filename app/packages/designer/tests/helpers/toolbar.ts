import { expect, type Page } from '@playwright/test';
import { gotoApp } from './navigation';
import { keepStartupChooserOpen } from './workspace';

function isBareWorkspaceUrl(page: Page): boolean {
  const { pathname } = new URL(page.url());
  return pathname === '/workspace' || pathname === '/workspace/';
}

/** Dismiss the startup chooser by continuing with the bundled sandbox when shown. */
export async function continueWithSandbox(page: Page) {
  if (!isBareWorkspaceUrl(page)) return;

  // First-time visitors auto-load the sandbox; wait for navigation instead of racing the dialog button.
  const autoLoaded = await page
    .waitForURL(/\/workspace\/blueprint/, { timeout: 30_000 })
    .then(() => true)
    .catch(() => false);
  if (autoLoaded) return;

  const dialog = page.getByTestId('startup-workspace-dialog');
  if (!(await dialog.isVisible().catch(() => false))) {
    if (page.url().includes('/workspace/blueprint')) return;
    try {
      await dialog.waitFor({ state: 'visible', timeout: 10_000 });
    } catch {
      return;
    }
  }

  await page.getByTestId('startup-load-sandbox').click();
  await expect(dialog).toHaveCount(0);
}

async function openOverflowMenu(page: Page) {
  const menuButton = page.getByRole('button', { name: 'More actions' });
  await menuButton.click();
}

/** Opens a workspace folder via the startup chooser when present, else the toolbar overflow. */
export async function openWorkspaceFolder(page: Page) {
  const startupOpen = page.getByTestId('startup-open-directory');
  // Prefer a quick visibility check - do not burn 5s waiting when the chooser is gone.
  if (await startupOpen.isVisible().catch(() => false)) {
    await startupOpen.click();
    return;
  }

  await continueWithSandbox(page);

  const folderItem = page.getByRole('menuitem', { name: 'Open Folder' });

  if (!(await folderItem.isVisible())) {
    await openOverflowMenu(page);
  }

  await expect(folderItem).toBeVisible();
  await folderItem.click();
}

/** Opens Import Mermaid from the startup chooser or toolbar overflow menu. */
export async function openImportMermaid(page: Page) {
  await keepStartupChooserOpen(page);
  await gotoApp(page, '/workspace');

  const startupImport = page.getByTestId('startup-import-mermaid');
  if (await startupImport.isVisible().catch(() => false)) {
    await startupImport.click();
    await expect(page.getByRole('dialog', { name: /Import Mermaid/i })).toBeVisible();
    return;
  }

  await continueWithSandbox(page);

  const importItem = page.getByRole('menuitem', { name: 'Import Mermaid' });

  if (!(await importItem.isVisible())) {
    await openOverflowMenu(page);
  }

  await expect(importItem).toBeVisible();
  await importItem.click();
  await expect(page.getByRole('dialog', { name: /Import Mermaid/i })).toBeVisible();
}
