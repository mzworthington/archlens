import { expect, test } from '@playwright/test';
import { gotoApp } from './helpers/navigation';
import { expectNoSeriousA11yViolations } from './helpers/a11y';
import { openPendingChanges } from './helpers/diffMenu';
import { mergeMermaidIntoDiagram } from './helpers/importMerge';
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

  test('share dialog and share button keep their names', async ({ page }) => {
    await loadSandbox(page);
    const share = page.getByRole('button', { name: 'Share live diagram' });
    await expect(share).toBeVisible();
    await share.click();
    const dialog = page.getByRole('dialog', { name: 'Live diagram' });
    await expect(dialog).toBeVisible();
    await expectNoSeriousA11yViolations(page, 'collab share dialog');
    await page.keyboard.press('Escape');
    await expect(dialog).toHaveCount(0);
  });

  test('collab name dialog traps focus until Escape', async ({ page }) => {
    await gotoApp(page, '/workspace?room=a11y-room');
    const dialog = page.getByRole('dialog', { name: 'Join live diagram' });
    await expect(dialog).toBeVisible({ timeout: 15_000 });
    await expectNoSeriousA11yViolations(page, 'collab name dialog');
    await page.keyboard.press('Escape');
    await expect(dialog).toHaveCount(0);
  });

  test('pending draft changes dialog is named and Escape leaves it', async ({ page }) => {
    test.setTimeout(180_000);
    await mergeMermaidIntoDiagram(
      page,
      `flowchart TD
  Gateway["API Gateway"] --> Orders["Order Service"]`
    );
    await openPendingChanges(page);
    const dialog = page.getByRole('dialog', { name: 'Pending Draft Changes' });
    await expect(dialog).toBeVisible();
    await expectNoSeriousA11yViolations(page, 'pending draft changes');
    await page.keyboard.press('Escape');
    await expect(dialog).toBeHidden();
  });

  test('resilience panel is named and Escape leaves it', async ({ page }) => {
    await loadSandbox(page);
    const resilience = page.getByRole('button', { name: 'Enter resilience mode' });
    await resilience.click();
    const panel = page.getByRole('tabpanel', { name: 'Resilience' });
    await expect(panel).toBeVisible();
    await expectNoSeriousA11yViolations(page, 'resilience panel');
    await page.keyboard.press('Escape');
    await expect(page.getByRole('button', { name: 'Enter resilience mode' })).toBeVisible();
  });
});
