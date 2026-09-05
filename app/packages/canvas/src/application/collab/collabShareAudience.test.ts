import { describe, expect, it } from 'vitest';
import { collabShareAudience, collabShareAudienceCopy } from './collabShareAudience';

describe('collabShareAudience', () => {
  it('treats a missing Worker URL as same-browser tabs', () => {
    expect(collabShareAudience(undefined)).toBe('same-browser');
    expect(collabShareAudience('  ')).toBe('same-browser');
    expect(collabShareAudienceCopy('same-browser')).toMatch(/tabs on this machine/i);
  });

  it('treats a configured Worker URL as a joinable room', () => {
    expect(collabShareAudience('wss://collab.archlens.dev')).toBe('joinable-link');
    expect(collabShareAudienceCopy('joinable-link')).toMatch(/another machine/i);
  });
});
