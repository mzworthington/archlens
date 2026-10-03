export type InTabCliWorker = {
  terminate: () => void;
};

export type InTabCliHeldSource = {
  content: string;
};

export type InTabCliSandbox = {
  holdSources: (files: InTabCliHeldSource[]) => void;
  attachWorker: (worker: InTabCliWorker) => void;
  stop: () => void;
  retainedFileCount: () => number;
};

/** Owns the in-tab CLI worker and source buffers so stop can reclaim them. */
export function createInTabCliSandbox(abort: () => void): InTabCliSandbox {
  let sources: InTabCliHeldSource[] | null = null;
  let worker: InTabCliWorker | null = null;
  let stopped = false;

  return {
    holdSources(files) {
      if (stopped) {
        files.length = 0;
        return;
      }
      sources = files;
    },
    attachWorker(next) {
      if (stopped) {
        next.terminate();
        return;
      }
      worker = next;
    },
    stop() {
      if (stopped) return;
      stopped = true;
      abort();
      worker?.terminate();
      worker = null;
      if (sources) {
        for (const file of sources) file.content = '';
        sources.length = 0;
      }
      sources = null;
    },
    retainedFileCount() {
      return sources?.length ?? 0;
    },
  };
}
