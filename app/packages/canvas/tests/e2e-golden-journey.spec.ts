import { test } from '@playwright/test';
import { loadGoldenJourneyDiagram, runGoldenJourneyOutageDemo } from './helpers/goldenJourney';

test.describe('Golden journey smoke', () => {
  test('payment gateway outage ranks circuit breaker on Checkout API', async ({ page }) => {
    test.setTimeout(180_000);
    await loadGoldenJourneyDiagram(page);
    await runGoldenJourneyOutageDemo(page);
  });
});
