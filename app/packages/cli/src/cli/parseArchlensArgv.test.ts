import { describe, expect, it } from 'vitest';
import { parseArchlensArgv, type ArchlensCliPlan } from './parseArchlensArgv.ts';

describe('parseArchlensArgv (git options)', () => {
  it('defaults to architecture with git forensics enabled', () => {
    const plan = parseArchlensArgv([]);
    expect(plan.runArchitecture).toBe(true);
    expect(plan.runGitForensics).toBe(true);
    expect(plan.gitDecisionExplicit).toBe(false);
  });

  it('disables git forensics with --no-git', () => {
    const plan = parseArchlensArgv(['--headless', '--no-git', '--output=blueprints']);
    expect(plan.runArchitecture).toBe(true);
    expect(plan.runGitForensics).toBe(false);
    expect(plan.gitDecisionExplicit).toBe(true);
    expect(plan.isHeadless).toBe(true);
  });

  it('keeps git forensics enabled with --git', () => {
    const plan = parseArchlensArgv(['--headless', '--git', '--output=blueprints']);
    expect(plan.runArchitecture).toBe(true);
    expect(plan.runGitForensics).toBe(true);
    expect(plan.gitDecisionExplicit).toBe(true);
    expect(plan.isHeadless).toBe(true);
  });

  it('treats --git-only as headless architecture plus forensics enrich', () => {
    const plan = parseArchlensArgv(['--git-only', '--git-since=45']);
    expect(plan.runArchitecture).toBe(true);
    expect(plan.runGitForensics).toBe(true);
    expect(plan.isHeadless).toBe(true);
    expect(plan.git.sinceDays).toBe(45);
  });

  it('parses --git-since', () => {
    const plan = parseArchlensArgv(['--git', '--git-since=30']);
    expect(plan.runGitForensics).toBe(true);
    expect(plan.git.sinceDays).toBe(30);
    expect(plan.gitDecisionExplicit).toBe(true);
  });

  it('maps legacy forensics subcommand to arch + git enrich', () => {
    const plan = parseArchlensArgv(['forensics', '--since', '60']);
    expect(plan.runArchitecture).toBe(true);
    expect(plan.runGitForensics).toBe(true);
    expect(plan.git.sinceDays).toBe(60);
    expect(plan.isHeadless).toBe(true);
  });

  it('keeps architecture interactive when only --git is set', () => {
    const plan = parseArchlensArgv(['--git']);
    expect(plan.runArchitecture).toBe(true);
    expect(plan.runGitForensics).toBe(true);
    expect(parseArchlensArgv(['--git', '--headless']).isHeadless).toBe(true);
    expect(parseArchlensArgv(['--git-only']).isHeadless).toBe(true);
  });

  it('forces interactive mode when ARCHLENS_INTERACTIVE=1', () => {
    const prev = process.env.ARCHLENS_INTERACTIVE;
    const prevCi = process.env.CI;
    process.env.ARCHLENS_INTERACTIVE = '1';
    process.env.CI = 'true';
    try {
      expect(parseArchlensArgv([]).isHeadless).toBe(false);
    } finally {
      if (prev === undefined) delete process.env.ARCHLENS_INTERACTIVE;
      else process.env.ARCHLENS_INTERACTIVE = prev;
      if (prevCi === undefined) delete process.env.CI;
      else process.env.CI = prevCi;
    }
  });

  it('exposes architecture flag overrides and keeps git on by default', () => {
    const plan = parseArchlensArgv([
      '--parser=tree-sitter',
      '--glob=**/*.ts',
      '--ignore=dist,build',
    ]);
    expect(plan.runGitForensics).toBe(true);
    expect(plan.gitDecisionExplicit).toBe(false);
    expect(plan.architecture.parserType).toBe('tree-sitter');
    expect(plan.architecture.glob).toBe('**/*.ts');
    expect(plan.architecture.ignore).toEqual(['dist', 'build']);
  });
});

describe('parseArchlensArgv plan shape', () => {
  it('returns a typed plan object', () => {
    const plan: ArchlensCliPlan = parseArchlensArgv(['--git-only']);
    expect(plan).toMatchObject({
      runArchitecture: true,
      runGitForensics: true,
      gitDecisionExplicit: true,
    });
  });
});
