import { expect, type Locator, type Page } from '@playwright/test';

const DIAGRAM_LOADING = '[role="status"][aria-busy="true"]';

export async function waitForDiagramIdle(page: Page) {
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
  }).toPass({ timeout: 60_000 });
}

export async function expectCanvasReady(page: Page): Promise<Locator> {
  await waitForDiagramIdle(page);
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
  await button.scrollIntoViewIfNeeded();
  // Canvas nodes can overlap zoom controls at large viewports; force avoids flaky hit-testing.
  await button.click({ force: true });

  await expectCanvasReady(page);
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
