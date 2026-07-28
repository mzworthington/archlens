import type { Page } from '@playwright/test';

/** Navigate without waiting for every asset — tests assert on specific UI instead. */
export async function gotoApp(page: Page, path: string) {
  await page.goto(path, { waitUntil: 'domcontentloaded' });
}
