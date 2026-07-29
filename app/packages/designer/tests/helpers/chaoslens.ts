import { expect, type Page } from '@playwright/test';
import { clickCanvasNode } from './canvas';
import { loadSandbox } from './workspace';

const LARGE_GRAPH_PATH = '/workspace/blueprint/chaoslens-stress/large-graph';
const LARGE_GRAPH_ORDERS_PATH = '/workspace/blueprint/chaoslens-stress/large-graph/domain-orders';
const EXTERNAL_SCOPE_PATH = '/workspace/blueprint/chaoslens-stress/external-scope';
const FAULT_NODE_LABEL = 'Orders Domain';
const EXTERNAL_SCOPE_API_LABEL = 'API Gateway';
const EXTERNAL_AUTH_LABEL = 'Auth Service (External)';

/** Load large-graph stress diagram with Orders Domain selected. */
export async function loadChaoslensLargeGraphDiagram(page: Page) {
  await loadSandbox(page, LARGE_GRAPH_PATH);
  await clickCanvasNode(page, FAULT_NODE_LABEL);
  await expect(page).toHaveURL(LARGE_GRAPH_ORDERS_PATH, { timeout: 15_000 });
  await page.waitForTimeout(1_500);
}

export type ChaoslensDemoOptions = {
  /** Fires once resilience mode is active - use to mark docs-media recording start. */
  onRecordingStart?: () => void | Promise<void>;
};

/** Docs / smoke flow: enter ChaosLens, fault Orders Domain, simulate, show blast on canvas. */
export async function runChaoslensDomainOrdersOutageDemo(
  page: Page,
  options?: ChaoslensDemoOptions
) {
  await page.getByRole('button', { name: /enter resilience mode/i }).click();
  await expect(page.getByRole('button', { name: /exit resilience mode/i })).toBeVisible({
    timeout: 30_000,
  });
  await options?.onRecordingStart?.();
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
  // Partial blast on large graph - hold on heated nodes after ripple.
  await page.waitForTimeout(2_500);
}

/** Load external-scope stress diagram (API depends on workspace sibling Auth). */
export async function loadChaoslensExternalScopeDiagram(page: Page) {
  await loadSandbox(page, EXTERNAL_SCOPE_PATH);
  await clickCanvasNode(page, EXTERNAL_SCOPE_API_LABEL);
  await expect(page).toHaveURL(EXTERNAL_SCOPE_PATH, { timeout: 15_000 });
  await page.waitForTimeout(1_000);
}

/**
 * Docs / smoke flow: simulate API fault, materialize Auth external, fault Auth, show blast to Web.
 */
export async function runChaoslensExternalScopeDemo(page: Page, options?: ChaoslensDemoOptions) {
  await page.getByRole('button', { name: /enter resilience mode/i }).click();
  await expect(page.getByRole('button', { name: /exit resilience mode/i })).toBeVisible({
    timeout: 30_000,
  });
  await options?.onRecordingStart?.();
  await page.waitForTimeout(800);

  await clickCanvasNode(page, EXTERNAL_SCOPE_API_LABEL);
  await expect(page.getByText(`Target: ${EXTERNAL_SCOPE_API_LABEL}`)).toBeVisible({
    timeout: 10_000,
  });
  await expect(page.getByText(EXTERNAL_AUTH_LABEL)).toBeVisible({ timeout: 30_000 });

  await page.getByRole('button', { name: /run resilience simulation/i }).click();
  await page.waitForTimeout(1_000);

  await clickCanvasNode(page, EXTERNAL_AUTH_LABEL);
  await expect(page.getByText(`Target: ${EXTERNAL_AUTH_LABEL}`)).toBeVisible({
    timeout: 10_000,
  });

  await page.getByRole('radio', { name: 'Region outage' }).click();
  await page.getByRole('button', { name: /run resilience simulation/i }).click();
  await expect(page.locator('[data-hotspot-heat]').first()).toBeVisible({ timeout: 60_000 });
  await page.waitForTimeout(2_500);
}
