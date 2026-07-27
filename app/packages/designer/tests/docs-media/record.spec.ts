import { test } from '@playwright/test';
import { RECORD_DOCS_MEDIA, writeRecordingTrimMarker } from '../helpers/docsMedia';
import {
  loadChaoslensLargeGraphDiagram,
  runChaoslensDomainOrdersOutageDemo,
} from '../helpers/chaoslens';
import { runTraceLensDemo } from '../helpers/tracelensDemo';
import { loadSandbox } from '../helpers/workspace';
import { drillIntoZoomable, expectCanvasReady } from '../helpers/canvas';

test.describe.configure({ mode: RECORD_DOCS_MEDIA ? 'default' : 'skip' });

test.describe('docs media recordings', () => {
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

  test('canvas-tour.gif', async ({ page }) => {
    await loadSandbox(page);
    await expectCanvasReady(page);

    await page.getByRole('button', { name: 'Toggle Left Panel' }).click();
    await page.getByRole('button', { name: 'Toggle Right Panel' }).click();
    await page.waitForTimeout(1_000);

    await page.getByRole('button', { name: 'Toggle Left Panel' }).click();
    await page.getByRole('button', { name: 'Toggle Right Panel' }).click();
    await page.waitForTimeout(800);

    await drillIntoZoomable(page, 'EShop System');
    await page.waitForTimeout(1_200);

    await drillIntoZoomable(page, 'Core Service');
    await page.waitForTimeout(1_500);

    await page.getByTestId('zoom-out-button').click();
    await expectCanvasReady(page);
    await page.waitForTimeout(800);

    await page.getByTestId('zoom-out-button').click();
    await expectCanvasReady(page);
    await page.waitForTimeout(600);
  });
});
