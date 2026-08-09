import { describe, it, expect } from 'vitest';
import { createCliCancellation } from './cliCancellation.ts';

describe('createCliCancellation', () => {
  it('aborts the signal when SIGINT is received', () => {
    const { signal, install } = createCliCancellation();
    const dispose = install();

    expect(signal.aborted).toBe(false);
    process.emit('SIGINT');
    expect(signal.aborted).toBe(true);

    dispose();
  });

  it('aborts the signal when SIGTERM is received', () => {
    const { signal, install } = createCliCancellation();
    const dispose = install();

    process.emit('SIGTERM');
    expect(signal.aborted).toBe(true);

    dispose();
  });
});
