import { expect, test } from '@playwright/test';
import { gotoApp } from './helpers/navigation';

test.describe('today jobs on a phone', () => {
  test.use({ viewport: { width: 390, height: 844 } });

  test('opens steps under the selected card, not below the whole list', async ({ page }) => {
    await gotoApp(page, '/');

    const first = page.getByRole('button', { name: /never used archlens/i });
    const next = page.getByRole('button', { name: /map a folder without installing/i });
    const panel = page.getByRole('region', { name: /never used archlens/i });

    await expect(first).toBeVisible();
    await expect(panel).toBeVisible();
    await expect(panel.getByText('Start here:')).toBeVisible();

    const firstBox = await first.boundingBox();
    const panelBox = await panel.boundingBox();
    const nextBox = await next.boundingBox();
    expect(firstBox && panelBox && nextBox).toBeTruthy();
    expect(panelBox!.y).toBeGreaterThan(firstBox!.y);
    expect(nextBox!.y).toBeGreaterThan(panelBox!.y + 8);
  });
});
