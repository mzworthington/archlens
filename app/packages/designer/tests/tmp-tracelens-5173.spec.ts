import { test, expect } from '@playwright/test';

test('tracelens loads on dev server 5173', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', e => errors.push(e.message));

  await page.goto('http://localhost:5173/tracelens', { waitUntil: 'domcontentloaded' });
  await expect(page.getByRole('heading', { name: 'Worst offenders' })).toBeVisible({
    timeout: 15_000,
  });

  if (errors.length > 0) {
    throw new Error(`Page errors: ${errors.join('; ')}`);
  }
});
