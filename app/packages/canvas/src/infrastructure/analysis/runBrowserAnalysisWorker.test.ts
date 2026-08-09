import { describe, it, expect, vi } from 'vitest';
import { isCancellationError } from '@archlens/analysis/cancellation';
import { runBrowserAnalysisWorker, type AnalysisWorkerLike } from './runBrowserAnalysisWorker';
import type { BrowserAnalysisCommand, BrowserAnalysisResponse } from './browserAnalysisProtocol';

function createFakeWorker() {
  const posted: BrowserAnalysisCommand[] = [];
  const worker: AnalysisWorkerLike & { terminated: boolean } = {
    terminated: false,
    posted,
    postMessage: (message: BrowserAnalysisCommand) => {
      posted.push(message);
    },
    terminate: () => {
      worker.terminated = true;
    },
    onmessage: null,
    onerror: null,
  } as AnalysisWorkerLike & { terminated: boolean; posted: BrowserAnalysisCommand[] };

  const emit = (data: BrowserAnalysisResponse) => {
    worker.onmessage?.({ data } as MessageEvent<BrowserAnalysisResponse>);
  };

  return { worker, posted, emit };
}

const sources = [{ relativePath: 'src/a.ts', content: 'export const a = 1;\n' }];

describe('runBrowserAnalysisWorker', () => {
  it('resolves with the worker result and terminates the worker', async () => {
    const { worker, posted, emit } = createFakeWorker();

    const promise = runBrowserAnalysisWorker({
      sources,
      directoryName: 'demo-repo',
      createWorker: () => worker,
    });

    expect(posted[0]).toMatchObject({ type: 'scan', directoryName: 'demo-repo' });
    emit({
      type: 'result',
      contextName: 'demo-repo',
      yamlFiles: [{ name: 'demo-repo/context.yaml', content: 'level: context\n' }],
    });

    await expect(promise).resolves.toEqual({
      contextName: 'demo-repo',
      yamlFiles: [{ name: 'demo-repo/context.yaml', content: 'level: context\n' }],
    });
    expect(worker.terminated).toBe(true);
  });

  it('forwards worker log records to the caller logger', async () => {
    const { worker, emit } = createFakeWorker();
    const warn = vi.fn();

    const promise = runBrowserAnalysisWorker({
      sources,
      directoryName: 'demo-repo',
      logger: { info: vi.fn(), warn, error: vi.fn() },
      createWorker: () => worker,
    });

    emit({ type: 'log', level: 'warn', message: 'partial parse', context: { failed: 2 } });
    emit({ type: 'result', contextName: 'demo-repo', yamlFiles: [] });
    await promise;

    expect(warn).toHaveBeenCalledWith('partial parse', { failed: 2 });
  });

  it('cancels the worker when the scan is aborted', async () => {
    const { worker, posted } = createFakeWorker();
    const controller = new AbortController();

    const promise = runBrowserAnalysisWorker({
      sources,
      directoryName: 'demo-repo',
      signal: controller.signal,
      createWorker: () => worker,
    });

    controller.abort();

    await expect(promise).rejects.toSatisfy(isCancellationError);
    expect(posted.some(message => message.type === 'cancel')).toBe(true);
    expect(worker.terminated).toBe(true);
  });

  it('rejects when the worker reports a failure', async () => {
    const { worker, emit } = createFakeWorker();

    const promise = runBrowserAnalysisWorker({
      sources,
      directoryName: 'demo-repo',
      createWorker: () => worker,
    });

    emit({ type: 'error', message: 'boom', cancelled: false });

    await expect(promise).rejects.toThrow('boom');
    expect(worker.terminated).toBe(true);
  });
});
