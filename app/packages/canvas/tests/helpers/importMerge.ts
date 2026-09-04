import { expect, type Page } from '@playwright/test';
import { exitResilienceModeIfActive, openImportMermaid } from './toolbar';

async function openImportMermaidMenu(page: Page) {
  const alreadyInWorkspace = /\/workspace\//.test(page.url());
  if (!alreadyInWorkspace) {
    await openImportMermaid(page);
    return;
  }

  await exitResilienceModeIfActive(page);

  const dialog = page.getByTestId('import-mermaid-dialog');
  if (await dialog.isVisible().catch(() => false)) {
    return;
  }

  await expect(async () => {
    if (await dialog.isVisible().catch(() => false)) return;

    if (
      !(await page
        .getByRole('menu')
        .isVisible()
        .catch(() => false))
    ) {
      const menuButton = page.getByRole('button', { name: 'More actions' });
      await expect(menuButton).toBeEnabled({ timeout: 30_000 });
      await menuButton.click();
      await expect(page.getByRole('menu')).toBeVisible({ timeout: 10_000 });
    }
    const importItem = page.getByRole('menu').getByRole('menuitem', { name: 'Import Mermaid' });
    await expect(importItem).toBeEnabled({ timeout: 10_000 });
    await importItem.click();
    await expect(dialog).toBeVisible({ timeout: 15_000 });
  }).toPass({ timeout: 60_000 });
}

/** Paste Mermaid into the import dialog and wait for merge preview. */
export async function fillMermaidImport(page: Page, mermaid: string) {
  await openImportMermaidMenu(page);
  const dialog = page.getByTestId('import-mermaid-dialog');
  await expect(dialog).toBeVisible({ timeout: 30_000 });
  await dialog.locator('textarea').fill(mermaid);
  return dialog;
}

/** Merge Mermaid into the active diagram and wait for the dialog to hide. */
export async function mergeMermaidIntoDiagram(page: Page, mermaid: string) {
  const dialog = await fillMermaidImport(page, mermaid);
  await expect(dialog.getByText(/Additions|Conflicts/i).first()).toBeVisible({ timeout: 15_000 });
  const merge = dialog.getByRole('button', { name: 'Merge into diagram' });
  await expect(merge).toBeEnabled({ timeout: 15_000 });
  // Dialog re-renders while preview settles; force avoids "element is not stable" flakes.
  await merge.click({ force: true });
  // Dialog stays mounted (invisible) after close - assert hidden, not removed.
  await expect(dialog).toBeHidden({ timeout: 60_000 });
}

export async function setImportConflictResolution(
  page: Page,
  entityRef: string,
  label: 'Keep existing' | 'Rename import' | 'Overwrite'
) {
  const dialog = page.getByTestId('import-mermaid-dialog');
  const select = dialog.getByTestId(`import-conflict-${entityRef}`);
  await expect(select).toBeVisible({ timeout: 15_000 });
  await select.selectOption({ label });
}
