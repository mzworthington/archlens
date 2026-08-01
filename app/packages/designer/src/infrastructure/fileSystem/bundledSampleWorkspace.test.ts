import { describe, expect, it } from 'vitest';
import { BundledSampleWorkspaceAdapter } from './bundledSampleWorkspace';
import { GOLDEN_PATHS_CONTEXT_PATH } from '../../application/store/goldenPathsSample';

describe('BundledSampleWorkspaceAdapter', () => {
  it('loads checked-in Golden Paths YAML from samples/golden-paths/', async () => {
    const files = await BundledSampleWorkspaceAdapter.readDirectoryFiles();
    expect(files.length).toBeGreaterThan(0);
    expect(files.some(f => f.name === GOLDEN_PATHS_CONTEXT_PATH)).toBe(true);
  });
});
