import { expect, type BrowserContext, type Page } from '@playwright/test';
import { gotoApp } from './navigation';

const COLLAB_DOCS_VIEWPORT = { width: 960, height: 600 } as const;

export const COLLAB_DOCS_PEERS = [
  { name: 'Bob', node: 'Subscriber' },
  { name: 'Carol', node: 'Shopper' },
  { name: 'Dev', node: 'Billing Worker' },
  { name: 'Elena', node: 'Catalog API' },
  { name: 'Farah', node: 'Checkout API' },
] as const;

type FlowHandle = {
  screenToFlowPosition: (position: { x: number; y: number }) => { x: number; y: number };
  flowToScreenPosition: (position: { x: number; y: number }) => { x: number; y: number };
};

export function peerCursor(page: Page, name: string) {
  return page.locator(`[data-testid^="collab-cursor-"][data-collab-name="${cssAttr(name)}"]`);
}

function cssAttr(value: string): string {
  return value.replaceAll('\\', '\\\\').replaceAll('"', '\\"');
}

async function applyCollabDocsViewport(page: Page) {
  await page.setViewportSize(COLLAB_DOCS_VIEWPORT);
}

export async function joinLiveDiagram(page: Page, pathWithRoom: string, name: string) {
  await gotoApp(page, pathWithRoom);
  const nameDialog = page.getByTestId('collab-join-name-dialog');
  await expect(nameDialog).toBeVisible({ timeout: 20_000 });
  await nameDialog.getByLabel('Your name').fill(name);
  await nameDialog.getByRole('button', { name: 'Join', exact: true }).click();
  await expect(nameDialog).toHaveCount(0, { timeout: 15_000 });
}

async function expectBlankCollabCanvasReady(page: Page) {
  await expect(page).toHaveURL(/[?&]room=/);
  await expect(page.locator('.react-flow__pane')).toBeVisible({ timeout: 30_000 });
  await expect(page.getByTestId('diagram-loading-overlay')).toHaveCount(0);
}

async function zoomBlankCanvas(page: Page, percent = 125) {
  await page.evaluate(async zoomPercent => {
    type SetViewportHandle = {
      setViewport: (viewport: { x: number; y: number; zoom: number }) => Promise<void> | void;
    };
    const host = document.querySelector('.react-flow') as
      | (HTMLElement & {
          __archlensReactFlow?: SetViewportHandle;
        })
      | null;
    const flow = host?.__archlensReactFlow;
    if (!flow) throw new Error('React Flow instance missing');
    await flow.setViewport({ x: 0, y: 0, zoom: zoomPercent / 100 });
  }, percent);
  await expect(page.getByTestId('canvas-zoom-percent')).toHaveText(`${percent}%`, {
    timeout: 5_000,
  });
}

async function collapseWorkspacePanels(page: Page) {
  const left = page.getByTestId('left-panel');
  if ((await left.count()) > 0) {
    await page.getByTestId('left-panel-rail').click();
    await expect(left).toHaveCount(0, { timeout: 10_000 });
  }
  const right = page.getByTestId('right-panel');
  if ((await right.count()) > 0) {
    await page.getByTestId('right-panel-rail').click();
    await expect(right).toHaveCount(0, { timeout: 10_000 });
  }
}

/** Capture from the canvas origin (top-left of the flow pane). */
export async function screenshotFromTopLeft(page: Page, filePath: string) {
  const overlay = page.getByTestId('empty-diagram-overlay');
  if ((await overlay.count()) > 0) {
    await overlay.evaluate(el => el.remove());
  }
  const flow = page.locator('.react-flow');
  const box = await flow.boundingBox();
  if (!box) throw new Error('React Flow has no bounding box');

  await page.screenshot({
    path: filePath,
    clip: {
      x: Math.max(0, box.x),
      y: Math.max(0, box.y),
      width: Math.floor(box.width),
      height: Math.floor(box.height),
    },
    animations: 'disabled',
  });
}

async function paneFlowCenter(page: Page): Promise<{ x: number; y: number }> {
  const pane = page.locator('.react-flow__pane');
  await expect(pane).toBeVisible({ timeout: 20_000 });
  const box = await pane.boundingBox();
  if (!box) throw new Error('React Flow pane has no bounding box');
  return page.evaluate(
    ({ x, y }) => {
      const host = document.querySelector('.react-flow') as
        | (HTMLElement & {
            __archlensReactFlow?: FlowHandle;
          })
        | null;
      const flow = host?.__archlensReactFlow;
      if (!flow) throw new Error('React Flow instance missing');
      return flow.screenToFlowPosition({ x, y });
    },
    { x: box.x + box.width / 2, y: box.y + box.height / 2 }
  );
}

function scatterNearFlow(index: number): { x: number; y: number } {
  const seed = ((index + 1) * 1_103_515_245 + 12_345) >>> 0;
  const radius = 36 + (seed % 56);
  const angle = ((index * 72 + (seed % 40)) * Math.PI) / 180;
  return { x: Math.cos(angle) * radius, y: Math.sin(angle) * radius };
}

export async function parkPeerCursors(
  host: Page,
  peers: Page[],
  placements: readonly { name: string; node: string }[] = COLLAB_DOCS_PEERS
) {
  const origin = await paneFlowCenter(host);
  for (const [index, placement] of placements.entries()) {
    const peer = peers[index];
    if (!peer) throw new Error(`Missing guest page for ${placement.name}`);
    const delta = scatterNearFlow(index);
    const flowPosition = { x: origin.x + delta.x, y: origin.y + delta.y };
    await peer.bringToFront();
    const screen = await peer.evaluate(position => {
      const hostEl = document.querySelector('.react-flow') as
        | (HTMLElement & {
            __archlensReactFlow?: FlowHandle;
          })
        | null;
      const flow = hostEl?.__archlensReactFlow;
      if (!flow) throw new Error('React Flow instance missing');
      return flow.flowToScreenPosition(position);
    }, flowPosition);
    await peer.mouse.move(screen.x, screen.y, { steps: 16 });
    await peer.waitForTimeout(200);
    await expect(peerCursor(host, placement.name)).toBeVisible({ timeout: 15_000 });
  }
  await expect(host.locator('[data-testid^="collab-cursor-"]')).toHaveCount(placements.length);
}

/** Host plus guests in a blank room so the host canvas shows named peer cursors. */
export async function openMultiCursorCollabSession(
  host: Page,
  context: BrowserContext,
  options?: { hostName?: string; peerNames?: readonly string[] }
): Promise<{ peers: Page[]; roomPath: string }> {
  const hostName = options?.hostName ?? 'Ada';
  const peerNames = options?.peerNames ?? COLLAB_DOCS_PEERS.map(peer => peer.name);

  await context.grantPermissions(['clipboard-read', 'clipboard-write']);
  await applyCollabDocsViewport(host);
  const roomPath = `/workspace/empty-workspace?room=e2e-cursors-${Date.now()}`;
  await joinLiveDiagram(host, roomPath, hostName);
  await expectBlankCollabCanvasReady(host);
  await collapseWorkspacePanels(host);
  await zoomBlankCanvas(host, 125);

  const peers: Page[] = [];
  for (const name of peerNames) {
    const peer = await context.newPage();
    peers.push(peer);
    await applyCollabDocsViewport(peer);
    await joinLiveDiagram(peer, roomPath, name);
    await expectBlankCollabCanvasReady(peer);
  }

  await expect(host.getByTestId('collab-connected-count')).toHaveText(
    String(1 + peerNames.length),
    {
      timeout: 20_000,
    }
  );

  return { peers, roomPath };
}

export async function closeCollabPeers(peers: Page[]) {
  for (const peer of peers) {
    await peer.close().catch(() => undefined);
  }
}
