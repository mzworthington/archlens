import { test, expect } from '@playwright/test';
import {
  loadChaoslensLargeGraphDiagram,
  runChaoslensDomainOrdersOutageDemo,
} from './helpers/chaoslens';

test.describe('ChaosLens smoke', () => {
  test('simulates domain-orders outage on large-graph stress diagram', async ({ page }) => {
    test.setTimeout(120_000);
    await loadChaoslensLargeGraphDiagram(page);
    await runChaoslensDomainOrdersOutageDemo(page);
    await expect(page.locator('[data-hotspot-heat]').first()).toBeVisible();
  });
});
