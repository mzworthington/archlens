import { expect, type Page } from '@playwright/test';
import { openImportMermaid } from './toolbar';

/** Paste Mermaid into the import dialog and wait for merge preview. */
export async function fillMermaidImport(page: Page, mermaid: string) {
  await openImportMermaid(page);
  const dialog = page.getByTestId('import-mermaid-dialog');
  await expect(dialog).toBeVisible({ timeout: 10_000 });
  await dialog.locator('textarea').fill(mermaid);
  return dialog;
}

/** Merge Mermaid into the active diagram and wait for the dialog to close. */
export async function mergeMermaidIntoDiagram(page: Page, mermaid: string) {
  const dialog = await fillMermaidImport(page, mermaid);
  await expect(dialog.getByText(/Additions|Conflicts/i).first()).toBeVisible({ timeout: 15_000 });
  await dialog.getByRole('button', { name: 'Merge into diagram' }).click();
  await expect(dialog).toHaveCount(0, { timeout: 30_000 });
}

/** Set conflict resolution for a given entityRef row in the import dialog. */
export async function setImportConflictResolution(
  page: Page,
  entityRef: string,
  optionLabel: 'Keep existing' | 'Rename import' | 'Overwrite'
) {
  const dialog = page.getByTestId('import-mermaid-dialog');
  const row = dialog.locator('div').filter({ hasText: entityRef }).filter({ has: page.locator('select') });
  await expect(row.first()).toBeVisible({ timeout: 10_000 });
  await row.first().locator('select').selectOption({ label: optionLabel });
}
