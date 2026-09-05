import { test } from '@playwright/test';
import { gotoApp } from './helpers/navigation';
import { expectNoSeriousA11yViolations } from './helpers/a11y';
import { keepStartupChooserOpen, loadSandbox } from './helpers/workspace';

/** Lean axe smoke - heavy lens surfaces stay covered by functional e2e. */
test.describe('Accessibility (axe)', () => {
  test('docs home', async ({ page }) => {
    await gotoApp(page, '/');
    await expectNoSeriousA11yViolations(page, 'docs home');
  });

  test('privacy policy', async ({ page }) => {
    await gotoApp(page, '/privacy');
    await expectNoSeriousA11yViolations(page, 'privacy policy');
  });

  test('workspace canvas after sandbox load', async ({ page }) => {
    await loadSandbox(page);
    await expectNoSeriousA11yViolations(page, 'workspace canvas');
  });

  test('startup workspace chooser', async ({ page }) => {
    await keepStartupChooserOpen(page);
    await expectNoSeriousA11yViolations(page, 'startup workspace chooser');
  });
});
