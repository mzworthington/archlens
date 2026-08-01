import { expect, type Page } from '@playwright/test';
import { continueWithSample } from './toolbar';
import { expectCanvasReady, expectGoldenJourneyEstateReady } from './canvas';
import { gotoApp } from './navigation';

const GOLDEN_JOURNEY_ESTATE_PATH = '/workspace/golden-paths/golden-journey';
const GOLDEN_JOURNEY_WORKSPACE_PATH = GOLDEN_JOURNEY_ESTATE_PATH;

/** Open the Golden Paths sample and wait for the diagram canvas. */
export async function loadSandbox(page: Page, path = '/workspace/golden-paths') {
  const targetPath = path.startsWith('/workspace') ? path : `/workspace/${path}`;
  const normalizedTarget = targetPath.replace(/\/$/, '');

  await gotoApp(page, '/workspace');
  await continueWithSample(page);

  if (normalizedTarget === GOLDEN_JOURNEY_ESTATE_PATH) {
    await expectGoldenJourneyEstateReady(page);
    return;
  }

  const currentPath = new URL(page.url()).pathname.replace(/\/$/, '');
  if (currentPath !== normalizedTarget) {
    await page.evaluate(href => {
      window.history.pushState({}, '', href);
      window.dispatchEvent(new PopStateEvent('popstate'));
    }, normalizedTarget);
    const escaped = normalizedTarget.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    await expect(page).toHaveURL(new RegExp(`${escaped}(?:/|$)`), { timeout: 60_000 });
  }

  await expectCanvasReady(page);
}

/** Load Golden Paths estate so TraceLens can rank forensics signals. */
export async function loadForensicsWorkspace(page: Page) {
  await gotoApp(page, GOLDEN_JOURNEY_WORKSPACE_PATH);
  await expectGoldenJourneyEstateReady(page);
}

/** Navigate to bare workspace so the startup chooser stays visible. */
export async function keepStartupChooserOpen(page: Page) {
  await gotoApp(page, '/workspace');
}

/** Wait until TraceLens has ranked estate rows from loaded workspace diagrams. */
export async function waitForForensicsOffenders(page: Page) {
  await expect(page.getByTestId('offender-list')).toBeVisible({ timeout: 90_000 });
  await expect(
    page.locator('[data-testid^="estate-row-"], [data-testid^="offender-row-"]').first()
  ).toBeVisible({ timeout: 90_000 });
}

export async function workspaceSlug(page: Page): Promise<string> {
  const { pathname } = new URL(page.url());
  const prefix = '/workspace/';
  if (!pathname.startsWith(prefix)) return '';
  const rest = pathname.slice(prefix.length).replace(/\/$/, '');
  return decodeURIComponent(rest);
}

/** Open Explorer on the TraceLens tab (desktop rail or mobile chip). */
export async function openExplorerTraceLensTab(page: Page) {
  const leftRail = page.getByTestId('left-panel-rail');
  if (await leftRail.isVisible().catch(() => false)) {
    await leftRail.click();
  } else {
    await page.getByRole('button', { name: 'Open Explorer' }).click();
  }
  await page.getByTestId('left-tab-tracelens').click();
  await expect(page.getByTestId('workspace-display-controls')).toBeVisible();
}
