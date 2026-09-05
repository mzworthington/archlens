import {
  EMPTY_COLLAB_PRESENCE,
  noopCollabSession,
  noopFileSystem,
  noopGraphChange,
  noopLayoutRegistry,
  noopLogger,
  noopResilienceEngine,
  noopWorkingCopy,
  noopWorkspace,
} from '../../../core';
import { setCollabDisplayName as persistCollabDisplayName } from '../../collab/collabDisplayName';
import { readCollabHostToken } from '../../collab/collabRoomCredentials';
import type { BlueprintStoreSet } from '../store';
import { createOpenWorkspaceActions } from './ioState/openWorkspaceActions';
import { createSaveWorkspaceActions } from './ioState/saveWorkspaceActions';
import type { IoState, IoStateDeps } from './ioState/types';

export type { IoState } from './ioState/types';

export const createIoState = (set: BlueprintStoreSet, get: () => IoStateDeps): IoState => ({
  fileSystemPort: noopFileSystem,
  workspacePort: noopWorkspace,
  folderWorkspacePort: noopWorkspace,
  sampleWorkspacePort: noopWorkspace,
  logger: noopLogger,
  layoutRegistry: noopLayoutRegistry,
  workingCopyPort: noopWorkingCopy,
  graphChangePort: noopGraphChange,
  resilienceEnginePort: noopResilienceEngine,
  collabSessionPort: noopCollabSession,
  collabPresence: EMPTY_COLLAB_PRESENCE,
  collabJoinError: null,
  liteScanProgress: null,
  setPorts: ports => set((state: IoStateDeps) => ({ ...state, ...ports })),

  loadSchema: async () => {
    const { fileSystemPort, importYaml, logger, setNotification, setIsLoading } = get();
    const start = performance.now();
    logger.info('Opening file dialog for schema load');
    setIsLoading(true);

    try {
      const content = await fileSystemPort.loadSchema();
      const duration = performance.now() - start;
      if (content) {
        const success = importYaml(content);
        logger.info('Schema file loaded and parsed', {
          durationMs: Math.round(duration),
          success,
        });
        if (success) {
          setNotification?.({
            type: 'success',
            title: 'Schema Loaded',
            message: 'Successfully loaded and parsed schema from file.',
          });
        }
        return success;
      }
      logger.info('Schema load cancelled by user', { durationMs: Math.round(duration) });
      return false;
    } catch (err) {
      logger.error('Failed to load schema file', err);
      setNotification?.({
        type: 'error',
        title: 'Save Error',
        message: (err as Error).message || 'Error occurred while loading schema.',
      });
      return false;
    } finally {
      setIsLoading(false);
    }
  },

  ...createOpenWorkspaceActions(set, get),
  ...createSaveWorkspaceActions(set, get),

  clearWorkspaceDrafts: async () => {
    const { workingCopyPort, logger } = get();
    try {
      await workingCopyPort.clearAllDrafts();
    } catch (err) {
      logger.error('Failed to purge working-copy drafts', err);
    }
  },

  joinCollabRoom: async (roomId, displayName, credentials) => {
    const { collabSessionPort, schema, applyRemoteCollabSchema, logger, setNotification } = get();
    try {
      set({ collabJoinError: null });
      await collabSessionPort.join({
        roomId,
        seedSchema: schema,
        displayName,
        credentials,
        onSchema: applyRemoteCollabSchema,
        onPresence: presence => set({ collabPresence: presence }),
        onRoomControl: event => {
          if (event === 'admitted') {
            set({ collabJoinError: null });
            return;
          }
          if (event === 'need-secret') {
            set({
              collabJoinError: 'This room needs a secret before the diagram is shown.',
            });
            return;
          }
          if (event === 'denied') {
            set({
              collabJoinError: 'That secret does not match. The diagram is still hidden.',
            });
            return;
          }
          if (event === 'ended') {
            setNotification?.({
              type: 'info',
              title: 'Live session ended',
              message: 'The host closed this room. New joins will not work.',
            });
            get().leaveCollabRoom();
          }
        },
      });
    } catch (err) {
      logger.error('Failed to join collab room', err);
    }
  },

  endCollabRoom: () => {
    const { collabSessionPort } = get();
    const roomId = collabSessionPort.roomId();
    const hostToken = roomId ? readCollabHostToken(roomId) : null;
    collabSessionPort.endRoom(hostToken);
  },

  leaveCollabRoom: () => {
    get().collabSessionPort.leave();
    set({ collabPresence: EMPTY_COLLAB_PRESENCE, collabJoinError: null });
  },

  setCollabCursor: (position: { x: number; y: number } | null) => {
    get().collabSessionPort.setCursor(position);
  },

  updateCollabDisplayName: (raw: string) => {
    const name = persistCollabDisplayName(raw);
    if (!name) return false;
    get().collabSessionPort.setDisplayName(name);
    return true;
  },
});
