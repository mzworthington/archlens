import { expect, type Page } from '@playwright/test';

/** TraceLens docs demo: ranked offenders list and refactor plan (stays on /tracelens). */
export async function runTraceLensDemo(page: Page) {
  await page.goto('/tracelens');
  await expect(page.getByRole('heading', { name: 'Worst offenders' })).toBeVisible();

  if (await page.getByTestId('forensics-workspace-load').isVisible()) {
    await page.getByTestId('forensics-load-sandbox').click();
  }

  await expect(page.getByTestId('forensics-workspace-summary')).toBeVisible({ timeout: 60_000 });

  const firstRow = page.locator('[data-testid^="offender-row-"]').first();
  await expect(firstRow).toBeVisible({ timeout: 90_000 });
  await page.waitForTimeout(1_500);

  await firstRow.click();
  await expect(page.getByTestId('open-refactor-on-canvas')).toBeVisible({ timeout: 15_000 });
  await page.waitForTimeout(1_500);
}
