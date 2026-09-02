#!/usr/bin/env node
import { spawnSync } from 'node:child_process';
import { appendFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import {
  cacheBustUrl,
  evaluateCanvasSmoke,
  evaluateCollabSmoke,
  evaluateRestoredCanvasSmoke,
  formatSmokeSummary,
  parseCollabHealth,
  parseVersionDocument,
  type SmokeResult,
} from './evaluate.ts';
import {
  pickPreviousPagesDeploymentId,
  pickPreviousWorkerVersionId,
  rollbackPlan,
} from './previousIdentity.ts';

const CANVAS_ORIGIN = process.env.CANVAS_ORIGIN ?? 'https://archlens.dev';
const COLLAB_ORIGIN = process.env.COLLAB_ORIGIN ?? 'https://collab.archlens.dev';
const PAGES_PROJECT = process.env.PAGES_PROJECT ?? 'archlens';
const COLLAB_SCRIPT = process.env.COLLAB_SCRIPT ?? 'archlens-collab';
const ATTEMPTS = Number(process.env.SMOKE_ATTEMPTS ?? 12);
const DELAY_MS = Number(process.env.SMOKE_DELAY_MS ?? 5000);

function requiredEnv(name: string): string {
  const value = process.env[name]?.trim();
  if (!value) {
    throw new Error(`${name} is required`);
  }
  return value;
}

function writeGithubOutput(pairs: Record<string, string>): void {
  const dest = process.env.GITHUB_OUTPUT;
  const body = Object.entries(pairs)
    .map(([key, value]) => `${key}=${value}`)
    .join('\n');
  if (dest) {
    appendFileSync(dest, `${body}\n`);
    return;
  }
  process.stdout.write(`${body}\n`);
}

function writeSummary(lines: string[]): void {
  const dest = process.env.GITHUB_STEP_SUMMARY;
  const body = `${formatSmokeSummary(lines)}\n`;
  if (dest) {
    appendFileSync(dest, body);
    return;
  }
  process.stdout.write(body);
}

async function cfApi(path: string, init: RequestInit = {}): Promise<unknown> {
  const token = requiredEnv('CLOUDFLARE_API_TOKEN');
  const accountId = requiredEnv('CLOUDFLARE_ACCOUNT_ID');
  const response = await fetch(
    `https://api.cloudflare.com/client/v4/accounts/${accountId}${path}`,
    {
      ...init,
      headers: {
        authorization: `Bearer ${token}`,
        'content-type': 'application/json',
        ...(init.headers ?? {}),
      },
    }
  );
  const body: unknown = await response.json().catch(() => null);
  if (!response.ok) {
    throw new Error(`Cloudflare API ${path} failed (${response.status}): ${JSON.stringify(body)}`);
  }
  return body;
}

async function readJson(url: string): Promise<unknown> {
  const response = await fetch(url, { headers: { 'cache-control': 'no-cache' } });
  if (!response.ok) return null;
  return response.json().catch(() => null);
}

async function readText(url: string): Promise<{ status: number; text: string }> {
  const response = await fetch(url, { headers: { 'cache-control': 'no-cache' } });
  return { status: response.status, text: await response.text() };
}

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function capturePages(): Promise<void> {
  const deployments = await cfApi(`/pages/projects/${PAGES_PROJECT}/deployments`);
  const previousId = pickPreviousPagesDeploymentId(deployments) ?? '';
  const version = parseVersionDocument(
    await readJson(cacheBustUrl(`${CANVAS_ORIGIN}/version.json`, Date.now()))
  );
  writeGithubOutput({
    previous_deployment_id: previousId,
    previous_sha: version?.sha ?? '',
  });
}

async function captureCollab(): Promise<void> {
  const deployments = await cfApi(`/workers/scripts/${COLLAB_SCRIPT}/deployments`);
  const previousId = pickPreviousWorkerVersionId(deployments) ?? '';
  const health = parseCollabHealth(await readJson(`${COLLAB_ORIGIN}/health`));
  writeGithubOutput({
    previous_version_id: previousId,
    previous_sha: health?.sha ?? '',
  });
}

async function smokeCanvas(expectedSha: string): Promise<SmokeResult> {
  let last: SmokeResult = { ok: false, reason: 'canvas smoke did not run' };
  for (let attempt = 1; attempt <= ATTEMPTS; attempt += 1) {
    const version = parseVersionDocument(
      await readJson(cacheBustUrl(`${CANVAS_ORIGIN}/version.json`, Date.now() + attempt))
    );
    const page = await readText(`${CANVAS_ORIGIN}/workspace`);
    last = evaluateCanvasSmoke({
      expectedSha,
      version,
      pageStatus: page.status,
      pageHtml: page.text,
    });
    if (last.ok) return last;
    await sleep(DELAY_MS);
  }
  return last;
}

async function smokeCollab(expectedSha: string): Promise<SmokeResult> {
  let last: SmokeResult = { ok: false, reason: 'collab smoke did not run' };
  for (let attempt = 1; attempt <= ATTEMPTS; attempt += 1) {
    last = evaluateCollabSmoke({
      expectedSha,
      health: parseCollabHealth(await readJson(`${COLLAB_ORIGIN}/health`)),
    });
    if (last.ok) return last;
    await sleep(DELAY_MS);
  }
  return last;
}

async function smokeCanvasRestore(
  rejectedSha: string,
  previousSha: string | null
): Promise<SmokeResult> {
  let last: SmokeResult = { ok: false, reason: 'canvas restore smoke did not run' };
  for (let attempt = 1; attempt <= ATTEMPTS; attempt += 1) {
    const version = parseVersionDocument(
      await readJson(cacheBustUrl(`${CANVAS_ORIGIN}/version.json`, Date.now() + attempt))
    );
    const page = await readText(`${CANVAS_ORIGIN}/workspace`);
    last = evaluateRestoredCanvasSmoke({
      rejectedSha,
      expectedSha: previousSha,
      version,
      pageStatus: page.status,
      pageHtml: page.text,
    });
    if (last.ok) return last;
    await sleep(DELAY_MS);
  }
  return last;
}

async function rollbackPages(previousId: string): Promise<void> {
  await cfApi(`/pages/projects/${PAGES_PROJECT}/deployments/${previousId}/rollback`, {
    method: 'POST',
  });
}

function rollbackCollab(previousId: string): void {
  const result = spawnSync(
    'pnpm',
    [
      'exec',
      'wrangler',
      'rollback',
      previousId,
      '--message',
      'smoke failed; restore previous version',
    ],
    {
      cwd: fileURLToPath(new URL('../../packages/collab/', import.meta.url)),
      stdio: 'inherit',
    }
  );
  if (result.status !== 0) {
    throw new Error(`wrangler rollback failed with status ${result.status ?? 'unknown'}`);
  }
}

async function smoke(): Promise<void> {
  const expectedSha = requiredEnv('EXPECTED_SHA');
  const pagesPreviousId = process.env.PAGES_PREVIOUS_DEPLOYMENT_ID?.trim() || null;
  const pagesPreviousSha = process.env.PAGES_PREVIOUS_SHA?.trim() || null;
  const collabPreviousId = process.env.COLLAB_PREVIOUS_VERSION_ID?.trim() || null;
  const collabPreviousSha = process.env.COLLAB_PREVIOUS_SHA?.trim() || null;

  const canvas = await smokeCanvas(expectedSha);
  const collab = await smokeCollab(expectedSha);
  const lines = [
    `sha: \`${expectedSha}\``,
    `canvas: ${canvas.ok ? 'pass' : `fail (${canvas.reason})`}`,
    `collab: ${collab.ok ? 'pass' : `fail (${collab.reason})`}`,
    `url: ${CANVAS_ORIGIN}/workspace`,
    `health: ${COLLAB_ORIGIN}/health`,
  ];

  let restoredFailed = false;
  const canvasPlan = rollbackPlan({ smokeOk: canvas.ok, previousId: pagesPreviousId });
  if (canvasPlan.action === 'restore') {
    await rollbackPages(canvasPlan.previousId);
    const restored = await smokeCanvasRestore(expectedSha, pagesPreviousSha);
    lines.push(
      `canvas rollback: ${restored.ok ? `restored ${canvasPlan.previousId}` : `restore smoke failed`}`
    );
    if (!restored.ok) restoredFailed = true;
  } else if (canvasPlan.action === 'fail-loud') {
    lines.push('canvas rollback: no previous Pages deployment to restore');
    restoredFailed = true;
  }

  const collabPlan = rollbackPlan({ smokeOk: collab.ok, previousId: collabPreviousId });
  if (collabPlan.action === 'restore') {
    rollbackCollab(collabPlan.previousId);
    const restored = collabPreviousSha
      ? await smokeCollab(collabPreviousSha)
      : await smokeCollab(expectedSha);
    lines.push(
      `collab rollback: ${restored.ok ? `restored ${collabPlan.previousId}` : `restore smoke failed`}`
    );
    if (!restored.ok) restoredFailed = true;
  } else if (collabPlan.action === 'fail-loud') {
    lines.push('collab rollback: no previous Worker version to restore');
    restoredFailed = true;
  }

  writeSummary(lines);
  if (!canvas.ok || !collab.ok || restoredFailed) {
    process.exitCode = 1;
  }
}

const command = process.argv[2];
try {
  if (command === 'capture-pages') {
    await capturePages();
  } else if (command === 'capture-collab') {
    await captureCollab();
  } else if (command === 'smoke') {
    await smoke();
  } else {
    throw new Error('Usage: run.ts capture-pages|capture-collab|smoke');
  }
} catch (error) {
  const message = error instanceof Error ? error.message : String(error);
  writeSummary([`error: ${message}`]);
  console.error(message);
  process.exitCode = 1;
}
