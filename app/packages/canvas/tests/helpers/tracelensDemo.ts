import { expect, type Page } from '@playwright/test';
import { loadForensicsWorkspace, openTraceLensLens, waitForForensicsOffenders } from './workspace';

/** TraceLens docs demo: ranked offenders list and refactor plan in workspace lens mode. */
export async function runTraceLensDemo(page: Page) {
  // Golden Journey estate carries TraceLens blocks; context-only sandbox does not.
  await loadForensicsWorkspace(page);
  await openTraceLensLens(page);
  await expect(page.getByRole('heading', { name: 'Forensics' })).toBeVisible();
  await waitForForensicsOffenders(page);
  await page.waitForTimeout(800);

  // Top rows are often ChaosLens advice without a refactor boundary (openOffender no-ops).
  // The "Review refactor plan" action only appears on forensics rows that can open the slide-over.
  const reviewPlan = page.getByRole('button', { name: /Review refactor plan/i }).first();
  await expect(reviewPlan).toBeVisible({ timeout: 10_000 });
  await reviewPlan.click();
  // await expect(page.getByTestId('open-refactor-on-canvas')).toBeVisible({ timeout: 10_000 });
  // await page.waitForTimeout(800);
}
