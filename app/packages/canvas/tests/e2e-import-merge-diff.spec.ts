import { test, expect } from '@playwright/test';
import { fillMermaidImport, mergeMermaidIntoDiagram, setImportConflictResolution } from './helpers/importMerge';
import { openPendingChanges, revertPendingChanges } from './helpers/diffMenu';
import { loadSandbox } from './helpers/workspace';

const UNIQUE_MERMAID = `flowchart TD
  Gateway["API Gateway"] --> Orders["Order Service"]
  Orders --> Db[("Orders DB")]
`;

const CONFLICT_MERMAID = `C4Context
title Conflict probe
System(golden-journey, "Renamed Golden Journey")
System(importprobe, "Import Probe")
Rel(importprobe, golden-journey, "calls")
`;

test.describe('Import Mermaid merge apply', () => {
  test('merges unique flowchart nodes onto the canvas', async ({ page }) => {
    test.setTimeout(180_000);
    await mergeMermaidIntoDiagram(page, UNIQUE_MERMAID);

    await expect(page.getByText('API Gateway', { exact: true }).first()).toBeVisible({
      timeout: 30_000,
    });
    await expect(page.getByText('Order Service', { exact: true }).first()).toBeVisible();
    await expect(page.getByTestId('toolbar-pending-changes')).toBeVisible();
  });

  test('shows conflicts and can keep existing then apply', async ({ page }) => {
    test.setTimeout(180_000);
    await loadSandbox(page);
    const dialog = await fillMermaidImport(page, CONFLICT_MERMAID);
    await expect(dialog.getByText(/Conflicts \(\d+\)/i)).toBeVisible({ timeout: 15_000 });
    await setImportConflictResolution(page, 'samples/golden-journey', 'Keep existing');
    await dialog.getByRole('button', { name: 'Merge into diagram' }).click();
    await expect(dialog).toHaveCount(0, { timeout: 30_000 });
    await expect(page.getByText('Import Probe', { exact: true }).first()).toBeVisible({
      timeout: 30_000,
    });
    await expect(page.getByText('Golden Journey', { exact: true }).first()).toBeVisible();
  });

  test('idempotent paste reports no new nodes or conflicts', async ({ page }) => {
    test.setTimeout(180_000);
    await mergeMermaidIntoDiagram(page, UNIQUE_MERMAID);
    await openPendingChanges(page);
    await page.getByRole('button', { name: 'Close View' }).click();

    const dialog = await fillMermaidImport(page, UNIQUE_MERMAID);
    await expect(
      dialog.getByText(/No new nodes or conflicts/i)
    ).toBeVisible({ timeout: 15_000 });
  });
});

test.describe('Pending changes / DiffMenu', () => {
  test('shows Added rows after merge and reverts drafts', async ({ page }) => {
    test.setTimeout(180_000);
    await mergeMermaidIntoDiagram(page, UNIQUE_MERMAID);
    await openPendingChanges(page);

    await expect(page.getByText('Component Operations')).toBeVisible();
    await expect(page.getByText('Added').first()).toBeVisible();
    await expect(page.getByText('API Gateway').first()).toBeVisible();

    await revertPendingChanges(page);
    await expect(page.getByText('API Gateway', { exact: true })).toHaveCount(0, {
      timeout: 30_000,
    });
  });

  test('sandbox Commit Changes downloads YAML (no FS Access)', async ({ page }) => {
    test.setTimeout(180_000);
    await mergeMermaidIntoDiagram(page, UNIQUE_MERMAID);
    await openPendingChanges(page);

    const downloadPromise = page.waitForEvent('download', { timeout: 30_000 });
    await page.getByTestId('diff-commit').click();
    const download = await downloadPromise;
    expect(download.suggestedFilename()).toMatch(/\.ya?ml$/i);
  });
});
