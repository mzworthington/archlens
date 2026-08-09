import { test } from '@playwright/test';
import {
  loadForensicsWorkspace,
  openTraceLensLens,
  waitForForensicsOffenders,
} from './helpers/workspace';

test.describe('TraceLens lens', () => {
  test('lists offenders when opened from a loaded workspace', async ({ page }) => {
    test.setTimeout(120_000);
    await loadForensicsWorkspace(page);
    await openTraceLensLens(page);
    await waitForForensicsOffenders(page);
  });
});
