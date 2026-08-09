import { expect, type Page } from '@playwright/test';
import { expectCanvasReady } from './canvas';
import { gotoApp, releaseE2ePage } from './navigation';
import { loadSandbox, ensureRightPanelOpen } from './workspace';

export const GOLDEN_JOURNEY_PATH = '/workspace/samples/golden-journey';
export const GOLDEN_JOURNEY_ESTATE_PATH = '/workspace/samples/golden-journey';
export const PAYMENT_GATEWAY_ENTITY_REF = 'samples/golden-journey/payment-gateway';
export const PAYMENT_GATEWAY_LABEL = 'Payment Gateway';
export const CHECKOUT_API_LABEL = 'Checkout API';

/** Load the golden journey estate diagram used by the outage demo. */
export async function loadGoldenJourneyDiagram(page: Page) {
  await loadSandbox(page, GOLDEN_JOURNEY_ESTATE_PATH);
}

async function paymentGatewayTargetVisible(page: Page): Promise<boolean> {
  return page
    .getByText(`Target: ${PAYMENT_GATEWAY_LABEL}`)
    .isVisible()
    .catch(() => false);
}

/**
 * Select Payment Gateway even when onlyRenderVisibleElements has culled it
 * (common after context → estate navigation leaves the viewport tight).
 */
export async function selectPaymentGateway(page: Page) {
  const paymentNode = page.locator(`.react-flow__node[data-id="${PAYMENT_GATEWAY_ENTITY_REF}"]`);

  await page.getByRole('button', { name: 'Fit View' }).click();
  await expectCanvasReady(page, 30_000);

  if ((await paymentNode.count()) === 0) {
    const hub = page.getByTestId('external-summary-hub-targets');
    if (await hub.isVisible().catch(() => false)) {
      await hub.click();
      await expect(paymentNode).toBeVisible({ timeout: 30_000 });
    }
  }

  if ((await paymentNode.count()) > 0) {
    await paymentNode.scrollIntoViewIfNeeded();
    await paymentNode.click({ force: true });
    if (await paymentGatewayTargetVisible(page)) return;

    // Playwright mouse hits can miss nested RF nodes; the React click path still selects.
    await paymentNode.dispatchEvent('click');
    if (await paymentGatewayTargetVisible(page)) return;
  }

  // URL sync selects the node even when the canvas still hasn't mounted it.
  const url = new URL(page.url());
  url.pathname = `/workspace/${PAYMENT_GATEWAY_ENTITY_REF}`;
  await gotoApp(page, `${url.pathname}${url.search}`);
  await expectCanvasReady(page, 60_000);
}

export type GoldenJourneyDemoOptions = {
  onRecordingStart?: () => void | Promise<void>;
};

/** Simulate Payment Gateway region outage and expect AdviceLens circuit-breaker recommendation. */
export async function runGoldenJourneyOutageDemo(page: Page, options?: GoldenJourneyDemoOptions) {
  const recording = Boolean(options?.onRecordingStart);
  await page.getByRole('button', { name: /enter resilience mode/i }).click();
  await expect(page.getByRole('button', { name: /exit resilience mode/i })).toBeVisible({
    timeout: 30_000,
  });
  await ensureRightPanelOpen(page);
  await expect(page.getByTestId('fault-controls')).toBeVisible({ timeout: 30_000 });
  await options?.onRecordingStart?.();
  if (recording) await page.waitForTimeout(600);

  await selectPaymentGateway(page);
  await expect(page.getByText(`Target: ${PAYMENT_GATEWAY_LABEL}`)).toBeVisible({
    timeout: 15_000,
  });

  await page.getByRole('radio', { name: 'Region outage' }).click();
  await page.getByTestId('add-fault-to-scenario').click();
  await expect(page.getByRole('button', { name: /run resilience simulation/i })).toBeEnabled({
    timeout: 10_000,
  });

  await page.getByRole('button', { name: /run resilience simulation/i }).click();
  await expect(page.locator('[data-availability-heat]').first()).toBeVisible({ timeout: 60_000 });

  await expect(page.getByText(/In Checkout API, add a circuit breaker/i)).toBeVisible({
    timeout: 30_000,
  });

  if (recording) await page.waitForTimeout(1_500);
  await releaseE2ePage(page);
}
