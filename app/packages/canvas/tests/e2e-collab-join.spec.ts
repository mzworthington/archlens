import { test, expect } from '@playwright/test';
import { gotoApp } from './helpers/navigation';

test.describe('Share-link join', () => {
  test('entering a display name shows a connected count that includes me', async ({ page }) => {
    test.setTimeout(90_000);
    const roomId = `e2e-join-${Date.now()}`;
    await gotoApp(page, `/workspace/samples/golden-journey?room=${roomId}`);

    const nameDialog = page.getByTestId('collab-join-name-dialog');
    await expect(nameDialog).toBeVisible({ timeout: 20_000 });
    await nameDialog.getByLabel('Your name').fill('Ada');
    await nameDialog.getByRole('button', { name: 'Join', exact: true }).click();
    await expect(nameDialog).toHaveCount(0, { timeout: 15_000 });

    await expect(page.getByTestId('collab-connected-count')).toHaveText('1', {
      timeout: 20_000,
    });
  });
});
