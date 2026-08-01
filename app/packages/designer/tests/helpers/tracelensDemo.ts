import { expect, type Page } from '@playwright/test';
import { gotoApp } from './navigation';

/** TraceLens docs demo: ranked offenders list and refactor plan (stays on /tracelens). */
export async function runTraceLensDemo(page: Page) {
  await gotoApp(page, '/tracelens');
  await expect(page.getByRole('heading', { name: 'Worst offenders' })).toBeVisible();

  if (await page.getByTestId('workspace-entry').isVisible()) {
    await page.getByTestId('workspace-open-sample').click();
  }

  await expect(page.getByTestId('forensics-workspace-summary')).toBeVisible({ timeout: 60_000 });

  const firstRow = page
    .locator('[data-testid^="estate-row-"], [data-testid^="offender-row-"]')
    .first();
  await expect(firstRow).toBeVisible({ timeout: 90_000 });
  await page.waitForTimeout(1_500);

  await firstRow.click();
  await expect(page.getByTestId('open-refactor-on-canvas')).toBeVisible({ timeout: 15_000 });
  await page.waitForTimeout(1_500);
}
