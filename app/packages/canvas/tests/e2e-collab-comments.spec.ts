import { test, expect, type Page } from '@playwright/test';
import { expectGoldenJourneyEstateReady, selectWorkspaceNode } from './helpers/canvas';
import { joinLiveDiagram, shareLoadedLiveDiagram } from './helpers/collab';
import { gotoApp } from './helpers/navigation';

async function clearEstateCanvasSelection(page: Page) {
  const pane = page.locator('.react-flow__pane');
  await expect(pane).toBeVisible({ timeout: 20_000 });
  const box = await pane.boundingBox();
  if (!box) throw new Error('React Flow pane has no bounding box');
  await pane.click({
    force: true,
    position: { x: 8, y: Math.max(box.height - 12, 8) },
  });
  await expect(page.getByLabel('Entity Reference')).toHaveValue('samples/golden-journey', {
    timeout: 15_000,
  });
}

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

      const checkoutRef = 'samples/golden-journey/checkout-platform/checkout-api';
      await selectWorkspaceNode(page, 'Checkout API', checkoutRef);
      const hostThread = page.getByTestId('node-comments-section');
      await expect(hostThread).toBeVisible({ timeout: 20_000 });
      await hostThread.getByRole('textbox', { name: 'Comment' }).fill('needs a circuit breaker');
      await hostThread.getByRole('button', { name: 'Add comment' }).click();
      await expect(hostThread.getByText('needs a circuit breaker')).toBeVisible();
      await expect(hostThread.getByText('Ada', { exact: true })).toBeVisible();

      await selectWorkspaceNode(peer, 'Checkout API', checkoutRef);
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

  test('peers see a diagram comment when no node is selected', async ({ page, context }) => {
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

      await clearEstateCanvasSelection(page);
      const hostThread = page.getByTestId('node-comments-section');
      await expect(hostThread).toBeVisible({ timeout: 20_000 });
      await hostThread.getByRole('textbox', { name: 'Comment' }).fill('start from the estate map');
      await hostThread.getByRole('button', { name: 'Add comment' }).click();
      await expect(hostThread.getByText('start from the estate map')).toBeVisible();

      await clearEstateCanvasSelection(peer);
      const peerThread = peer.getByTestId('node-comments-section');
      await expect(peerThread).toBeVisible({ timeout: 20_000 });
      await expect(peerThread.getByText('start from the estate map')).toBeVisible({
        timeout: 15_000,
      });
    } finally {
      await peer.close().catch(() => undefined);
    }
  });
});
