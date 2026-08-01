import { test } from '@playwright/test';
import { gotoApp, releaseE2ePage } from './helpers/navigation';
import { expectNoSeriousA11yViolations } from './helpers/a11y';
import {
  loadForensicsWorkspace,
  loadSandbox,
  waitForForensicsOffenders,
} from './helpers/workspace';
import { openImportMermaid } from './helpers/toolbar';

test.describe('Accessibility (axe)', () => {
  test('docs home', async ({ page }) => {
    await gotoApp(page, '/');
    await expectNoSeriousA11yViolations(page, 'docs home');
  });

  test('TraceLens ranking page', async ({ page }) => {
    await gotoApp(page, '/tracelens');
    await expectNoSeriousA11yViolations(page, 'TraceLens');
  });

  test('design system showcase', async ({ page }) => {
    await gotoApp(page, '/design-system');
    await expectNoSeriousA11yViolations(page, 'design system');
  });

  test('workspace canvas after sandbox load', async ({ page }) => {
    await loadSandbox(page);
    await expectNoSeriousA11yViolations(page, 'workspace canvas');
  });

  test('workspace display controls dialog', async ({ page }) => {
    await loadSandbox(page);
    await page.getByTestId('toolbar-display-settings').click();
    await expectNoSeriousA11yViolations(page, 'workspace display dialog');
  });

  test('import Mermaid dialog', async ({ page }) => {
    await openImportMermaid(page);
    await expectNoSeriousA11yViolations(page, 'import Mermaid dialog');
  });

  test('TraceLens refactor plan slide-over', async ({ page }) => {
    test.setTimeout(180_000);
    await loadForensicsWorkspace(page);
    await page.getByRole('link', { name: 'TraceLens' }).click();
    await waitForForensicsOffenders(page);
    await page
      .getByRole('button', { name: /Open refactor plan for/i })
      .first()
      .click();
    await expectNoSeriousA11yViolations(page, 'TraceLens refactor plan');
    await releaseE2ePage(page);
  });

  test('ChaosLens resilience panel', async ({ page }) => {
    test.setTimeout(180_000);
    await loadSandbox(page);
    await page.getByRole('button', { name: /enter resilience mode/i }).click();
    await expectNoSeriousA11yViolations(page, 'ChaosLens resilience mode');
    await releaseE2ePage(page);
  });
});
