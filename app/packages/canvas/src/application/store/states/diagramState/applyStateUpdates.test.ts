import { describe, expect, it, vi } from 'vitest';
import type { SystemSchema } from '@archlens/core';
import { LIVE_ROOM_DISK_SAVE_DEBOUNCE_MS } from '../../../workspace/liveRoomDiskSave';
import { applyStateUpdates, type ApplyStateSnapshot } from './applyStateUpdates';

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

  it('writes the active folder diagram after live edits settle without a success toast', async () => {
    vi.useFakeTimers();
    try {
      const writeFile = vi.fn(async () => true);
      const saveBaselineSchema = vi.fn(async () => undefined);
      const setNotification = vi.fn();
      const schema: SystemSchema = {
        name: 'Shop',
        version: '1.0.0',
        level: 'container',
        entityRef: 'shop',
        nodes: [{ entityRef: 'shop/api', type: 'rest-api', name: 'API' }],
        dependencies: [],
      };
      const snapshot = (): ApplyStateSnapshot => ({
        schema,
        loadedSystems: [{ path: 'shop.yaml', name: 'Shop', schema }],
        currentFilePath: 'shop.yaml',
        yamlCode: 'name: Shop\n',
        nodeRefMap: { 'shop.yaml': { api: 'shop/api' } },
        isWorkspaceOpen: true,
        isSampleWorkspace: false,
        isMemoryScanWorkspace: false,
        collabSessionPort: { isActive: () => true, pushSchema: () => {} },
        workspacePort: { writeFile },
        workingCopyPort: {
          saveWorkingSchema: async () => undefined,
          saveBaselineSchema,
        },
        logger: { info: () => {}, error: () => {}, warn: () => {} },
        setNotification,
        checkPendingChanges: async () => undefined,
        validationResult: { isValid: true, issues: [] },
      });

      applyStateUpdates(vi.fn(), snapshot, [], [], 'Shop', 'container', 'shop', undefined, {
        updateSessionLayout: false,
      });

      expect(writeFile).not.toHaveBeenCalled();
      await vi.advanceTimersByTimeAsync(LIVE_ROOM_DISK_SAVE_DEBOUNCE_MS - 1);
      expect(writeFile).not.toHaveBeenCalled();
      await vi.advanceTimersByTimeAsync(1);
      expect(writeFile).toHaveBeenCalledWith('shop.yaml', expect.any(String));
      expect(saveBaselineSchema).toHaveBeenCalled();
      expect(setNotification).not.toHaveBeenCalled();
    } finally {
      vi.useRealTimers();
    }
  });

  it('does not auto-save a boot Loading diagram or a room that is not a folder workspace', async () => {
    vi.useFakeTimers();
    try {
      const writeFile = vi.fn(async () => true);
      const loading: SystemSchema = {
        name: 'Loading',
        version: '1.0.0',
        level: 'context',
        nodes: [],
        dependencies: [],
      };
      applyStateUpdates(
        vi.fn(),
        () => ({
          schema: loading,
          loadedSystems: [],
          currentFilePath: 'context.yaml',
          yamlCode: 'name: Loading\n',
          isWorkspaceOpen: true,
          collabSessionPort: { isActive: () => true, pushSchema: () => {} },
          workspacePort: { writeFile },
          workingCopyPort: {
            saveWorkingSchema: async () => undefined,
            saveBaselineSchema: async () => undefined,
          },
          logger: { info: () => {}, error: () => {}, warn: () => {} },
        }),
        [],
        [],
        'Loading',
        'context',
        undefined,
        undefined,
        { updateSessionLayout: false }
      );
      await vi.advanceTimersByTimeAsync(LIVE_ROOM_DISK_SAVE_DEBOUNCE_MS + 200);
      expect(writeFile).not.toHaveBeenCalled();
    } finally {
      vi.useRealTimers();
    }
  });
});
