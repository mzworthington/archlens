import { test, expect } from '@playwright/test';
import { clickCanvasNodeHeading, expectGoldenJourneyEstateReady } from './helpers/canvas';
import { joinLiveDiagram, shareLoadedLiveDiagram } from './helpers/collab';
import { gotoApp } from './helpers/navigation';

test.describe('Live room node comments', () => {
  test('peers see a node comment and it leaves the open thread after resolve', async ({
    page,
    context,
  }) => {
    test.setTimeout(180_000);

    await gotoApp(page, '/workspace/samples/golden-journey');
    await expectGoldenJourneyEstateReady(page);
    const roomPath = await shareLoadedLiveDiagram(page, 'Ada');

    const peer = await context.newPage();
    try {
      await joinLiveDiagram(peer, roomPath, 'Grace');
      await expect(page.getByTestId('collab-connected-count')).toHaveText('2', {
        timeout: 20_000,
      });
      await expect(
        peer.locator('.react-flow__node').filter({ hasText: 'Checkout API' })
      ).toBeVisible({ timeout: 30_000 });

      await clickCanvasNodeHeading(page, 'Checkout API');
      const hostThread = page.getByTestId('node-comments-section');
      await expect(hostThread).toBeVisible({ timeout: 20_000 });
      await hostThread.getByRole('textbox', { name: 'Comment' }).fill('needs a circuit breaker');
      await hostThread.getByRole('button', { name: 'Add comment' }).click();
      await expect(hostThread.getByText('needs a circuit breaker')).toBeVisible();
      await expect(hostThread.getByText('Ada', { exact: true })).toBeVisible();

      await clickCanvasNodeHeading(peer, 'Checkout API');
      const peerThread = peer.getByTestId('node-comments-section');
      await expect(peerThread).toBeVisible({ timeout: 20_000 });
      await expect(peerThread.getByText('needs a circuit breaker')).toBeVisible({
        timeout: 15_000,
      });
      await expect(peerThread.getByText('Ada', { exact: true })).toBeVisible();

      await hostThread.getByRole('button', { name: 'Resolve comment' }).click();
      await expect(peerThread.getByText('needs a circuit breaker')).toHaveCount(0);
    } finally {
      await peer.close().catch(() => undefined);
    }
  });
});
