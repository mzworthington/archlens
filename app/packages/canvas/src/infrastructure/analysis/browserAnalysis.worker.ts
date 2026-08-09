import { isCancellationError } from '@archlens/analysis/cancellation';
import type { LoggerPort } from '@archlens/analysis/ports';
import { createBrowserAnalysisDeps } from './createBrowserAnalysisDeps';
import type { BrowserAnalysisCommand, BrowserAnalysisResponse } from './browserAnalysisProtocol';
import { runBrowserAnalysis } from '../../application/analysis/runBrowserAnalysis';

let activeController: AbortController | null = null;

function post(message: BrowserAnalysisResponse): void {
  self.postMessage(message);
}

function serializeContext(context?: Record<string, unknown>): Record<string, unknown> | undefined {
  if (!context) return undefined;
  try {
    return JSON.parse(JSON.stringify(context)) as Record<string, unknown>;
  } catch {
    return undefined;
  }
}

/** Analysis logs are surfaced on the main thread rather than swallowed in the worker. */
const forwardingLogger: LoggerPort = {
  info: (message, context) =>
    post({ type: 'log', level: 'info', message, context: serializeContext(context) }),
  warn: (message, context) =>
    post({ type: 'log', level: 'warn', message, context: serializeContext(context) }),
  error: (message, error, context) =>
    post({
      type: 'log',
      level: 'error',
      message: error instanceof Error ? `${message}: ${error.message}` : message,
      context: serializeContext(context),
    }),
};

self.onmessage = (event: MessageEvent<BrowserAnalysisCommand>) => {
  if (event.data.type === 'cancel') {
    activeController?.abort();
    return;
  }

  // Fresh controller per scan so a prior cancel cannot stick on a reused worker.
  const controller = new AbortController();
  activeController = controller;

  const { sources, directoryName } = event.data;
  void runBrowserAnalysis({
    directoryName,
    deps: createBrowserAnalysisDeps({ sources, logger: forwardingLogger }),
    signal: controller.signal,
  })
    .then(result => {
      if (controller.signal.aborted) return;
      post({ type: 'result', ...result });
    })
    .catch(err => {
      if (controller.signal.aborted && !isCancellationError(err)) {
        post({ type: 'error', message: 'Scan cancelled.', cancelled: true });
        return;
      }
      post({
        type: 'error',
        message: err instanceof Error ? err.message : 'Browser analysis failed.',
        cancelled: isCancellationError(err),
      });
    });
};
