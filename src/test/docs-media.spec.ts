import { expect, test } from '@playwright/test';
import { mkdirSync } from 'node:fs';
import path from 'node:path';

const outDir = path.join(process.cwd(), 'docs/screenshots');

test.describe('docs media', () => {
  test.skip(!process.env.RECORD_DOCS_MEDIA, 'Set RECORD_DOCS_MEDIA=1 to record');

  test('home page screenshot', async ({ page }) => {
    mkdirSync(outDir, { recursive: true });
    await page.goto('/');
    await expect(page.getByTestId('home')).toBeVisible();
    await page.screenshot({
      path: path.join(outDir, 'home.png'),
      fullPage: true,
    });
  });
});
