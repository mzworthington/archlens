import { EventEmitter } from 'node:events';
import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { watchAndRerun, resolveWatchOptions } from './watchAndRerun.ts';
import { parseArchlensArgv } from '../parseArchlensArgv.ts';
import type { ResolvedArchitectureState } from '../architectureRun.ts';
import { DEFAULT_ANALYSIS_OPTIONS } from '@archlens/analysis/options';

class FakeWatcher extends EventEmitter {
  close = vi.fn(async () => undefined);
}

function frozenState(outputDir = 'blueprints'): ResolvedArchitectureState {
  return {
    plan: parseArchlensArgv(['--headless', '--output=' + outputDir]),
    parserType: 'tree-sitter',
    globPattern: '**/*.ts',
    outputDir,
    contextName: 'blueprint',
    systemName: undefined,
    rollupModules: false,
    cliIgnores: [],
    cliSystems: undefined,
    fileConfig: { ...DEFAULT_ANALYSIS_OPTIONS, configPath: undefined },
  };
}

describe('resolveWatchOptions', () => {
  it('reads output dir and debounce from plan', () => {
    const plan = parseArchlensArgv([
      '--headless',
      '--watch',
      '--watch-debounce=250',
      '--output=diagrams',
    ]);
    const options = resolveWatchOptions(plan);
    expect(options.outputDir).toBe('diagrams');
    expect(options.debounceMs).toBe(250);
    expect(options.scanRoot).toBe(process.cwd());
  });
});

describe('watchAndRerun', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('runs once then reruns on watcher events with frozen state', async () => {
    const watcher = new FakeWatcher();
    const logs: string[] = [];
    const resolveState = vi.fn(async () => frozenState());
    const executeRun = vi.fn(async () => undefined);

    const plan = parseArchlensArgv(['--headless', '--watch', '--output=blueprints']);

    const runPromise = watchAndRerun(
      plan,
      { scanRoot: '/repo', outputDir: 'blueprints', debounceMs: 100 },
      {
        watch: () => watcher as unknown as import('chokidar').FSWatcher,
        log: message => logs.push(message),
        resolveState,
        executeRun,
      }
    );

    await vi.waitFor(() => expect(executeRun).toHaveBeenCalledTimes(1));
    expect(resolveState).toHaveBeenCalledTimes(1);

    const frozen = resolveState.mock.results[0]!.value;
    await frozen;

    watcher.emit('all', 'change', '/repo/src/foo.ts');
    await vi.advanceTimersByTimeAsync(100);
    await vi.waitFor(() => expect(executeRun).toHaveBeenCalledTimes(2));

    const secondCallState = executeRun.mock.calls[1]![0];
    expect(secondCallState.outputDir).toBe('blueprints');
    expect(executeRun.mock.calls[1]![1]).toMatchObject({
      headlessUi: true,
      watchMode: true,
      suppressExitOnCancel: true,
    });

    expect(logs.some(line => line.includes('Watching for changes'))).toBe(true);
    expect(logs.some(line => line.includes('Change detected'))).toBe(true);

    void runPromise;
  });

  it('passes output dir into watch ignore patterns via frozen state', async () => {
    const watcher = new FakeWatcher();
    const watch = vi.fn(() => watcher as unknown as import('chokidar').FSWatcher);
    const state = frozenState('custom-out');

    void watchAndRerun(
      parseArchlensArgv(['--headless', '--watch', '--output=custom-out']),
      { scanRoot: '/repo', outputDir: 'custom-out', debounceMs: 500 },
      {
        watch,
        log: () => undefined,
        resolveState: async () => state,
        executeRun: async () => undefined,
      }
    );

    await vi.waitFor(() => expect(watch).toHaveBeenCalled());
    const ignored = watch.mock.calls[0]![1] as string[];
    expect(ignored).toContain('custom-out/**');
  });
});
