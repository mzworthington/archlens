import { describe, expect, it, vi } from 'vitest';
import { applyStateUpdates } from './applyStateUpdates';

describe('applyStateUpdates', () => {
  it('logs a pending-change failure from the working-copy sync', async () => {
    const error = new Error('pending failed');
    const logger = { error: vi.fn() };

    applyStateUpdates(
      vi.fn(),
      () => ({
        schema: {
          name: 'Demo',
          level: 'container',
          nodes: [],
          dependencies: [],
        },
        loadedSystems: [],
        currentFilePath: 'demo.yaml',
        workingCopyPort: {
          saveWorkingSchema: async () => undefined,
        },
        checkPendingChanges: async () => {
          throw error;
        },
        logger,
        collabSessionPort: null,
      }),
      [],
      [],
      undefined,
      undefined,
      undefined,
      undefined,
      { updateSessionLayout: false, pushCollab: false }
    );

    await new Promise(resolve => setTimeout(resolve, 0));
    expect(logger.error).toHaveBeenCalledWith('Failed to sync working schema to IndexedDB', error);
  });
});
