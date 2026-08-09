import { expect, type Page } from '@playwright/test';

/** Open Pending Draft Changes when the toolbar badge is present. */
export async function openPendingChanges(page: Page) {
  const button = page.getByTestId('toolbar-pending-changes');
  await expect(button).toBeVisible({ timeout: 30_000 });
  await button.click();
  await expect(page.getByTestId('diff-menu')).toBeVisible();
  await expect(page.getByText('Pending Draft Changes')).toBeVisible();
}

/** Confirm revert of all draft changes for the active diagram. */
export async function revertPendingChanges(page: Page) {
  page.once('dialog', dialog => dialog.accept());
  await page.getByTestId('diff-revert').click();
  await expect(page.getByTestId('toolbar-pending-changes')).toHaveCount(0, { timeout: 30_000 });
}
