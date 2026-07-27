import { expect, type Page } from '@playwright/test';
import { clickCanvasNode } from './canvas';
import { loadSandbox } from './workspace';

const LARGE_GRAPH_PATH = '/workspace/blueprint/chaoslens-stress/large-graph';
const LARGE_GRAPH_ORDERS_PATH = '/workspace/blueprint/chaoslens-stress/large-graph/domain-orders';
const FAULT_NODE_LABEL = 'Orders Domain';

/** Load large-graph stress diagram with Orders Domain selected. */
export async function loadChaoslensLargeGraphDiagram(page: Page) {
  await loadSandbox(page, LARGE_GRAPH_PATH);
  await clickCanvasNode(page, FAULT_NODE_LABEL);
  await expect(page).toHaveURL(LARGE_GRAPH_ORDERS_PATH, { timeout: 15_000 });
  await page.waitForTimeout(1_500);
}

/** Docs / smoke flow: enter ChaosLens, fault Orders Domain, simulate, show blast on canvas. */
export async function runChaoslensDomainOrdersOutageDemo(page: Page) {
  await page.getByRole('button', { name: /enter resilience mode/i }).click();
  await expect(page.getByRole('button', { name: /exit resilience mode/i })).toBeVisible({
    timeout: 30_000,
  });
  await page.waitForTimeout(800);

  await clickCanvasNode(page, FAULT_NODE_LABEL);
  await expect(page.getByText(`Target: ${FAULT_NODE_LABEL}`)).toBeVisible({ timeout: 10_000 });
  await page.waitForTimeout(600);

  await page.getByRole('radio', { name: 'Region outage' }).click();
  await page.waitForTimeout(400);

  // Collapse the panel so the blast ripple is visible on the canvas in recordings.
  await page.getByRole('button', { name: 'Toggle Right Panel' }).click();
  await page.waitForTimeout(300);

  await page.getByRole('button', { name: /run resilience simulation/i }).click();
  await expect(page.locator('[data-hotspot-heat]').first()).toBeVisible({ timeout: 60_000 });
  // Partial blast on large graph — hold on heated nodes after ripple.
  await page.waitForTimeout(2_500);
}
