import { describe, expect, it } from 'vitest';
import { resolveAdviceLensArtifactFormat } from './resilienceRun.ts';

describe('resolveAdviceLensArtifactFormat', () => {
  it('uses explicit --format for structured artifacts', () => {
    expect(resolveAdviceLensArtifactFormat('yaml')).toBe('yaml');
    expect(resolveAdviceLensArtifactFormat('json')).toBe('json');
  });

  it('defaults text+output to JSON for CI, unless the path is .yaml', () => {
    expect(resolveAdviceLensArtifactFormat('text', '.archlens/advicelens-report.json')).toBe(
      'json'
    );
    expect(resolveAdviceLensArtifactFormat('text', '.archlens/advicelens-report.yaml')).toBe(
      'yaml'
    );
    expect(resolveAdviceLensArtifactFormat('text')).toBe('json');
  });
});
