import { test, expect } from '@playwright/test';
import { clickCanvasNode, expectGoldenJourneyEstateReady } from './helpers/canvas';
import { joinLiveDiagram } from './helpers/collab';

test.describe('Live room node comments', () => {
  test('peers see a node comment and it leaves the open thread after resolve', async ({
    page,
    context,
  }) => {
    test.setTimeout(180_000);
    const roomId = `e2e-comments-${Date.now()}`;
    const roomPath = `/workspace/samples/golden-journey?room=${roomId}`;

    await joinLiveDiagram(page, roomPath, 'Ada');
    await expectGoldenJourneyEstateReady(page);

    const peer = await context.newPage();
    try {
      await joinLiveDiagram(peer, roomPath, 'Grace');
      await expectGoldenJourneyEstateReady(peer);
      await expect(page.getByTestId('collab-connected-count')).toHaveText('2', {
        timeout: 20_000,
      });

      await clickCanvasNode(page, 'Checkout API');
      const hostThread = page.getByTestId('node-comments-section');
      await expect(hostThread).toBeVisible({ timeout: 20_000 });
      await hostThread.getByLabel('Comment').fill('needs a circuit breaker');
      await hostThread.getByRole('button', { name: 'Add comment' }).click();
      await expect(hostThread.getByText('needs a circuit breaker')).toBeVisible();
      await expect(hostThread.getByText('Ada', { exact: true })).toBeVisible();

      await clickCanvasNode(peer, 'Checkout API');
      const peerThread = peer.getByTestId('node-comments-section');
      await expect(peerThread).toBeVisible({ timeout: 20_000 });
      await expect(peerThread.getByText('needs a circuit breaker')).toBeVisible();
      await expect(peerThread.getByText('Ada', { exact: true })).toBeVisible();

      await hostThread.getByRole('button', { name: 'Resolve comment' }).click();
      await expect(peerThread.getByText('needs a circuit breaker')).toHaveCount(0);
    } finally {
      await peer.close().catch(() => undefined);
    }
  });
});
