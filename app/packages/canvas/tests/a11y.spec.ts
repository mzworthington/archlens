import { expect, test } from '@playwright/test';
import { gotoApp } from './helpers/navigation';
import { expectNoSeriousA11yViolations } from './helpers/a11y';
import { keepStartupChooserOpen, loadSandbox } from './helpers/workspace';

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

  test('startup chooser without folder picker', async ({ page }) => {
    await page.addInitScript(() => {
      Object.defineProperty(window, 'showDirectoryPicker', {
        configurable: true,
        value: undefined,
      });
    });
    await keepStartupChooserOpen(page);
    await gotoApp(page, '/workspace');
    await expect(page.getByTestId('startup-workspace-dialog')).toBeVisible({ timeout: 10_000 });
    await expect(
      page.getByRole('button', { name: 'Upload ZIP for browser lite scan' })
    ).toBeVisible();
    await expectNoSeriousA11yViolations(page, 'startup chooser zip fallback');
  });

  test('workspace canvas after sandbox load', async ({ page }) => {
    await loadSandbox(page);
    await expectNoSeriousA11yViolations(page, 'workspace canvas');
  });
});
