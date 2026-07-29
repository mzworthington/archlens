import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { maybePromptAndSelfUpdate, runUpdateCommand } from './startupUpdate.ts';
import * as updateCheck from './updateCheck.ts';
import * as selfUpdate from './selfUpdate.ts';
import * as version from './version.ts';

describe('runUpdateCommand', () => {
  const exit = vi.fn();

  beforeEach(() => {
    exit.mockClear();
    vi.spyOn(version, 'isCompiledRelease').mockReturnValue(true);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('exits when not a compiled release', async () => {
    vi.spyOn(version, 'isCompiledRelease').mockReturnValue(false);
    const error = vi.spyOn(console, 'error').mockImplementation(() => undefined);

    await runUpdateCommand('dev', { exit });

    expect(error).toHaveBeenCalledWith(
      'Updates are only available for installed release binaries.'
    );
    expect(exit).toHaveBeenCalledWith(1);
  });

  it('reports up to date when no newer release', async () => {
    vi.spyOn(updateCheck, 'checkForUpdate').mockResolvedValue(null);
    await runUpdateCommand('v0.1.5', { exit });
    expect(exit).toHaveBeenCalledWith(0);
  });

  it('runs self-update when a newer release exists', async () => {
    vi.spyOn(updateCheck, 'checkForUpdate').mockResolvedValue({
      current: 'v0.1.4',
      latest: 'v0.1.5',
    });
    const performSelfUpdate = vi
      .spyOn(selfUpdate, 'performSelfUpdate')
      .mockResolvedValue(undefined);

    await runUpdateCommand('v0.1.4', { exit });

    expect(performSelfUpdate).toHaveBeenCalledWith('v0.1.5');
  });
});

describe('maybePromptAndSelfUpdate', () => {
  const originalStdinTty = process.stdin.isTTY;
  const originalStdoutTty = process.stdout.isTTY;

  beforeEach(() => {
    vi.spyOn(version, 'isCompiledRelease').mockReturnValue(true);
    vi.spyOn(version, 'getArchlensVersion').mockReturnValue('v0.1.4');
    Object.defineProperty(process.stdin, 'isTTY', { value: true, configurable: true });
    Object.defineProperty(process.stdout, 'isTTY', { value: true, configurable: true });
  });

  afterEach(() => {
    Object.defineProperty(process.stdin, 'isTTY', {
      value: originalStdinTty,
      configurable: true,
    });
    Object.defineProperty(process.stdout, 'isTTY', {
      value: originalStdoutTty,
      configurable: true,
    });
    vi.restoreAllMocks();
  });

  it('skips check in headless mode', async () => {
    const checkForUpdate = vi.spyOn(updateCheck, 'checkForUpdate');
    await maybePromptAndSelfUpdate(['--headless']);
    expect(checkForUpdate).not.toHaveBeenCalled();
  });

  it('prompts and updates when user accepts', async () => {
    vi.spyOn(updateCheck, 'checkForUpdate').mockResolvedValue({
      current: 'v0.1.4',
      latest: 'v0.1.5',
    });
    const confirm = vi.fn(async () => true);
    const performSelfUpdate = vi
      .spyOn(selfUpdate, 'performSelfUpdate')
      .mockResolvedValue(undefined);

    await maybePromptAndSelfUpdate([], { confirm });

    expect(confirm).toHaveBeenCalled();
    expect(performSelfUpdate).toHaveBeenCalledWith('v0.1.5');
  });

  it('does not update when user declines', async () => {
    vi.spyOn(updateCheck, 'checkForUpdate').mockResolvedValue({
      current: 'v0.1.4',
      latest: 'v0.1.5',
    });
    const confirm = vi.fn(async () => false);
    const performSelfUpdate = vi.spyOn(selfUpdate, 'performSelfUpdate');

    await maybePromptAndSelfUpdate([], { confirm });

    expect(performSelfUpdate).not.toHaveBeenCalled();
  });
});
