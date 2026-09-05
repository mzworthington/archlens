import { describe, expect, it } from 'vitest';
import todayMd from '@docs/today-jobs.md?raw';
import { isTodayJobPath, parseTodayJobsMarkdown, resolveTodayJobHref } from './parseTodayJobs';

describe('parseTodayJobsMarkdown', () => {
  it('parses id, title, blurb, why, steps, command and actions', () => {
    const md = `# Jobs

## demo | Demo job

> Button blurb with \`archlens\`.

Why this path exists.

1. **Write** the case.
2. **Run** \`archlens scan\`
3. Done.

\`\`\`
archlens scan
\`\`\`

- [Proof](#proof)
- [Suite](./guide/cli.md)
`;
    const jobs = parseTodayJobsMarkdown(md);
    expect(jobs).toEqual([
      {
        id: 'demo',
        title: 'Demo job',
        blurb: 'Button blurb with `archlens`.',
        why: 'Why this path exists.',
        steps: ['**Write** the case.', '**Run** `archlens scan`', 'Done.'],
        cmd: 'archlens scan',
        actions: [
          { label: 'Proof', href: '#proof' },
          { label: 'Suite', href: './guide/cli.md' },
        ],
      },
    ]);
  });

  it('skips headings without an id pipe', () => {
    expect(parseTodayJobsMarkdown('## Just a title\n\nNope.\n')).toEqual([]);
  });

  it('treats in-app paths as start links', () => {
    expect(isTodayJobPath('/workspace')).toBe(true);
    expect(isTodayJobPath('archlens validate blueprints/')).toBe(false);
    expect(resolveTodayJobHref('./guide/getting-started.md')).toBe('/guide/getting-started');
    expect(resolveTodayJobHref('/workspace?lens=advicelens')).toBe('/workspace?lens=advicelens');
  });
});

describe('docs/today-jobs.md', () => {
  it('is the source for the landing-page jobs', () => {
    const jobs = parseTodayJobsMarkdown(todayMd);
    expect(jobs.map(job => job.id)).toEqual([
      'first-look',
      'browser-scan',
      'cli-scan',
      'chaos',
      'rank',
      'ci-gate',
    ]);
    expect(jobs.every(job => job.cmd.length > 0 && job.actions.length === 3)).toBe(true);
    expect(jobs[0]?.title).toBe('I have never used ArchLens');
    expect(jobs[0]?.cmd).toBe('/workspace');
    expect(jobs.find(job => job.id === 'cli-scan')?.cmd).toMatch(/install\.sh/);
    expect(jobs.find(job => job.id === 'ci-gate')?.cmd).toBe('archlens validate blueprints/');
  });
});
