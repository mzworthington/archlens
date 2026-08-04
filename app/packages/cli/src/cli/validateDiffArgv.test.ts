import { describe, expect, it } from 'vitest';
import {
  parseDiffArgv,
  parsePublishArgv,
  parseValidateArgv,
  parseArchlensCommand,
} from './parseArchlensArgv.ts';

describe('parseValidateArgv', () => {
  it('defaults to blueprints/', () => {
    expect(parseValidateArgv(['validate']).targetPath).toBe('blueprints');
  });

  it('accepts positional path and json format', () => {
    const plan = parseValidateArgv(['validate', 'custom/', '--format=json']);
    expect(plan.targetPath).toBe('custom/');
    expect(plan.format).toBe('json');
  });
});

describe('parseDiffArgv', () => {
  it('defaults baseline and current to blueprints when omitted', () => {
    const plan = parseDiffArgv(['diff']);
    expect(plan.baselinePath).toBe('blueprints');
    expect(plan.currentPath).toBe('blueprints');
  });

  it('accepts positional baseline and current paths', () => {
    const plan = parseDiffArgv(['diff', 'base/', 'head/']);
    expect(plan.baselinePath).toBe('base/');
    expect(plan.currentPath).toBe('head/');
  });

  it('accepts flag overrides', () => {
    const plan = parseDiffArgv(['diff', '--baseline=old', '--current=new']);
    expect(plan.baselinePath).toBe('old');
    expect(plan.currentPath).toBe('new');
  });
});

describe('parseArchlensCommand', () => {
  it('routes validate and diff subcommands', () => {
    expect(parseArchlensCommand(['validate']).kind).toBe('validate');
    expect(parseArchlensCommand(['diff']).kind).toBe('diff');
    expect(parseArchlensCommand(['scan']).kind).toBe('architecture');
  });

  it('routes publish subcommand', () => {
    expect(parseArchlensCommand(['publish']).kind).toBe('publish');
  });
});

describe('parsePublishArgv', () => {
  it('defaults to blueprints with dry run enabled', () => {
    const plan = parsePublishArgv(['publish']);
    expect(plan.targetPath).toBe('blueprints');
    expect(plan.dryRun).toBe(true);
    expect(plan.skipValidation).toBe(false);
    expect(plan.format).toBe('text');
  });

  it('accepts workspace name and disables dry run', () => {
    const plan = parsePublishArgv([
      'publish',
      'out/',
      '--workspace-name=acme',
      '--no-dry-run',
      '--format=json',
    ]);
    expect(plan.targetPath).toBe('out/');
    expect(plan.workspaceName).toBe('acme');
    expect(plan.dryRun).toBe(false);
    expect(plan.format).toBe('json');
  });

  it('accepts --skip-validation for intentional demo trees', () => {
    const plan = parsePublishArgv(['publish', 'samples/', '--skip-validation']);
    expect(plan.skipValidation).toBe(true);
  });
});
