import { expect, type Page } from '@playwright/test';
import { continueWithSample } from './toolbar';
import { gotoApp } from './navigation';

/** TraceLens docs demo: ranked offenders list and refactor plan in workspace lens mode. */
export async function runTraceLensDemo(page: Page) {
  await gotoApp(page, '/workspace');
  await continueWithSample(page);
  await page.getByTestId('toolbar-tracelens-lens').click();
  await expect(page).toHaveURL(/lens=tracelens/);
  await expect(page.getByRole('heading', { name: 'Worst offenders' })).toBeVisible();

  const firstRow = page
    .locator('[data-testid^="estate-row-"], [data-testid^="offender-row-"]')
    .first();
  await expect(firstRow).toBeVisible({ timeout: 90_000 });
  await page.waitForTimeout(1_500);

  await firstRow.click();
  await expect(page.getByTestId('open-refactor-on-canvas')).toBeVisible({ timeout: 15_000 });
  await page.waitForTimeout(1_500);
}
