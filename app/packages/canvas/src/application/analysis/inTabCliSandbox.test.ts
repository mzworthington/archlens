import { describe, expect, it, vi } from 'vitest';
import { createInTabCliSandbox } from './inTabCliSandbox';

describe('createInTabCliSandbox', () => {
  it('stops the session by aborting, terminating the worker, and dropping held source files', () => {
    const abort = vi.fn();
    const terminate = vi.fn();
    const sandbox = createInTabCliSandbox(abort);
    const sources = [{ content: 'export const n = 1;\n' }, { content: 'export const m = 2;\n' }];

    sandbox.holdSources(sources);
    sandbox.attachWorker({ terminate });
    expect(sandbox.retainedFileCount()).toBe(2);

    sandbox.stop();

    expect(abort).toHaveBeenCalledTimes(1);
    expect(terminate).toHaveBeenCalledTimes(1);
    expect(sandbox.retainedFileCount()).toBe(0);
    expect(sources).toHaveLength(0);
  });
});
