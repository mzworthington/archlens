import { expect, type Page } from '@playwright/test';
import { gotoApp } from './navigation';
import { expectCanvasReady } from './canvas';

/** Demo-first CTA opens ChaosLens on the golden-journey estate. */
const DEMO_LANDING_URL = /\/workspace\/samples\/golden-journey(?:\/|$|\?)/;

function isSamplesWorkspaceUrl(url: string): boolean {
  try {
    return new URL(url).pathname.replace(/\/$/, '').startsWith('/workspace/samples');
  } catch {
    return false;
  }
}

/** Dismiss the startup chooser by opening the bundled demo when shown. */
export async function continueWithSample(page: Page) {
  if (
    isSamplesWorkspaceUrl(page.url()) &&
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

/** Demo-first enables ChaosLens; exit so imports/toolbars are not racing resilience UI. */
export async function exitResilienceModeIfActive(page: Page) {
  const exitResilience = page.getByRole('button', { name: /exit resilience mode/i });
  if (await exitResilience.isVisible().catch(() => false)) {
    await exitResilience.click();
    await expect(page.getByRole('button', { name: /enter resilience mode/i })).toBeVisible({
      timeout: 30_000,
    });
  }
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
