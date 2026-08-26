import { test } from '@playwright/test';
import { RECORD_DOCS_MEDIA, writeRecordingTrimMarker } from '../helpers/docsMedia';
import {
  loadChaoslensLargeGraphDiagram,
  runChaoslensDomainOrdersOutageDemo,
} from '../helpers/chaoslens';
import { loadGoldenJourneyDiagram, runGoldenJourneyOutageDemo } from '../helpers/goldenJourney';
import { runTraceLensDemo } from '../helpers/tracelensDemo';
import { loadSandbox } from '../helpers/workspace';
import { drillIntoZoomable, expectCanvasReady } from '../helpers/canvas';

test.describe('docs media recordings', () => {
  test.skip(!RECORD_DOCS_MEDIA, 'Set RECORD_DOCS_MEDIA=1 to record docs media');

  test('canvas-tour.gif', async ({ page }) => {
    await loadSandbox(page);
    await expectCanvasReady(page);

    await page.getByRole('button', { name: 'Toggle left panel' }).click();
    await page.getByRole('button', { name: 'Toggle right panel' }).click();
    await page.waitForTimeout(600);

    await page.getByRole('button', { name: 'Toggle left panel' }).click();
    await page.getByRole('button', { name: 'Toggle right panel' }).click();
    await page.waitForTimeout(400);

    await drillIntoZoomable(page, 'Golden Journey');
    await page.waitForTimeout(600);

    await drillIntoZoomable(page, 'Checkout API');
    await page.waitForTimeout(600);

    await page.getByTestId('zoom-out-button').click();
    await expectCanvasReady(page);
    await page.waitForTimeout(400);

    await page.getByTestId('zoom-out-button').click();
    await expectCanvasReady(page);
    await page.waitForTimeout(400);
  });

  test('golden-journey.gif', async ({ page }, testInfo) => {
    const recordingStartedAt = Date.now();
    await loadGoldenJourneyDiagram(page);
    await runGoldenJourneyOutageDemo(page, {
      onRecordingStart: () => {
        writeRecordingTrimMarker(testInfo.outputDir, (Date.now() - recordingStartedAt) / 1000);
      },
    });
    await page.waitForTimeout(600);
  });

  test('chaoslens.gif', async ({ page }, testInfo) => {
    const recordingStartedAt = Date.now();
    await loadChaoslensLargeGraphDiagram(page);
    await runChaoslensDomainOrdersOutageDemo(page, {
      onRecordingStart: () => {
        writeRecordingTrimMarker(testInfo.outputDir, (Date.now() - recordingStartedAt) / 1000);
      },
    });
    await page.waitForTimeout(600);
  });

  test('tracelens.gif', async ({ page }) => {
    test.setTimeout(120_000);
    await runTraceLensDemo(page);
    await page.waitForTimeout(600);
  });
});
