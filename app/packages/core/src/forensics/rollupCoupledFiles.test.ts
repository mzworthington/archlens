import { describe, expect, it } from 'vitest';
import { rollupTopCoupledFiles } from './rollupCoupledFiles';

describe('rollupTopCoupledFiles', () => {
  it('returns highest-scoring coupled peers across children', () => {
    const rolled = rollupTopCoupledFiles(
      [
        { forensics: { coupledFiles: [{ path: 'b.ts', score: 0.5, sharedCommits: 3 }] } },
        {
          forensics: {
            coupledFiles: [
              { path: 'b.ts', score: 0.9, sharedCommits: 6 },
              { path: 'c.ts', score: 0.4, sharedCommits: 2 },
            ],
          },
        },
      ],
      2
    );

    expect(rolled).toEqual([
      { path: 'b.ts', score: 0.9, sharedCommits: 6 },
      { path: 'c.ts', score: 0.4, sharedCommits: 2 },
    ]);
  });
});
