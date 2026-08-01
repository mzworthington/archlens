import { test, expect } from '@playwright/test';
import { gotoApp } from './helpers/navigation';
import { loadForensicsWorkspace, waitForForensicsOffenders } from './helpers/workspace';

test.describe('TraceLens lens', () => {
  test('renders the ranking shell', async ({ page }) => {
    await gotoApp(page, '/tracelens');

    await expect(page).toHaveURL(/\/workspace\?lens=tracelens/);
    await expect(page.getByRole('heading', { name: 'Forensics' })).toBeVisible();
    await expect(page.getByRole('textbox', { name: 'Search offenders' })).toBeVisible();
  });

  test('lists offenders when opened from a loaded workspace', async ({ page }) => {
    test.setTimeout(120_000);
    await loadForensicsWorkspace(page);
    await page.getByRole('link', { name: 'Forensics' }).click();

    await expect(page).toHaveURL(/lens=tracelens/);
    await waitForForensicsOffenders(page);
  });
});
