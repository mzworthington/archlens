import { expect, type Page } from '@playwright/test';
import { gotoApp } from './navigation';
import { expectCanvasReady } from './canvas';

/** Demo-first CTA opens ChaosLens on ArchLens when present, else samples fallback. */
export const DEMO_LANDING_URL = /\/workspace\/(?:archlens|samples)(?:\/|$|\?)/;

function isDemoWorkspaceUrl(url: string): boolean {
  try {
    const path = new URL(url).pathname.replace(/\/$/, '');
    return (
      path === '/workspace/archlens' ||
      path.startsWith('/workspace/archlens/') ||
      path.startsWith('/workspace/samples')
    );
  } catch {
    return false;
  }
}

/** Dismiss the startup chooser by opening the bundled demo when shown. */
export async function continueWithSample(page: Page) {
  if (
    isDemoWorkspaceUrl(page.url()) &&
    !(await page
      .getByTestId('startup-workspace-dialog')
      .isVisible()
      .catch(() => false))
  ) {
    await expectCanvasReady(page);
    return;
  }

  const dialog = page.getByTestId('startup-workspace-dialog');
  if (!(await dialog.isVisible().catch(() => false))) {
    await dialog.waitFor({ state: 'visible', timeout: 15_000 });
  }

  await page.getByTestId('workspace-open-sample').click();
  await expect(page).toHaveURL(DEMO_LANDING_URL, {
    timeout: 120_000,
  });
  await expect(dialog).toHaveCount(0, { timeout: 90_000 });
  await expectCanvasReady(page);
}

/** Collapse Explorer if ChaosLens (or TraceLens) left it open. */
async function ensureLeftPanelCollapsed(page: Page) {
  const leftPanel = page.getByTestId('left-panel');
  if ((await leftPanel.count()) === 0) return;

  const closeExplorer = page.getByRole('button', { name: 'Close Explorer' });
  if (await closeExplorer.isVisible().catch(() => false)) {
    await closeExplorer.click();
  } else {
    await page.getByTestId('left-panel-rail').click();
  }
  await expect(leftPanel).toHaveCount(0, { timeout: 10_000 });
}

/** Demo-first enables ChaosLens; exit so imports/toolbars are not racing resilience UI. */
export async function exitResilienceModeIfActive(page: Page) {
  const exitResilience = page.getByRole('button', { name: /exit resilience mode/i });
  if (await exitResilience.isVisible().catch(() => false)) {
    await exitResilience.dispatchEvent('click');
    await expect(page.getByTestId('toolbar-resilience-lens')).toHaveAttribute(
      'aria-pressed',
      'false',
      { timeout: 30_000 }
    );
  }
  // Exiting ChaosLens does not restore leftCollapsed; suite defaults expect Explorer closed.
  await ensureLeftPanelCollapsed(page);
}

async function openOverflowMenu(page: Page) {
  const menuButton = page.getByRole('button', { name: 'More actions' });
  await expect(menuButton).toBeEnabled({ timeout: 30_000 });
  await menuButton.click();
  await expect(page.getByRole('menu')).toBeVisible({ timeout: 10_000 });
}

/**
 * Open the Import Mermaid dialog from the overflow menu.
 * Retries because demo ChaosLens + LazyMount can race the first open.
 */
export async function openImportMermaid(page: Page) {
  await gotoApp(page, '/workspace');
  await continueWithSample(page);
  await exitResilienceModeIfActive(page);

  const dialog = page.getByTestId('import-mermaid-dialog');
  await expect(async () => {
    if (await dialog.isVisible().catch(() => false)) return;

    if (
      !(await page
        .getByRole('menu')
        .isVisible()
        .catch(() => false))
    ) {
      await openOverflowMenu(page);
    }
    const importItem = page.getByRole('menu').getByRole('menuitem', { name: 'Import Mermaid' });
    await expect(importItem).toBeEnabled({ timeout: 10_000 });
    await importItem.click();
    await expect(dialog).toBeVisible({ timeout: 15_000 });
  }).toPass({ timeout: 60_000 });
}
