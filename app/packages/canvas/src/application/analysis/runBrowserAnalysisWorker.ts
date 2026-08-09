import type { LiteScanSourceFile } from './liteScanTypes';
import { runBrowserAnalysis, type BrowserAnalysisResult } from './runBrowserAnalysis';

type WorkerResponse =
  | ({ ok: true } & BrowserAnalysisResult & { id: string })
  | { ok: false; id: string; error: string };

function canUseWorker(): boolean {
  return (
    import.meta.env.MODE !== 'test' && typeof Worker !== 'undefined' && typeof URL !== 'undefined'
  );
}

export function runBrowserAnalysisWorker(args: {
  sources: readonly LiteScanSourceFile[];
  directoryName: string;
}): Promise<BrowserAnalysisResult> {
  if (!canUseWorker()) {
    return runBrowserAnalysis(args);
  }

  return new Promise((resolve, reject) => {
    const id = crypto.randomUUID();
    const worker = new Worker(new URL('./browserAnalysis.worker.ts', import.meta.url), {
      type: 'module',
    });
    const cleanup = () => worker.terminate();

    worker.onmessage = (event: MessageEvent<WorkerResponse>) => {
      if (event.data.id !== id) return;
      cleanup();
      if (event.data.ok) {
        resolve({
          yamlFiles: event.data.yamlFiles,
          contextName: event.data.contextName,
        });
      } else {
        reject(new Error(event.data.error));
      }
    };
    worker.onerror = event => {
      cleanup();
      reject(new Error(event.message || 'Browser analysis worker failed.'));
    };
    worker.postMessage({
      id,
      sources: [...args.sources],
      directoryName: args.directoryName,
    });
  });
}
