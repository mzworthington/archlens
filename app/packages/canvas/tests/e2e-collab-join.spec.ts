import { test, expect } from '@playwright/test';
import { joinLiveDiagram } from './helpers/collab';

test.describe('Share-link join', () => {
  test('entering a display name shows a connected count that includes me', async ({ page }) => {
    test.setTimeout(90_000);
    const roomId = `e2e-join-${Date.now()}`;
    await joinLiveDiagram(page, `/workspace/samples/golden-journey?room=${roomId}`, 'Ada');

    await expect(page.getByTestId('collab-connected-count')).toHaveText('1', {
      timeout: 20_000,
    });
  });
});
