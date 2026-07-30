import { describe, expect, it } from 'vitest';
import { parseDiffArgv, parseValidateArgv, parseArchlensCommand } from './parseArchlensArgv.ts';

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
});
