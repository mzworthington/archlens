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
  yaml: string,
  ports?: {
    readFile?: (relativePath: string) => Promise<string>;
    saveBaselineSchema?: () => Promise<void>;
    checkPendingChanges?: () => Promise<void>;
  }
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
    workspacePort: ports?.readFile ? { writeFile, readFile: ports.readFile } : { writeFile },
    workingCopyPort: {
      saveWorkingSchema: async () => undefined,
      saveBaselineSchema: ports?.saveBaselineSchema ?? (async () => undefined),
    },
    logger: { info: () => {}, error: () => {}, warn: () => {} },
    setNotification: () => {},
    checkPendingChanges: ports?.checkPendingChanges ?? (async () => undefined),
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

  it('puts the snapshotted live YAML back and skips the baseline when Keep disk cancels an in-flight write', async () => {
    vi.useFakeTimers();
    let resolveLiveWrite: ((written: boolean) => void) | undefined;
    const saveBaselineSchema = vi.fn(async () => undefined);
    const checkPendingChanges = vi.fn(async () => undefined);
    const writeFile = vi.fn((_path: string, content: string) => {
      if (content === 'name: Live\n') {
        return new Promise<boolean>(resolve => {
          resolveLiveWrite = resolve;
        });
      }
      return Promise.resolve(true);
    });
    const get = openFolderRoom(writeFile, 'name: Live\n', {
      readFile: async () => 'name: Disk\n',
      saveBaselineSchema,
      checkPendingChanges,
    });

    scheduleQuietLiveRoomDiskSave(get);
    await vi.advanceTimersByTimeAsync(LIVE_ROOM_DISK_SAVE_DEBOUNCE_MS);
    expect(writeFile).toHaveBeenCalledWith('shop.yaml', 'name: Live\n');
    expect(resolveLiveWrite).toEqual(expect.any(Function));

    cancelQuietLiveRoomDiskSave('shop.yaml');
    resolveLiveWrite?.(true);
    await Promise.resolve();
    await Promise.resolve();

    expect(saveBaselineSchema).not.toHaveBeenCalled();
    expect(checkPendingChanges).not.toHaveBeenCalled();
    expect(writeFile).toHaveBeenLastCalledWith('shop.yaml', 'name: Disk\n');
  });
});
