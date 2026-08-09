import { describe, expect, it } from 'vitest';
import { normalizeFilePath } from '@archlens/analysis/forensics';

describe('collectFileMetrics helpers', () => {
  it('normalizes paths for map keys', () => {
    expect(normalizeFilePath('src\\a.ts')).toBe('src/a.ts');
  });
});
