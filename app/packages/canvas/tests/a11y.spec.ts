import { expect, test } from '@playwright/test';
import { gotoApp } from './helpers/navigation';
import { expectNoSeriousA11yViolations } from './helpers/a11y';
import { loadSandbox } from './helpers/workspace';
import { exitResilienceModeIfActive, openImportIac } from './helpers/toolbar';

/** Lean axe smoke - heavy lens surfaces stay covered by functional e2e. */
test.describe('Accessibility (axe)', () => {
  test('docs home', async ({ page }) => {
    await gotoApp(page, '/');
    await expectNoSeriousA11yViolations(page, 'docs home');
  });

  test('analytics consent dialog', async ({ page }) => {
    await gotoApp(page, '/', { analyticsConsent: 'unset' });
    const dialog = page.getByRole('dialog', { name: /help us improve archlens/i });
    await expect(dialog).toBeVisible();
    await expectNoSeriousA11yViolations(page, 'analytics consent dialog');
  });

  test('privacy policy', async ({ page }) => {
    await gotoApp(page, '/privacy');
    await expectNoSeriousA11yViolations(page, 'privacy policy');
  });

  test('workspace canvas after sandbox load', async ({ page }) => {
    await loadSandbox(page);
    await expectNoSeriousA11yViolations(page, 'workspace canvas');
  });

  test('import infrastructure dialog', async ({ page }) => {
    await loadSandbox(page);
    await exitResilienceModeIfActive(page);
    await openImportIac(page);
    const dialog = page.getByTestId('import-iac-dialog');
    await dialog.locator('textarea').fill(`
resource "aws_lambda_function" "api" { function_name = "api" }
resource "aws_iam_role" "lambda" { name = "lambda" }
`);
    await expect(dialog.getByText(/supporting or noise omitted/i)).toBeVisible({ timeout: 15_000 });
    await expectNoSeriousA11yViolations(page, 'import infrastructure dialog');
  });
});
