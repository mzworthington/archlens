import { CancellationError } from '@archlens/analysis/cancellation';

export type CliCancellation = {
  signal: AbortSignal;
  /** Install SIGINT/SIGTERM handlers. Returns disposer. */
  install: () => () => void;
};

/**
 * Creates an AbortController wired to standard terminal interrupt signals.
 * Call `install()` before long-running work; dispose on completion.
 */
export function createCliCancellation(): CliCancellation {
  const controller = new AbortController();
  let installed = false;

  const onSignal = (signalName: string) => {
    if (controller.signal.aborted) {
      // Second interrupt - force quit immediately.
      process.exit(130);
    }
    controller.abort(new CancellationError(`Received ${signalName}`));
  };

  const install = () => {
    if (installed) return () => undefined;
    installed = true;

    const sigint = () => onSignal('SIGINT');
    const sigterm = () => onSignal('SIGTERM');

    process.on('SIGINT', sigint);
    process.on('SIGTERM', sigterm);

    return () => {
      process.off('SIGINT', sigint);
      process.off('SIGTERM', sigterm);
      installed = false;
    };
  };

  return { signal: controller.signal, install };
}
