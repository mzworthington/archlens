import { expect, type Page } from '@playwright/test';
import { loadForensicsWorkspace, openTraceLensLens, waitForForensicsOffenders } from './workspace';

/** TraceLens docs demo: ranked offenders list and refactor plan in workspace lens mode. */
export async function runTraceLensDemo(page: Page) {
  // Golden Journey estate carries TraceLens blocks; context-only sandbox does not.
  await loadForensicsWorkspace(page);
  await openTraceLensLens(page);
  await expect(page.getByRole('heading', { name: 'Forensics' })).toBeVisible();
  await waitForForensicsOffenders(page);
  await page.waitForTimeout(1_500);

  // Top estate rows are often ChaosLens circuit-breaker advice without a refactor boundary
  // (openOffender no-ops). Prefer the Refactor filter so the slide-over can open.
  await page.getByRole('button', { name: 'Refactor', exact: true }).click();
  const openPlan = page.getByRole('button', { name: /Open refactor plan/i }).first();
  await expect(openPlan).toBeVisible({ timeout: 30_000 });
  await openPlan.click();
  await expect(page.getByTestId('open-refactor-on-canvas')).toBeVisible({ timeout: 15_000 });
  await page.waitForTimeout(1_500);
}
