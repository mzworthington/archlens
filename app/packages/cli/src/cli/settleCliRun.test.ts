import { afterEach, describe, expect, it, vi } from 'vitest';
import { settleCliRun } from './settleCliRun';

describe('settleCliRun', () => {
  afterEach(() => {
    process.exitCode = undefined;
  });

  it('records a failing CLI run on the process exit code', async () => {
    const error = new Error('scan failed');
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined);

    settleCliRun(Promise.reject(error));
    await new Promise(resolve => setTimeout(resolve, 0));

    expect(process.exitCode).toBe(1);
    expect(errorSpy).toHaveBeenCalledWith(error);
    errorSpy.mockRestore();
  });
});
