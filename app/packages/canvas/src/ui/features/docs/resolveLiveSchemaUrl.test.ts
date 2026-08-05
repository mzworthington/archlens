import { describe, expect, it } from 'vitest';
import { parseLiveSchemaFence, resolveLiveSchemaUrl } from './resolveLiveSchemaUrl';

describe('parseLiveSchemaFence', () => {
  it('defaults empty body to blueprint latest', () => {
    expect(parseLiveSchemaFence('')).toEqual({ kind: 'blueprint', channel: 'latest' });
    expect(parseLiveSchemaFence('  ')).toEqual({ kind: 'blueprint', channel: 'latest' });
  });

  it('accepts channel-only fences as blueprint', () => {
    expect(parseLiveSchemaFence('latest')).toEqual({ kind: 'blueprint', channel: 'latest' });
    expect(parseLiveSchemaFence('v4')).toEqual({ kind: 'blueprint', channel: 'v4' });
  });

  it('accepts kind + channel fences', () => {
    expect(parseLiveSchemaFence('chaos latest')).toEqual({ kind: 'chaos', channel: 'latest' });
    expect(parseLiveSchemaFence('blueprint v4')).toEqual({ kind: 'blueprint', channel: 'v4' });
    expect(parseLiveSchemaFence('chaos v1')).toEqual({ kind: 'chaos', channel: 'v1' });
  });

  it('rejects invalid fences', () => {
    expect(parseLiveSchemaFence('../latest')).toBeNull();
    expect(parseLiveSchemaFence('chaos')).toBeNull();
    expect(parseLiveSchemaFence('foo latest')).toBeNull();
    expect(parseLiveSchemaFence('chaos latest extra')).toBeNull();
  });
});

describe('resolveLiveSchemaUrl', () => {
  it('defaults empty channel to latest blueprint under /', () => {
    expect(resolveLiveSchemaUrl('')).toBe('/schemas/latest/blueprint.schema.json');
    expect(resolveLiveSchemaUrl('  ')).toBe('/schemas/latest/blueprint.schema.json');
  });

  it('accepts latest and versioned blueprint channels', () => {
    expect(resolveLiveSchemaUrl('latest')).toBe('/schemas/latest/blueprint.schema.json');
    expect(resolveLiveSchemaUrl('v3')).toBe('/schemas/v3/blueprint.schema.json');
  });

  it('resolves chaos schema channels', () => {
    expect(resolveLiveSchemaUrl('chaos latest')).toBe('/schemas/latest/chaos.schema.json');
    expect(resolveLiveSchemaUrl('chaos v1')).toBe('/schemas/v1/chaos.schema.json');
  });

  it('joins with Vite BASE_URL when not root', () => {
    expect(resolveLiveSchemaUrl('latest', '/application/')).toBe(
      '/application/schemas/latest/blueprint.schema.json'
    );
    expect(resolveLiveSchemaUrl('chaos latest', '/blueprint')).toBe(
      '/blueprint/schemas/latest/chaos.schema.json'
    );
    expect(resolveLiveSchemaUrl('v3', '/blueprint')).toBe(
      '/blueprint/schemas/v3/blueprint.schema.json'
    );
  });

  it('rejects path traversal and unknown channels', () => {
    expect(resolveLiveSchemaUrl('../latest')).toBeNull();
    expect(resolveLiveSchemaUrl('latest/../../etc')).toBeNull();
    expect(resolveLiveSchemaUrl('v3.1')).toBeNull();
    expect(resolveLiveSchemaUrl('main')).toBeNull();
    expect(resolveLiveSchemaUrl('chaos ../latest')).toBeNull();
  });
});
