import { describe, expect, it } from 'vitest';
import { computeRemoteCatalogRevisionId } from './remoteCatalogRevision.ts';

describe('computeRemoteCatalogRevisionId', () => {
  it('is stable for the same content regardless of input order', () => {
    const objects = [
      { path: 'b.yaml', content: 'b' },
      { path: 'a.yaml', content: 'a' },
    ];
    const reversed = [...objects].reverse();
    expect(computeRemoteCatalogRevisionId(objects)).toBe(computeRemoteCatalogRevisionId(reversed));
  });

  it('changes when file content changes', () => {
    const base = [{ path: 'a.yaml', content: 'a' }];
    const changed = [{ path: 'a.yaml', content: 'b' }];
    expect(computeRemoteCatalogRevisionId(base)).not.toBe(computeRemoteCatalogRevisionId(changed));
  });

  it('returns a 16-character hex prefix', () => {
    const revision = computeRemoteCatalogRevisionId([{ path: 'a.yaml', content: 'a' }]);
    expect(revision).toMatch(/^[0-9a-f]{16}$/);
  });
});
