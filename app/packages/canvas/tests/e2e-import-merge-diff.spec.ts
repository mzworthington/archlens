import { test, expect } from '@playwright/test';
import {
  mergeMermaidIntoDiagram,
  fillMermaidImport,
  setImportConflictResolution,
} from './helpers/importMerge';
import { openPendingChanges, revertPendingChanges } from './helpers/diffMenu';
import { loadSandbox } from './helpers/workspace';

const UNIQUE_MERMAID = `flowchart TD
  Gateway["API Gateway"] --> Orders["Order Service"]
  Orders --> Db[("Orders DB")]
`;

const CONFLICT_MERMAID = `flowchart TD
  Web["Import Probe"]
  ProbeSvc["Probe Service"]
`;

test.describe('Import Mermaid merge + DiffMenu', () => {
  test('merges, shows pending changes, reverts, then commits download', async ({ page }) => {
    test.setTimeout(180_000);
    await mergeMermaidIntoDiagram(page, UNIQUE_MERMAID);

    await expect(page.getByText('API Gateway', { exact: true }).first()).toBeVisible({
      timeout: 30_000,
    });
    await expect(page.getByTestId('toolbar-pending-changes')).toBeVisible();

    await openPendingChanges(page);
    await expect(page.getByText('Component Operations')).toBeVisible();
    await expect(page.getByText('Added').first()).toBeVisible();
    await expect(page.getByTestId('diff-menu').getByText('API Gateway').first()).toBeVisible();

    await revertPendingChanges(page);
    await expect(page.locator('.react-flow__node').filter({ hasText: 'API Gateway' })).toHaveCount(
      0,
      { timeout: 30_000 }
    );

    await mergeMermaidIntoDiagram(page, UNIQUE_MERMAID);
    await openPendingChanges(page);

    // Chromium exposes showSaveFilePicker; force the <a download> fallback for Playwright.
    await page.evaluate(() => {
      Reflect.deleteProperty(window, 'showSaveFilePicker');
    });

    const downloadPromise = page.waitForEvent('download', { timeout: 30_000 });
    await page.getByTestId('diff-commit').click();
    const download = await downloadPromise;
    expect(download.suggestedFilename()).toMatch(/\.ya?ml$/i);
  });

  test('conflict keep-existing then idempotent paste', async ({ page }) => {
    test.setTimeout(180_000);
    await loadSandbox(page, '/workspace/samples/golden-journey');
    const dialog = await fillMermaidImport(page, CONFLICT_MERMAID);
    await expect(dialog.getByText(/Conflicts \(\d+\)/i)).toBeVisible({ timeout: 15_000 });
    await setImportConflictResolution(page, 'samples/golden-journey/web', 'Keep existing');
    const merge = dialog.getByRole('button', { name: 'Merge into diagram' });
    await expect(merge).toBeEnabled({ timeout: 15_000 });
    await merge.click({ force: true });
    await expect(dialog).toBeHidden({ timeout: 30_000 });
    await expect(page.getByText('Web Storefront', { exact: true }).first()).toBeVisible({
      timeout: 30_000,
    });
    await expect(page.getByText('Import Probe', { exact: true })).toHaveCount(0);
    await expect(page.getByText('Probe Service', { exact: true }).first()).toBeVisible();

    await mergeMermaidIntoDiagram(page, UNIQUE_MERMAID);
    const again = await fillMermaidImport(page, UNIQUE_MERMAID);
    await expect(again.getByText(/No new nodes or conflicts/i)).toBeVisible({ timeout: 15_000 });
  });
});
