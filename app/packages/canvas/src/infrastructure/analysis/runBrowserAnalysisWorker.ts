import { CancellationError } from '@archlens/analysis/cancellation';
import type { LoggerPort } from '@archlens/analysis/ports';
import { createBrowserAnalysisDeps } from './createBrowserAnalysisDeps';
import type { LiteScanSourceFile } from '../../application/analysis/liteScanTypes';
import type { BrowserAnalysisCommand, BrowserAnalysisResponse } from './browserAnalysisProtocol';
import {
  runBrowserAnalysis,
  type BrowserAnalysisResult,
} from '../../application/analysis/runBrowserAnalysis';

/** Minimal slice of Worker used here, so tests can supply a fake. */
export type AnalysisWorkerLike = {
  postMessage: (message: BrowserAnalysisCommand) => void;
  terminate: () => void;
  onmessage: ((event: MessageEvent<BrowserAnalysisResponse>) => void) | null;
  onerror: ((event: { message?: string }) => void) | null;
};

export type AnalysisWorkerFactory = () => AnalysisWorkerLike;

const defaultWorkerFactory: AnalysisWorkerFactory = () =>
  new Worker(new URL('./browserAnalysis.worker.ts', import.meta.url), {
    type: 'module',
  }) as unknown as AnalysisWorkerLike;

function canUseWorker(): boolean {
  return import.meta.env.MODE !== 'test' && typeof Worker !== 'undefined';
}

export type RunBrowserAnalysisWorkerArgs = {
  sources: readonly LiteScanSourceFile[];
  directoryName: string;
  logger?: LoggerPort;
  signal?: AbortSignal;
  /** @internal Test seam. */
  createWorker?: AnalysisWorkerFactory;
};

export function runBrowserAnalysisWorker(
  args: RunBrowserAnalysisWorkerArgs
): Promise<BrowserAnalysisResult> {
  const createWorker = args.createWorker ?? defaultWorkerFactory;
  if (!args.createWorker && !canUseWorker()) {
    return runBrowserAnalysis({
      directoryName: args.directoryName,
      deps: createBrowserAnalysisDeps({ sources: args.sources, logger: args.logger }),
      signal: args.signal,
    });
  }

  return new Promise((resolve, reject) => {
    const worker = createWorker();
    let settled = false;

    const finish = (settle: () => void) => {
      if (settled) return;
      settled = true;
      args.signal?.removeEventListener('abort', onAbort);
      worker.terminate();
      settle();
    };

    function onAbort() {
      // Ask for a cooperative stop, then drop the worker so it cannot outlive the scan.
      worker.postMessage({ type: 'cancel' });
      finish(() => reject(new CancellationError('Scan cancelled.')));
    }

    if (args.signal?.aborted) {
      worker.terminate();
      reject(new CancellationError('Scan cancelled.'));
      return;
    }
    args.signal?.addEventListener('abort', onAbort, { once: true });

    worker.onmessage = (event: MessageEvent<BrowserAnalysisResponse>) => {
      const data = event.data;
      if (data.type === 'log') {
        args.logger?.[data.level](data.message, data.context);
        return;
      }
      if (data.type === 'result') {
        finish(() => resolve({ yamlFiles: data.yamlFiles, contextName: data.contextName }));
        return;
      }
      finish(() =>
        reject(data.cancelled ? new CancellationError(data.message) : new Error(data.message))
      );
    };

    worker.onerror = event => {
      finish(() => reject(new Error(event.message || 'Browser analysis worker failed.')));
    };

    worker.postMessage({
      type: 'scan',
      sources: [...args.sources],
      directoryName: args.directoryName,
    });
  });
}
