import { expect, type Page } from '@playwright/test';
import { gotoApp } from './navigation';
import { expectCanvasReady, expectGoldenJourneyEstateReady } from './canvas';
import { continueWithSample, exitResilienceModeIfActive } from './toolbar';

const GOLDEN_JOURNEY_ESTATE_PATH = '/workspace/samples/golden-journey';
const GOLDEN_JOURNEY_WORKSPACE_PATH = GOLDEN_JOURNEY_ESTATE_PATH;

/** Open the Samples workspace and wait for the diagram canvas. */
export async function loadSandbox(page: Page, path = '/workspace/samples') {
  const targetPath = path.startsWith('/workspace') ? path : `/workspace/${path}`;
  const normalizedTarget = targetPath.replace(/\/$/, '');

  await gotoApp(page, '/workspace');
  await continueWithSample(page);
  await exitResilienceModeIfActive(page);

  const currentPath = new URL(page.url()).pathname.replace(/\/$/, '');
  if (currentPath !== normalizedTarget || new URL(page.url()).search) {
    await gotoApp(page, normalizedTarget);
    const escaped = normalizedTarget.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    await expect(page).toHaveURL(new RegExp(`${escaped}(?:/|\\?|$)`), { timeout: 60_000 });
  }

  if (normalizedTarget === GOLDEN_JOURNEY_ESTATE_PATH) {
    await expectGoldenJourneyEstateReady(page);
    return;
  }

  await expectCanvasReady(page);
}

/** Load Samples estate so TraceLens can rank forensics signals. */
export async function loadForensicsWorkspace(page: Page) {
  await gotoApp(page, GOLDEN_JOURNEY_WORKSPACE_PATH);
  await expectGoldenJourneyEstateReady(page);
}

/** Navigate to bare workspace so the startup chooser stays visible. */
export async function keepStartupChooserOpen(page: Page) {
  await gotoApp(page, '/workspace');
}

/** Enter workspace TraceLens lens mode via URL (toolbar no longer has a Forensics link). */
export async function openTraceLensLens(page: Page) {
  const url = new URL(page.url());
  url.searchParams.set('lens', 'tracelens');
  await page.goto(url.toString());
  await expect(page).toHaveURL(/lens=tracelens/);
}

/** Wait until TraceLens has ranked estate rows from loaded workspace diagrams. */
export async function waitForForensicsOffenders(page: Page) {
  await expect(page.getByTestId('offender-list')).toBeVisible({ timeout: 90_000 });
  await expect(
    page.locator('[data-testid^="estate-row-"], [data-testid^="offender-row-"]').first()
  ).toBeVisible({ timeout: 90_000 });
}

/** Open the properties panel when collapsed (desktop rail or mobile chip). */
export async function ensureRightPanelOpen(page: Page) {
  const panel = page.getByTestId('right-panel');
  if ((await panel.count()) === 0) {
    const mobile = page.getByRole('button', { name: 'Open Properties Panel' });
    if (await mobile.isVisible().catch(() => false)) {
      await mobile.click();
    } else {
      await page.getByTestId('right-panel-rail').click();
    }
  }
  await expect(panel).toBeVisible({ timeout: 30_000 });
}
