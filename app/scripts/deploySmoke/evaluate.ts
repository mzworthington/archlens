export type VersionDocument = {
  sha: string;
  buildId: string;
};

export type CollabHealth = {
  ok: true;
  sha: string;
};

export type SmokeResult = { ok: true } | { ok: false; reason: string };

function readNonEmptyString(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

export function parseVersionDocument(body: unknown): VersionDocument | null {
  if (typeof body !== 'object' || body === null) return null;
  const record = body as Record<string, unknown>;
  const sha = readNonEmptyString(record.sha);
  if (!sha) return null;
  const buildId = readNonEmptyString(record.buildId) ?? sha.slice(0, 12);
  return { sha, buildId };
}

export function parseCollabHealth(body: unknown): CollabHealth | null {
  if (typeof body !== 'object' || body === null) return null;
  const record = body as Record<string, unknown>;
  if (record.ok !== true) return null;
  const sha = readNonEmptyString(record.sha);
  if (!sha) return null;
  return { ok: true, sha };
}

export function extractAppBuildId(html: string): string | null {
  const match = html.match(/<meta\s+name="app-build-id"\s+content="([^"]+)"/i);
  const value = match?.[1]?.trim();
  return value && value.length > 0 ? value : null;
}

export function evaluateCanvasSmoke(input: {
  expectedSha: string;
  version: VersionDocument | null;
  pageStatus: number;
  pageHtml: string;
}): SmokeResult {
  if (!input.version) {
    return { ok: false, reason: 'version.json missing or invalid' };
  }
  if (input.version.sha !== input.expectedSha) {
    return {
      ok: false,
      reason: `version.json sha ${input.version.sha} !== ${input.expectedSha}`,
    };
  }
  return evaluateCanvasOrigin(input.version, input.pageStatus, input.pageHtml);
}

export function evaluateRestoredCanvasSmoke(input: {
  rejectedSha: string;
  expectedSha: string | null;
  version: VersionDocument | null;
  pageStatus: number;
  pageHtml: string;
}): SmokeResult {
  if (input.expectedSha) {
    return evaluateCanvasSmoke({
      expectedSha: input.expectedSha,
      version: input.version,
      pageStatus: input.pageStatus,
      pageHtml: input.pageHtml,
    });
  }
  if (!input.version) {
    return { ok: false, reason: 'version.json missing or invalid after rollback' };
  }
  if (input.version.sha === input.rejectedSha) {
    return { ok: false, reason: 'rollback still serving the failed SHA' };
  }
  return evaluateCanvasOrigin(input.version, input.pageStatus, input.pageHtml);
}

function evaluateCanvasOrigin(
  version: VersionDocument,
  pageStatus: number,
  pageHtml: string
): SmokeResult {
  if (pageStatus !== 200) {
    return { ok: false, reason: `user path status ${pageStatus}` };
  }
  const buildId = extractAppBuildId(pageHtml);
  if (buildId !== version.buildId) {
    return {
      ok: false,
      reason: `app-build-id ${buildId ?? '(missing)'} !== ${version.buildId}`,
    };
  }
  return { ok: true };
}

export function evaluateCollabSmoke(input: {
  expectedSha: string;
  health: CollabHealth | null;
}): SmokeResult {
  if (!input.health) {
    return { ok: false, reason: 'collab /health missing or invalid' };
  }
  if (input.health.sha !== input.expectedSha) {
    return {
      ok: false,
      reason: `collab sha ${input.health.sha} !== ${input.expectedSha}`,
    };
  }
  return { ok: true };
}

export function cacheBustUrl(url: string, nonce: number): string {
  const parsed = new URL(url);
  parsed.searchParams.set('smoke', String(nonce));
  return parsed.toString();
}

export function formatSmokeSummary(lines: string[]): string {
  return ['## Deploy smoke', ...lines.map(line => `- ${line}`)].join('\n');
}
