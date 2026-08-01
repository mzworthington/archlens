import { test, expect } from '@playwright/test';
import { drillIntoFirstZoomable, expectCanvasReady } from './helpers/canvas';
import { gotoApp } from './helpers/navigation';
import { loadSandbox, keepStartupChooserOpen, openExplorerTraceLensTab } from './helpers/workspace';
import { openImportMermaid } from './helpers/toolbar';

const SAMPLE_MERMAID = `flowchart TD
  Gateway["API Gateway"] --> Orders["Order Service"]
  Orders --> Db[("Orders DB")]
`;

test.describe('Blueprint E2E Journeys', () => {
  test('Startup workspace chooser', async ({ page }) => {
    await keepStartupChooserOpen(page);
    await gotoApp(page, '/workspace');

    await expect(page.getByTestId('startup-workspace-dialog')).toBeVisible({ timeout: 10_000 });
    await expect(page.getByTestId('workspace-open-sample')).toBeVisible();
    await expect(page.getByTestId('workspace-open-directory')).toBeVisible();
    await expect(page.getByTestId('startup-import-mermaid')).toHaveCount(0);
  });

  test('Golden Paths sample loads a diagram on the canvas', async ({ page }) => {
    test.setTimeout(120_000);
    await loadSandbox(page);
    await expect(page).toHaveURL(/\/workspace\/golden-paths(?:\/|$)/);
    await expect(page.getByText('Golden Paths').first()).toBeVisible();
  });

  test('Workspace panel toggles', async ({ page }) => {
    test.setTimeout(120_000);
    await loadSandbox(page);

    const leftPanelButton = page.getByRole('button', { name: 'Toggle left panel' });
    const rightPanelButton = page.getByRole('button', { name: 'Toggle right panel' });
    const leftPanel = page.getByTestId('left-panel');
    const rightPanel = page.getByTestId('right-panel');

    // Both side panels unmount when collapsed.
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
  });

  test('Diagram zoom in and out', async ({ page }) => {
    test.setTimeout(120_000);
    await loadSandbox(page);

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

  test('Import Mermaid merge preview', async ({ page }) => {
    await openImportMermaid(page);

    const dialog = page.getByTestId('import-mermaid-dialog');
    await expect(dialog).toBeVisible({ timeout: 10_000 });
    await dialog.locator('textarea').fill(SAMPLE_MERMAID);
    await expect(dialog.getByText(/Additions/i)).toBeVisible({ timeout: 15_000 });
  });

  test('Workspace display controls render', async ({ page }) => {
    await loadSandbox(page);
    await openExplorerTraceLensTab(page);
    await expect(page.getByTestId('workspace-display-controls')).toBeVisible();
    await expect(page.getByTestId('toggle-show-upstream-externals')).toBeVisible();
    await expect(page.getByTestId('toggle-show-downstream-externals')).toBeVisible();
  });

  test('Import Mermaid from toolbar menu', async ({ page }) => {
    test.setTimeout(120_000);
    await gotoApp(page, '/workspace');
    await openImportMermaid(page);
    await expect(page.getByTestId('import-mermaid-dialog')).toBeVisible();
  });

  test('Tablet viewport: compact breadcrumbs', async ({ page }) => {
    test.setTimeout(120_000);
    await page.setViewportSize({ width: 768, height: 1024 });
    await loadSandbox(page);
    await expect(page.getByLabel('Open diagram location menu')).toBeVisible();
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
