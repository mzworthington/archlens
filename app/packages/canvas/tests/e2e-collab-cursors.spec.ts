import { test, expect } from '@playwright/test';
import {
  closeCollabPeers,
  COLLAB_DOCS_PEERS,
  openMultiCursorCollabSession,
  parkPeerCursors,
  peerCursor,
  screenshotFromTopLeft,
} from './helpers/collab';
import { docsScreenshotPath, RECORD_DOCS_MEDIA } from './helpers/docsMedia';

test.describe('Live collaboration cursors', () => {
  test('named peer cursors appear on the host canvas', async ({ page, context }) => {
    test.setTimeout(180_000);
    const { peers } = await openMultiCursorCollabSession(page, context);
    try {
      await parkPeerCursors(page, peers);
      for (const peer of COLLAB_DOCS_PEERS) {
        await expect(peerCursor(page, peer.name)).toBeVisible();
      }
      await page.bringToFront();
      if (RECORD_DOCS_MEDIA) {
        await screenshotFromTopLeft(page, docsScreenshotPath('9-collab-cursors.png'));
      }
    } finally {
      await closeCollabPeers(peers);
    }
  });
});
