import { describe, expect, it } from 'vitest';
import {
  injectBuildIdMeta,
  resolveBuildId,
  resolveDeployIdentity,
  serializeVersionJson,
} from './injectBuildIdMeta';

describe('resolveDeployIdentity', () => {
  it('uses the full GitHub SHA and a 12-character build id in CI', () => {
    expect(
      resolveDeployIdentity({ GITHUB_SHA: '0123456789abcdef0123456789abcdef01234567' })
    ).toEqual({
      sha: '0123456789abcdef0123456789abcdef01234567',
      buildId: '0123456789ab',
    });
  });

  it('falls back to VITE_APP_BUILD_ID when GitHub SHA is absent', () => {
    expect(resolveDeployIdentity({ VITE_APP_BUILD_ID: 'manual-build' })).toEqual({
      sha: 'manual-build',
      buildId: 'manual-build',
    });
    expect(resolveBuildId({ VITE_APP_BUILD_ID: 'manual-build' })).toBe('manual-build');
  });
});

describe('serializeVersionJson', () => {
  it('emits sha and buildId for live smoke checks', () => {
    expect(
      serializeVersionJson({
        sha: '0123456789abcdef0123456789abcdef01234567',
        buildId: '0123456789ab',
      })
    ).toBe(
      '{\n  "sha": "0123456789abcdef0123456789abcdef01234567",\n  "buildId": "0123456789ab"\n}\n'
    );
  });
});

describe('injectBuildIdMeta', () => {
  it('injects app-build-id into the document head once', () => {
    const plugin = injectBuildIdMeta('abc123def456');
    const transform = plugin.transformIndexHtml as (html: string) => string;
    const html = transform('<head></head>');
    expect(html).toContain('<meta name="app-build-id" content="abc123def456" />');
    expect(transform(html).match(/app-build-id/g)).toHaveLength(1);
  });
});
