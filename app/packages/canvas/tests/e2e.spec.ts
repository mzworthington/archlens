import { test, expect } from '@playwright/test';
import { drillIntoFirstZoomable, expectCanvasReady } from './helpers/canvas';
import { gotoApp } from './helpers/navigation';
import { loadSandbox, keepStartupChooserOpen } from './helpers/workspace';

test.describe('Blueprint E2E Journeys', () => {
  test('Startup workspace chooser', async ({ page }) => {
    await keepStartupChooserOpen(page);
    await gotoApp(page, '/workspace');

    await expect(page.getByTestId('startup-workspace-dialog')).toBeVisible({ timeout: 10_000 });
    await expect(page.getByTestId('workspace-open-sample')).toBeVisible();
    await expect(page.getByTestId('workspace-open-directory')).toBeVisible();
    await expect(page.getByTestId('startup-import-mermaid')).toHaveCount(0);
  });

  test('Workspace panels and diagram zoom', async ({ page }) => {
    test.setTimeout(180_000);
    await loadSandbox(page);

    const leftPanelButton = page.getByRole('button', { name: 'Toggle left panel' });
    const rightPanelButton = page.getByRole('button', { name: 'Toggle right panel' });
    const leftPanel = page.getByTestId('left-panel');
    const rightPanel = page.getByTestId('right-panel');

    await expect(leftPanel).toHaveCount(0);
    await expect(rightPanel).toHaveCount(0);

    await leftPanelButton.click();
    await expect(leftPanel).toBeVisible();
    await rightPanelButton.click();
    await expect(rightPanel).toBeVisible();

    await leftPanelButton.click();
    await expect(leftPanel).toHaveCount(0);
    await rightPanelButton.click();
    await expect(rightPanel).toHaveCount(0);

    const statusBadges = page.getByTestId('workspace-status-badges');
    await expect(statusBadges.getByText('context', { exact: true })).toBeVisible();

    await drillIntoFirstZoomable(page);
    await expect(statusBadges.getByText('container', { exact: true })).toBeVisible({
      timeout: 60_000,
    });

    await page.getByTestId('zoom-out-button').click();
    await expectCanvasReady(page);
    await expect(statusBadges.getByText('context', { exact: true })).toBeVisible({
      timeout: 30_000,
    });
  });

  test('Phone viewport: mobile panel toggles', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await loadSandbox(page);

    await expect(page.getByLabel('Open diagram location menu')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Open Properties Panel' })).toBeVisible();

    await page.getByRole('button', { name: 'Open Explorer' }).click();
    await expect(page.getByTestId('left-panel')).not.toHaveClass(/w-0/);
  });
});
