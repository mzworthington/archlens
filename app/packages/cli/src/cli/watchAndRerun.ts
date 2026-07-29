import chokidar, { type FSWatcher } from 'chokidar';
import pc from 'picocolors';
import { buildWatchIgnorePatterns, createDebouncer, type WatchModeOptions } from './watchMode.ts';
import type { ArchlensCliPlan } from './parseArchlensArgv.ts';
import { executeArchitectureRun, resolveArchitectureState } from './architectureRun.ts';
import { isCancellationError } from '../analysis/domain/cancellation.ts';

export interface WatchAndRerunDeps {
  watch?: (scanRoot: string, ignored: string[]) => FSWatcher;
  log?: (message: string) => void;
  onExit?: (code: number) => never;
  resolveState?: typeof resolveArchitectureState;
  executeRun?: typeof executeArchitectureRun;
}

export async function watchAndRerun(
  plan: ArchlensCliPlan,
  options: WatchModeOptions,
  deps: WatchAndRerunDeps = {}
): Promise<never> {
  const log = deps.log ?? console.log;
  const exit = deps.onExit ?? ((code: number) => process.exit(code));
  const watch =
    deps.watch ??
    ((scanRoot, ignored) => chokidar.watch(scanRoot, { ignored, ignoreInitial: true }));
  const resolveState = deps.resolveState ?? resolveArchitectureState;
  const executeRun = deps.executeRun ?? executeArchitectureRun;

  const interactiveFirstRun = !plan.isHeadless;
  const state = await resolveState(plan, { interactive: interactiveFirstRun });
  await executeRun(state, {
    headlessUi: plan.isHeadless || !interactiveFirstRun,
    watchMode: false,
  });

  const ignored = buildWatchIgnorePatterns(options.scanRoot, state.outputDir);
  const watcher = watch(options.scanRoot, ignored);

  let stopping = false;
  let runInFlight = false;
  let abortInFlight: AbortController | undefined;

  const stop = (code = 0) => {
    if (stopping) return;
    stopping = true;
    debouncer.cancel();
    void watcher.close().finally(() => exit(code));
  };

  const debouncer = createDebouncer(async () => {
    if (stopping) return;

    if (runInFlight) {
      abortInFlight?.abort();
      await new Promise(resolve => setTimeout(resolve, 50));
    }

    runInFlight = true;
    log(pc.cyan('Change detected → re-running analysis…'));

    abortInFlight = new AbortController();
    const cancellation = {
      signal: abortInFlight.signal,
      install: () => () => undefined,
    };

    try {
      await executeRun(state, {
        headlessUi: true,
        watchMode: true,
        cancellation,
        suppressExitOnCancel: true,
      });
      if (!stopping) {
        log(pc.dim('Watching for changes… (Ctrl+C to stop)'));
      }
    } catch (error) {
      if (!isCancellationError(error)) {
        log(
          pc.red(`Watch rerun failed: ${error instanceof Error ? error.message : String(error)}`)
        );
      }
    } finally {
      runInFlight = false;
    }
  }, options.debounceMs);

  const onSigint = () => {
    if (stopping) {
      exit(130);
    }
    log(pc.yellow('\nStopping watch mode.'));
    stop(0);
  };

  process.on('SIGINT', onSigint);
  watcher.on('all', () => debouncer.schedule());
  watcher.on('error', error => {
    log(pc.red(`Watch error: ${error instanceof Error ? error.message : String(error)}`));
  });

  log(pc.dim('Watching for changes… (Ctrl+C to stop)'));

  await new Promise<void>(() => {
    // Keep process alive until stop() is called.
  });

  throw new Error('unreachable');
}

export function resolveWatchOptions(plan: ArchlensCliPlan): WatchModeOptions {
  const outputDir = plan.architecture.outputDir || process.env.ARCHLENS_OUTPUT_DIR || 'blueprints';
  return {
    scanRoot: process.cwd(),
    outputDir,
    debounceMs: plan.watchDebounceMs,
  };
}
