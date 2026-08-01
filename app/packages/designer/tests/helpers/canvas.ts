import { expect, type Locator, type Page } from '@playwright/test';

const DIAGRAM_LOADING = '[role="status"][aria-busy="true"]';
const GOLDEN_JOURNEY_ENTITY_REF = 'golden-paths/golden-journey';
const GOLDEN_JOURNEY_WORKSPACE_PATH = `/workspace/${GOLDEN_JOURNEY_ENTITY_REF}`;

export async function waitForDiagramIdle(page: Page, timeout = 60_000) {
  const loading = page.locator(DIAGRAM_LOADING);
  const nodes = page.locator('.react-flow__node');

  await expect(async () => {
    const busy =
      (await loading.count()) > 0 &&
      (await loading
        .first()
        .isVisible()
        .catch(() => false));
    if (busy) throw new Error('Diagram still loading');
    if ((await nodes.count()) === 0) throw new Error('Diagram has no nodes yet');
  }).toPass({ timeout });
}

export async function expectCanvasReady(page: Page, timeout = 60_000): Promise<Locator> {
  await waitForDiagramIdle(page, timeout);
  const nodes = page.locator('.react-flow__node');
  await expect(nodes.first()).toBeVisible({ timeout: 30_000 });
  return nodes;
}

export async function drillIntoFirstZoomable(page: Page, nodeName = 'Golden Journey') {
  await drillIntoZoomable(page, nodeName);
}

export async function drillIntoZoomable(page: Page, nodeName: string) {
  await expectCanvasReady(page);

  const node = page.locator('.react-flow__node').filter({ hasText: nodeName }).first();
  await expect(node).toBeVisible({ timeout: 30_000 });

  const zoomButton = node.getByRole('button', { name: `Zoom into ${nodeName}` });
  const button =
    (await zoomButton.count()) > 0 ? zoomButton : node.getByTestId('zoom-in-button').first();

  await expect(button).toBeVisible({ timeout: 30_000 });
  // Canvas nodes can overlap zoom controls at large viewports; force avoids flaky hit-testing.
  await button.click({ force: true, timeout: 45_000 });

  if (nodeName === 'Golden Journey') {
    await expectGoldenJourneyEstateReady(page);
    return;
  }

  await expectCanvasReady(page);
}

function containerLevelBadge(page: Page) {
  return page.getByTestId('workspace-status-badges').getByText('container', { exact: true });
}

async function navigateToWorkspacePath(page: Page, href: string) {
  await page.evaluate(target => {
    window.history.pushState({}, '', target);
    window.dispatchEvent(new PopStateEvent('popstate'));
  }, href);
}

/** Wait until the Golden Journey estate container diagram is active. */
export async function expectGoldenJourneyEstateReady(page: Page) {
  const containerBadge = containerLevelBadge(page);
  if (await containerBadge.isVisible().catch(() => false)) {
    await expectCanvasReady(page, 90_000);
    return;
  }

  await expect(async () => {
    await navigateToWorkspacePath(page, GOLDEN_JOURNEY_WORKSPACE_PATH);
    await expect(page).toHaveURL(/\/workspace\/golden-paths\/golden-journey(?:\/|$)/, {
      timeout: 5_000,
    });
    await expect(containerBadge).toBeVisible({ timeout: 5_000 });
    if ((await page.locator('.react-flow__node').count()) === 0) {
      throw new Error('Diagram has no nodes yet');
    }
  }).toPass({ timeout: 90_000 });

  await expectCanvasReady(page, 90_000);
}

/** Open the Golden Journey estate container diagram from the Golden Paths context view. */
export async function openGoldenJourneyEstate(page: Page) {
  await expectCanvasReady(page);
  await expectGoldenJourneyEstateReady(page);
}

export async function openPropertiesPanel(page: Page) {
  const panel = page.getByTestId('right-panel');
  const isCollapsed = await panel.evaluate(el => el.classList.contains('w-0'));
  if (isCollapsed) {
    await page.getByRole('button', { name: 'Open Properties Panel' }).click();
    await expect(panel).not.toHaveClass(/w-0/);
  }
}

export async function clickCanvasNode(page: Page, label: string) {
  const node = page.locator('.react-flow__node').filter({ hasText: label }).first();
  await expect(node).toBeVisible({ timeout: 30_000 });
  await node.scrollIntoViewIfNeeded();
  // Large diagrams can stack nodes; force avoids flaky hit-testing on overlapping labels.
  await node.click({ force: true });
}
