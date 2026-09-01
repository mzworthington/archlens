import { describe, expect, it } from 'vitest';
import * as path from 'path';
import { parseIncludeGlobPattern } from './includeGlobPattern.ts';

describe('parseIncludeGlobPattern', () => {
  const cwd = path.resolve('/repo');

  it('extracts brace-group extensions without a quantified `{...}` regex', () => {
    const parsed = parseIncludeGlobPattern('src/**/*.{ts,tsx,js}', cwd);
    expect(parsed.dir).toBe(path.resolve(cwd, 'src'));
    expect(parsed.extensions).toEqual(['.ts', '.tsx', '.js']);
  });

  it('extracts a single trailing extension', () => {
    const parsed = parseIncludeGlobPattern('packages/**/*.py', cwd);
    expect(parsed.dir).toBe(path.resolve(cwd, 'packages'));
    expect(parsed.extensions).toEqual(['.py']);
  });

  it('defaults when the pattern has no extension group', () => {
    const parsed = parseIncludeGlobPattern('src/**/*', cwd);
    expect(parsed.extensions).toContain('.ts');
    expect(parsed.extensions).toContain('.py');
  });

  it('does not hang on brace-like prefixes without a closing `}`', () => {
    const parsed = parseIncludeGlobPattern('{{|{{|{{|', cwd);
    expect(parsed.extensions.length).toBeGreaterThan(0);
  });
});
