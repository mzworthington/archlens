import type { DiagramState } from './diagramState';
import type { UiState } from './uiState';
import {
  type FileSystemPort,
  type WorkspacePort,
  type LoggerPort,
  type LayoutRegistryPort,
  type WorkingCopyPort,
  type GraphChangePort,
  type ResilienceEnginePort,
  type CollabSessionPort,
  type CollabPresence,
  noopFileSystem,
  noopWorkspace,
  noopLogger,
  noopLayoutRegistry,
  noopWorkingCopy,
  noopGraphChange,
  noopResilienceEngine,
  noopCollabSession,
  EMPTY_COLLAB_PRESENCE,
} from '../../../core';
import { setCollabDisplayName as persistCollabDisplayName } from '../../collab/collabDisplayName';
import { readCollabHostToken } from '../../collab/collabRoomCredentials';
import type { LiteScanProgress } from '../../analysis/liteScanProgress';
import type { BlueprintStoreSet } from '../store';
import { createOpenWorkspaceStoreActions } from './ioState/openWorkspace/openWorkspaceStoreActions';
import { createSaveWorkspaceActions } from './ioState/saveWorkspaceActions';

export interface IoState {
  fileSystemPort: FileSystemPort;
  workspacePort: WorkspacePort;
  folderWorkspacePort: WorkspacePort;
  sampleWorkspacePort: WorkspacePort;
  logger: LoggerPort;
  layoutRegistry: LayoutRegistryPort;
  workingCopyPort: WorkingCopyPort;
  graphChangePort: GraphChangePort;
  resilienceEnginePort: ResilienceEnginePort;
  collabSessionPort: CollabSessionPort;
  collabPresence: CollabPresence;
  collabJoinError: string | null;
  setPorts: (
    ports: Partial<{
      fileSystemPort: FileSystemPort;
      workspacePort: WorkspacePort;
      folderWorkspacePort: WorkspacePort;
      sampleWorkspacePort: WorkspacePort;
      logger: LoggerPort;
      layoutRegistry: LayoutRegistryPort;
      workingCopyPort: WorkingCopyPort;
      graphChangePort: GraphChangePort;
      resilienceEnginePort: ResilienceEnginePort;
      collabSessionPort: CollabSessionPort;
    }>
  ) => void;

  saveSchema: () => Promise<boolean>;
  saveBlankCanvasToFolder: () => Promise<boolean>;
  loadSchema: () => Promise<boolean>;
  openWorkspaceDirectory: () => Promise<boolean>;
  openBundledSample: () => Promise<boolean>;
  openBrowserLiteScan: () => Promise<boolean>;
  persistBrowserScanMapToFolder: () => Promise<boolean>;
  persistBrowserScanMapDownload: () => Promise<boolean>;
  dismissScanMapPersist: () => void;
  liteScanProgress: LiteScanProgress | null;
  cancelBrowserLiteScan: () => void;
  saveActiveDiagram: () => Promise<boolean>;
  clearWorkspaceDrafts: () => Promise<void>;
  joinCollabRoom: (
    roomId: string,
    displayName: string,
    credentials?: {
      hostToken?: string;
      secret?: string;
      claim?: {
        access: 'open' | 'secret';
        secret?: string;
        expiresAtMs?: number;
      };
    }
  ) => Promise<void>;
  endCollabRoom: () => void;
  leaveCollabRoom: () => void;
  setCollabCursor: (position: { x: number; y: number } | null) => void;
  updateCollabDisplayName: (name: string) => boolean;
}

type IoStateDeps = IoState & DiagramState & UiState;

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

  ...createSaveWorkspaceActions(set, get),
  ...createOpenWorkspaceStoreActions(set, get),

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
