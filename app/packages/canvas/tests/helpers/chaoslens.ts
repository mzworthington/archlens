import { expect, type Page } from '@playwright/test';
import { clickCanvasNode, expectCanvasReady } from './canvas';
import { releaseE2ePage } from './navigation';
import { loadSandbox, ensureRightPanelOpen } from './workspace';

const LARGE_GRAPH_PATH = '/workspace/chaoslens-stress/large-graph';
const FAULT_NODE_LABEL = 'Orders Domain';

async function holdForRecording(page: Page, ms: number, recording: boolean) {
  if (recording) await page.waitForTimeout(ms);
}

/**
 * Fit the large stress graphs into view, then select a node.
 * `onlyRenderVisibleElements` culls off-screen nodes, so force-clicking a culled
 * label can succeed on a stale locator without updating `selectedNodeId`.
 */
async function fitAndSelect(page: Page, label: string) {
  const fit = page.getByRole('button', { name: 'Fit View' });
  if (await fit.isVisible().catch(() => false)) {
    await fit.click();
    await expectCanvasReady(page, 30_000);
  }
  await clickCanvasNode(page, label);
}

/** Select until ChaosLens FaultControls shows the node as the active target. */
export async function selectFaultTarget(page: Page, label: string) {
  const faultControls = page.getByTestId('fault-controls');
  await expect(faultControls).toBeVisible({ timeout: 30_000 });
  const target = faultControls.getByText(`Target: ${label}`, { exact: true });

  await expect(async () => {
    await fitAndSelect(page, label);
    await expect(target).toBeVisible({ timeout: 5_000 });
  }).toPass({ timeout: 45_000 });
}

/** Load large-graph stress diagram with Orders Domain selected. */
export async function loadChaoslensLargeGraphDiagram(page: Page) {
  await loadSandbox(page, LARGE_GRAPH_PATH);
  await fitAndSelect(page, FAULT_NODE_LABEL);
  await expect(
    page.locator('.react-flow__node').filter({ hasText: FAULT_NODE_LABEL }).first()
  ).toBeVisible();
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
  const recording = Boolean(options?.onRecordingStart);
  await expectCanvasReady(page);
  await page.getByRole('button', { name: /enter resilience mode/i }).click();
  await expect(page.getByRole('button', { name: /exit resilience mode/i })).toBeVisible({
    timeout: 30_000,
  });
  await ensureRightPanelOpen(page);
  await options?.onRecordingStart?.();
  await holdForRecording(page, 800, recording);

  await selectFaultTarget(page, FAULT_NODE_LABEL);
  await holdForRecording(page, 600, recording);

  await page.getByRole('radio', { name: 'Region outage' }).click();
  await holdForRecording(page, 400, recording);

  await page.getByTestId('add-fault-to-scenario').click();
  await expect(page.getByRole('button', { name: /run resilience simulation/i })).toBeEnabled({
    timeout: 10_000,
  });

  // Collapse the panel so the blast ripple is visible on the canvas in recordings.
  await page.getByTestId('right-panel-rail').click();
  await holdForRecording(page, 300, recording);

  await page.getByRole('button', { name: /run resilience simulation/i }).click();
  await expect(page.locator('[data-availability-heat]').first()).toBeVisible({ timeout: 60_000 });
  // Partial blast on large graph - hold on heated nodes after ripple (docs GIF only).
  await holdForRecording(page, 2_500, recording);
  await releaseE2ePage(page);
}
