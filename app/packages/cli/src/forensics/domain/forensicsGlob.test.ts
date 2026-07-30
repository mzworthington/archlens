import { describe, expect, it } from 'vitest';
import { DEFAULT_SCAN_GLOB } from '../../analysis/domain/analysisOptions.ts';
import {
  DEFAULT_FORENSICS_GLOB,
  DEFAULT_MIN_CHURN_FOR_COMPLEXITY_LARGE,
  LARGE_REPO_FILE_THRESHOLD,
  resolveEffectiveMinChurnForComplexity,
} from './forensicsGlob.ts';

describe('forensicsGlob', () => {
  it('aligns forensics glob with architecture scan plus js/jsx and without tf', () => {
    expect(DEFAULT_FORENSICS_GLOB).toBe(DEFAULT_SCAN_GLOB.replace(',tf', ',js,jsx'));
    expect(DEFAULT_FORENSICS_GLOB).toContain('js');
    expect(DEFAULT_FORENSICS_GLOB).toContain('jsx');
    expect(DEFAULT_FORENSICS_GLOB).not.toContain('tf');
  });

  it('returns configured min churn when explicitly set', () => {
    expect(resolveEffectiveMinChurnForComplexity(5, 10_000)).toBe(5);
  });

  it('applies large-repo default when configured min churn is zero', () => {
    expect(resolveEffectiveMinChurnForComplexity(0, LARGE_REPO_FILE_THRESHOLD)).toBe(0);
    expect(resolveEffectiveMinChurnForComplexity(0, LARGE_REPO_FILE_THRESHOLD + 1)).toBe(
      DEFAULT_MIN_CHURN_FOR_COMPLEXITY_LARGE
    );
  });
});
