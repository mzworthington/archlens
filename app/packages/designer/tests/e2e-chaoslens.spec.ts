import { test } from '@playwright/test';
import {
  loadChaoslensLargeGraphDiagram,
  runChaoslensDomainOrdersOutageDemo,
} from './helpers/chaoslens';

test.describe('ChaosLens smoke', () => {
  test.skip(
    true,
    'chaoslens-stress diagrams are not in the bundled Golden Paths sample; needs a folder workspace fixture'
  );

  test('simulates domain-orders outage on large-graph stress diagram', async ({ page }) => {
    test.setTimeout(180_000);
    await loadChaoslensLargeGraphDiagram(page);
    await runChaoslensDomainOrdersOutageDemo(page);
  });
});
