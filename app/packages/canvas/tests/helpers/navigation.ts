import type { Page } from '@playwright/test';

/** Navigate without waiting for every asset - tests assert on specific UI instead. */
export async function gotoApp(page: Page, path: string) {
  await page.goto(path, { waitUntil: 'domcontentloaded' });
}

/** Leave heavy workspace routes so Playwright can tear down the browser context quickly. */
export async function releaseE2ePage(page: Page) {
  await page.goto('/', { waitUntil: 'domcontentloaded', timeout: 20_000 }).catch(() => undefined);
}
