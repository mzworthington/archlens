import { describe, expect, it } from 'vitest';
import {
  cacheBustUrl,
  evaluateCanvasSmoke,
  evaluateCollabSmoke,
  evaluateRestoredCanvasSmoke,
  extractAppBuildId,
  formatSmokeSummary,
  parseCollabHealth,
  parseVersionDocument,
} from './evaluate.ts';

const SHA = '0123456789abcdef0123456789abcdef01234567';

describe('parseVersionDocument', () => {
  it('reads sha and buildId from live /version.json', () => {
    expect(parseVersionDocument({ sha: SHA, buildId: SHA.slice(0, 12) })).toEqual({
      sha: SHA,
      buildId: SHA.slice(0, 12),
    });
  });

  it('rejects a missing or empty sha', () => {
    expect(parseVersionDocument({})).toBeNull();
    expect(parseVersionDocument({ sha: '   ' })).toBeNull();
    expect(parseVersionDocument(null)).toBeNull();
  });
});

describe('parseCollabHealth', () => {
  it('reads ok and sha from collab /health', () => {
    expect(parseCollabHealth({ ok: true, sha: SHA })).toEqual({ ok: true, sha: SHA });
  });

  it('rejects a failed or sha-less health body', () => {
    expect(parseCollabHealth({ ok: false, sha: SHA })).toBeNull();
    expect(parseCollabHealth({ ok: true })).toBeNull();
  });
});

describe('extractAppBuildId', () => {
  it('reads the injected meta tag from HTML', () => {
    expect(
      extractAppBuildId(
        `<html><head><meta name="app-build-id" content="${SHA.slice(0, 12)}" /></head></html>`
      )
    ).toBe(SHA.slice(0, 12));
  });

  it('returns null when the meta tag is missing', () => {
    expect(extractAppBuildId('<html><head></head></html>')).toBeNull();
  });
});

describe('evaluateCanvasSmoke', () => {
  it('passes when origin SHA, user path and build id match the promoted commit', () => {
    expect(
      evaluateCanvasSmoke({
        expectedSha: SHA,
        version: { sha: SHA, buildId: SHA.slice(0, 12) },
        pageStatus: 200,
        pageHtml: `<meta name="app-build-id" content="${SHA.slice(0, 12)}" />`,
      })
    ).toEqual({ ok: true });
  });

  it('fails when the live SHA is a different commit', () => {
    const result = evaluateCanvasSmoke({
      expectedSha: SHA,
      version: { sha: 'ffffffffffffffffffffffffffffffffffffffff', buildId: 'ffffffffffff' },
      pageStatus: 200,
      pageHtml: '<meta name="app-build-id" content="ffffffffffff" />',
    });
    expect(result.ok).toBe(false);
  });

  it('fails when the user-visible path is not 200', () => {
    const result = evaluateCanvasSmoke({
      expectedSha: SHA,
      version: { sha: SHA, buildId: SHA.slice(0, 12) },
      pageStatus: 500,
      pageHtml: `<meta name="app-build-id" content="${SHA.slice(0, 12)}" />`,
    });
    expect(result.ok).toBe(false);
  });
});

describe('evaluateRestoredCanvasSmoke', () => {
  it('treats a different live SHA as a successful restore when the previous SHA was not captured', () => {
    expect(
      evaluateRestoredCanvasSmoke({
        rejectedSha: SHA,
        expectedSha: null,
        version: { sha: 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa', buildId: 'aaaaaaaaaaaa' },
        pageStatus: 200,
        pageHtml: '<meta name="app-build-id" content="aaaaaaaaaaaa" />',
      })
    ).toEqual({ ok: true });
  });
});

describe('evaluateCollabSmoke', () => {
  it('passes when health reports the promoted SHA', () => {
    expect(evaluateCollabSmoke({ expectedSha: SHA, health: { ok: true, sha: SHA } })).toEqual({
      ok: true,
    });
  });

  it('fails when health SHA does not match', () => {
    expect(
      evaluateCollabSmoke({
        expectedSha: SHA,
        health: { ok: true, sha: 'local' },
      }).ok
    ).toBe(false);
  });
});

describe('cacheBustUrl', () => {
  it('appends a query so CDN caches cannot hide a stale version.json', () => {
    expect(cacheBustUrl('https://archlens.dev/version.json', 99)).toBe(
      'https://archlens.dev/version.json?smoke=99'
    );
  });
});

describe('formatSmokeSummary', () => {
  it('writes a GitHub step summary for the smoke job', () => {
    expect(formatSmokeSummary(['canvas: pass', 'collab: pass'])).toBe(
      '## Deploy smoke\n- canvas: pass\n- collab: pass'
    );
  });
});
