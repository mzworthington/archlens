import { expect, type Page } from '@playwright/test';
import { expectGoldenJourneyEstateReady } from './canvas';
import { selectFaultTarget } from './chaoslens';
import { releaseE2ePage } from './navigation';
import { loadSandbox, ensureRightPanelOpen } from './workspace';

const GOLDEN_JOURNEY_ESTATE_PATH = '/workspace/samples/golden-journey';
const PAYMENT_GATEWAY_LABEL = 'Payment Gateway';

/** Load the golden journey estate diagram used by the outage demo. */
export async function loadGoldenJourneyDiagram(page: Page) {
  await loadSandbox(page, GOLDEN_JOURNEY_ESTATE_PATH);
}

export type GoldenJourneyDemoOptions = {
  onRecordingStart?: () => void | Promise<void>;
};

/** Simulate Payment Gateway region outage and expect AdviceLens circuit-breaker recommendation. */
export async function runGoldenJourneyOutageDemo(page: Page, options?: GoldenJourneyDemoOptions) {
  const recording = Boolean(options?.onRecordingStart);
  await expectGoldenJourneyEstateReady(page);
  await page.getByRole('button', { name: /enter resilience mode/i }).click();
  await expect(page.getByRole('button', { name: /exit resilience mode/i })).toBeVisible({
    timeout: 30_000,
  });
  await ensureRightPanelOpen(page);
  await expect(page.getByTestId('fault-controls')).toBeVisible({ timeout: 30_000 });
  await options?.onRecordingStart?.();
  if (recording) await page.waitForTimeout(600);

  await expectGoldenJourneyEstateReady(page);
  await selectFaultTarget(page, PAYMENT_GATEWAY_LABEL);
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
