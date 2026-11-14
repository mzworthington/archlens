import { expect, test, type Page } from '@playwright/test';
import { gotoApp } from './helpers/navigation';
import { loadSandbox } from './helpers/workspace';

async function expectNotSamples(page: Page) {
  await expect(page.getByRole('link', { name: 'Samples' })).toHaveCount(0);
  await expect(page.getByText('Golden Journey')).toHaveCount(0);
  await expect(page.getByTestId('workspace-mode-demo')).toHaveCount(0);
  await expect(page).not.toHaveURL(/golden-journey|\/workspace\/samples(?:\/|$|\?)/);
}

test.describe('Blank canvas create zoom', () => {
  test('stays on the blank workspace child and survives refresh', async ({ page }) => {
    test.setTimeout(180_000);
    await gotoApp(page, '/workspace?new=1');

    const dialog = page.getByTestId('name-blank-workspace-dialog');
    await expect(dialog).toBeVisible({ timeout: 20_000 });
    await dialog.getByLabel('Workspace name').fill('Super amazing');
    await dialog.getByRole('checkbox').check();
    await dialog.getByRole('button', { name: 'Continue unsaved' }).click();
    await expect(dialog).toHaveCount(0);

    await page.getByRole('button', { name: 'Software System' }).click();
    await page.getByRole('button', { name: /create zoom into new software system/i }).click();

    await expect(page).toHaveURL(/\/workspace\/super-amazing\/.+/, { timeout: 20_000 });
    await expect(page.getByRole('link', { name: 'Super amazing' })).toBeVisible();
    await expect(
      page.getByTestId('workspace-status-badges').getByText('component', { exact: true })
    ).toBeVisible();
    await expectNotSamples(page);
    await page.screenshot({
      path: '/opt/cursor/artifacts/blank-canvas-create-zoom.png',
      fullPage: true,
    });

    await page.reload({ waitUntil: 'domcontentloaded' });
    await expect(page).toHaveURL(/\/workspace\/super-amazing\/.+/, { timeout: 20_000 });
    await expect(page.getByLabel('Workspace name')).toHaveValue('Super amazing', {
      timeout: 20_000,
    });
    await expect(page.getByRole('heading', { name: 'New Software System' })).toBeVisible();
    await expectNotSamples(page);
    await page.screenshot({
      path: '/opt/cursor/artifacts/blank-canvas-create-zoom-refresh.png',
      fullPage: true,
    });
  });

  test('Clear Canvas from Samples drops the sample catalog', async ({ page }) => {
    test.setTimeout(180_000);
    await loadSandbox(page);
    await expect(page.getByTestId('workspace-mode-demo')).toHaveAttribute('aria-pressed', 'true');

    page.once('dialog', dialog => dialog.accept());
    await page.getByRole('button', { name: 'More actions' }).click();
    await page.getByTitle('Clear canvas').click();

    await expect(page).toHaveURL(/\/workspace\/empty-workspace\/?$/, { timeout: 20_000 });
    await expectNotSamples(page);
    await page.screenshot({
      path: '/opt/cursor/artifacts/clear-canvas-blank.png',
      fullPage: true,
    });

    await page.reload({ waitUntil: 'domcontentloaded' });
    await expect(page).toHaveURL(/\/workspace\/empty-workspace\/?$/, { timeout: 20_000 });
    await expect(page.getByLabel('Workspace name')).toHaveValue('Empty Workspace', {
      timeout: 20_000,
    });
    await expectNotSamples(page);
  });
});
