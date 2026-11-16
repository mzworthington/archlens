import { describe, expect, it, vi, afterEach } from 'vitest';
import type { SystemSchema } from '@archlens/core';
import type { ApplyStateGet } from '../store/states/diagramState/applyStateUpdates';
import {
  LIVE_ROOM_DISK_SAVE_DEBOUNCE_MS,
  cancelQuietLiveRoomDiskSave,
  flushQuietLiveRoomDiskSaves,
  scheduleQuietLiveRoomDiskSave,
} from './liveRoomDiskSave';

function openFolderRoom(
  writeFile: (relativePath: string, content: string) => Promise<boolean>,
  yaml: string
): ApplyStateGet {
  const schema: SystemSchema = {
    name: 'Shop',
    version: '1.0.0',
    level: 'container',
    entityRef: 'shop',
    nodes: [{ entityRef: 'shop/api', type: 'rest-api', name: 'API' }],
    dependencies: [],
  };
  return () => ({
    schema,
    loadedSystems: [{ path: 'shop.yaml', name: 'Shop', schema }],
    currentFilePath: 'shop.yaml',
    yamlCode: yaml,
    nodeRefMap: { 'shop.yaml': { api: 'shop/api' } },
    isWorkspaceOpen: true,
    isSampleWorkspace: false,
    isMemoryScanWorkspace: false,
    collabSessionPort: { isActive: () => true, pushSchema: () => {} },
    workspacePort: { writeFile },
    workingCopyPort: {
      saveWorkingSchema: async () => undefined,
      saveBaselineSchema: async () => undefined,
    },
    logger: { info: () => {}, error: () => {}, warn: () => {} },
    setNotification: () => {},
    checkPendingChanges: async () => undefined,
  });
}

describe('cancelQuietLiveRoomDiskSave', () => {
  afterEach(() => {
    vi.useRealTimers();
    flushQuietLiveRoomDiskSaves(() => ({ isWorkspaceOpen: false }));
  });

  it('drops a snapshotted live save so the debounce and leave flush do not write it', async () => {
    vi.useFakeTimers();
    const writeFile = vi.fn(async () => true);
    const get = openFolderRoom(writeFile, 'name: Live\n');
    scheduleQuietLiveRoomDiskSave(get);

    cancelQuietLiveRoomDiskSave('shop.yaml');

    await vi.advanceTimersByTimeAsync(LIVE_ROOM_DISK_SAVE_DEBOUNCE_MS + 50);
    flushQuietLiveRoomDiskSaves(get);
    expect(writeFile).not.toHaveBeenCalled();
  });
});
