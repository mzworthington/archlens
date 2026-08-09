import { runBrowserAnalysis } from './runBrowserAnalysis';
import type { LiteScanSourceFile } from './liteScanTypes';

type RequestMessage = {
  id: string;
  sources: LiteScanSourceFile[];
  directoryName: string;
};

type ResponseMessage =
  | {
      id: string;
      ok: true;
      yamlFiles: Array<{ name: string; content: string }>;
      contextName: string;
    }
  | {
      id: string;
      ok: false;
      error: string;
    };

self.onmessage = (event: MessageEvent<RequestMessage>) => {
  const { id, sources, directoryName } = event.data;
  void runBrowserAnalysis({ sources, directoryName })
    .then(result => {
      self.postMessage({ id, ok: true, ...result } satisfies ResponseMessage);
    })
    .catch(err => {
      self.postMessage({
        id,
        ok: false,
        error: err instanceof Error ? err.message : 'Browser analysis failed.',
      } satisfies ResponseMessage);
    });
};
