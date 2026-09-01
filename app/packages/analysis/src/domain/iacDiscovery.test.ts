import { describe, expect, it } from 'vitest';
import { directorySlug, slugFromPath } from './iacDiscovery.ts';

describe('directorySlug', () => {
  it('slugs the last path segment to lowercase kebab-case', () => {
    expect(directorySlug('/repo/infra', 'fallback')).toBe('infra');
    expect(directorySlug('/repo/Cloud-API', 'fallback')).toBe('cloud-api');
    expect(directorySlug('C:\\repo\\edge_dns', 'fallback')).toBe('edge-dns');
  });

  it('uses fallback when the path has no alphanumeric characters', () => {
    expect(directorySlug('/', 'root')).toBe('root');
    expect(directorySlug('---', 'fallback')).toBe('fallback');
  });

  it('does not depend on trailing-dash replace chains for punctuation-heavy names', () => {
    expect(directorySlug('/repo/---payments---service---', 'fallback')).toBe('payments-service');
  });
});

describe('slugFromPath', () => {
  it('returns the scan-root slug when the path is the scan root', () => {
    expect(slugFromPath('/repo/infra', '/repo/infra', 'infrastructure')).toBe('infrastructure');
  });

  it('slugs nested directories relative to the scan root', () => {
    expect(slugFromPath('/repo/infra/payments', '/repo/infra', 'infrastructure')).toBe('payments');
  });
});
