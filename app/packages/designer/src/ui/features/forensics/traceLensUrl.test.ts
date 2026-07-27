import { describe, it, expect } from 'vitest';
import { buildTraceLensUrl, parseTraceLensUrl } from './traceLensUrl';

describe('traceLensUrl', () => {
  it('builds base path without entity or source', () => {
    expect(buildTraceLensUrl()).toBe('/tracelens');
    expect(buildTraceLensUrl(null)).toBe('/tracelens');
  });

  it('builds entity path and optional source query', () => {
    expect(buildTraceLensUrl('app/designer/db')).toBe('/tracelens/app/designer/db');
    expect(buildTraceLensUrl('app/designer/db', true)).toBe('/tracelens/app/designer/db?source=1');
  });

  it('parses rankings-only URL', () => {
    expect(parseTraceLensUrl('/tracelens')).toEqual({ showSource: false });
    expect(parseTraceLensUrl('/tracelens/')).toEqual({ showSource: false });
  });

  it('parses entity and source from path + search', () => {
    expect(parseTraceLensUrl('/tracelens/app/designer/db')).toEqual({
      entityRef: 'app/designer/db',
      showSource: false,
    });
    expect(parseTraceLensUrl('/tracelens/app/designer/db', 'source=1')).toEqual({
      entityRef: 'app/designer/db',
      showSource: true,
    });
  });
});
