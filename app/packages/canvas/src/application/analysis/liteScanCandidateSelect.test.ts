import { describe, expect, it } from 'vitest';
import {
  createLiteScanTakeState,
  selectLiteScanCandidateBuckets,
  takeLiteScanCandidate,
} from './liteScanCandidateSelect';

describe('selectLiteScanCandidateBuckets', () => {
  it('slices shared sources plus iac and metadata on separate caps', () => {
    const selected = selectLiteScanCandidateBuckets(
      [
        { relativePath: 'tools/cli.ts', kind: 'source' },
        { relativePath: 'infra/main.tf', kind: 'iac' },
        { relativePath: 'src/app.ts', kind: 'source' },
        { relativePath: 'pnpm-workspace.yaml', kind: 'metadata' },
        { relativePath: 'package.json', kind: 'metadata' },
      ],
      2,
      1
    );
    expect(selected.sharedBudget.map(item => item.relativePath)).toEqual([
      'src/app.ts',
      'tools/cli.ts',
    ]);
    expect(selected.metadata.map(item => item.relativePath)).toEqual(['package.json']);
    expect(selected.truncationReasons).toEqual(['files', 'metadata']);
  });
});

describe('takeLiteScanCandidate', () => {
  it('keeps metadata off the source count and stops on the byte cap', () => {
    const state = createLiteScanTakeState([]);
    const limits = { maxFileBytes: 100, maxTotalBytes: 5 };
    expect(
      takeLiteScanCandidate(
        state,
        { relativePath: 'package.json', content: '{}', size: 2, kind: 'metadata' },
        'metadata',
        limits
      )
    ).toBe('took');
    expect(
      takeLiteScanCandidate(
        state,
        { relativePath: 'src/a.ts', content: 'abcd', size: 4, kind: 'source' },
        'shared',
        limits
      )
    ).toBe('full');
    expect(state.sourceCount).toBe(0);
    expect(state.files.map(file => file.relativePath)).toEqual(['package.json']);
    expect([...state.truncationReasons]).toEqual(['bytes']);
  });
});
