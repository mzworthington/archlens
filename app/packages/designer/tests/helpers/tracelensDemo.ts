import { expect, type Page } from '@playwright/test';
import { loadForensicsWorkspace, openTraceLensLens, waitForForensicsOffenders } from './workspace';

/** TraceLens docs demo: ranked offenders list and refactor plan in workspace lens mode. */
export async function runTraceLensDemo(page: Page) {
  // Golden Journey estate carries TraceLens blocks; context-only sandbox does not.
  await loadForensicsWorkspace(page);
  await openTraceLensLens(page);
  await expect(page.getByRole('heading', { name: 'Forensics' })).toBeVisible();
  await waitForForensicsOffenders(page);

  const firstRow = page
    .locator('[data-testid^="estate-row-"], [data-testid^="offender-row-"]')
    .first();
  await page.waitForTimeout(1_500);

  await firstRow.click();
  await expect(page.getByTestId('open-refactor-on-canvas')).toBeVisible({ timeout: 15_000 });
  await page.waitForTimeout(1_500);
}
