import { describe, expect, it } from 'vitest';
import { parseGitLogOutput, relativizeCommitPaths } from './gitLogHistory.ts';

const SEP = '\x1e';

describe('parseGitLogOutput', () => {
  it('parses null-separated commit records with paths', () => {
    const stdout = [
      `${SEP}abc123`,
      'alice@ex.com',
      '2026-01-15T10:00:00Z',
      'src/a.ts',
      'src/b.ts',
      `${SEP}def456`,
      'bob@ex.com',
      '2026-02-01T10:00:00Z',
      'src/a.ts',
      '',
    ].join('\n');

    const commits = parseGitLogOutput(stdout);
    expect(commits).toHaveLength(2);
    expect(commits[0]).toMatchObject({
      hash: 'abc123',
      authorEmail: 'alice@ex.com',
      paths: ['src/a.ts', 'src/b.ts'],
    });
    expect(commits[1]?.paths).toEqual(['src/a.ts']);
  });

  it('parses numstat lines with path list', () => {
    const stdout = [
      `${SEP}abc123`,
      'alice@ex.com',
      '2026-01-15T10:00:00Z',
      '12\t5\tsrc/a.ts',
      '3\t1\tsrc/b.ts',
      '',
    ].join('\n');

    const commits = parseGitLogOutput(stdout);
    expect(commits[0]?.paths).toEqual(['src/a.ts', 'src/b.ts']);
    expect(commits[0]?.lineStats).toEqual({
      'src/a.ts': { added: 12, removed: 5 },
      'src/b.ts': { added: 3, removed: 1 },
    });
  });
});

describe('relativizeCommitPaths', () => {
  it('maps git-root paths onto a nested scan root', () => {
    const commits = parseGitLogOutput(
      [`${SEP}h1`, 'a@ex.com', '2026-01-01T00:00:00Z', 'app/packages/cli/src/a.ts', ''].join('\n')
    );
    const mapped = relativizeCommitPaths(commits, '/repo', '/repo/app/packages/cli');
    expect(mapped[0]?.paths).toEqual(['src/a.ts']);
  });
});
