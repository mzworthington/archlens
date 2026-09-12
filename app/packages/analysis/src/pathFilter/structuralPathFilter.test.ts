import { describe, expect, it } from 'vitest';
import { createMutableGitignoreFilter } from './structuralPathFilter';

describe('createMutableGitignoreFilter', () => {
  it('applies nested gitignore patterns relative to that directory', () => {
    const gitignore = createMutableGitignoreFilter();
    gitignore.add('ignored/\n');
    gitignore.add('/scratch\nskip.ts\n', 'pkg');

    expect(gitignore.ignores('ignored/skip.ts')).toBe(true);
    expect(gitignore.ignores('pkg/scratch/skip.ts')).toBe(true);
    expect(gitignore.ignores('pkg/skip.ts')).toBe(true);
    expect(gitignore.ignores('scratch/keep.ts')).toBe(false);
    expect(gitignore.ignores('sibling/skip.ts')).toBe(false);
    expect(gitignore.ignores('pkg/keep.ts')).toBe(false);
  });
});
