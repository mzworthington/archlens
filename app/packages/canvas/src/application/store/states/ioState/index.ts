import type { DiagramState } from '../diagramState';
import type { UiState } from '../uiState';
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
  type NodeComment,
  noopFileSystem,
  noopWorkspace,
  noopLogger,
  noopLayoutRegistry,
  noopWorkingCopy,
  noopGraphChange,
  noopResilienceEngine,
  noopCollabSession,
  EMPTY_COLLAB_PRESENCE,
} from '../../../../core';
import type { LiteScanProgress } from '../../../analysis/liteScanProgress';
import type { BlueprintStoreSet } from '../../store';
import { createOpenWorkspaceStoreActions } from './openWorkspace/openWorkspaceStoreActions';
import { createSaveWorkspaceActions } from './saveWorkspaceActions';
import { createCollabStoreActions } from './collabStoreActions';

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
  collabComments: NodeComment[];
  /** Comments loaded from the YAML sidecar - always visible, independent of room state. */
  persistedComments: NodeComment[];
  collabRoomActive: boolean;
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
  /** Reload the published catalog onto the canvas. Confirmed replaces local drafts. */
  refreshRemoteCatalog: (confirmed?: boolean) => Promise<'refreshed' | 'needs-confirm' | 'failed'>;
  openBrowserLiteScan: (source?: { zipFile?: File }) => Promise<boolean>;
  openInTabCliScan: () => Promise<boolean>;
  stopInTabCliSession: () => void;
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
  addCollabComment: (input: { nodeEntityRef: string; body: string }) => void;
  resolveCollabComment: (id: string) => void;
  deleteCollabComment: (id: string) => void;
  /**
   * Unified comment actions - work in and out of a collab room.
   * When in a room, the comment is also written to Yjs (real-time sync).
   * Always persisted to the YAML sidecar when a workspace folder is open.
   */
  addComment: (input: { nodeEntityRef: string; body: string }) => void;
  resolveComment: (id: string) => void;
  deleteComment: (id: string) => void;
  /** Load comments from the sidecar file for the given diagram path. */
  loadPersistedComments: (diagramPath: string) => Promise<void>;
  /**
   * Write the open diagram's live threads before a file switch replaces them.
   * Remote rows never schedule their own sidecar flush.
   */
  flushOpenRoomComments: () => void;
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
  collabComments: [],
  persistedComments: [],
  collabRoomActive: false,
  collabJoinError: null,
  liteScanProgress: null,
  setPorts: ports => set((state: IoStateDeps) => ({ ...state, ...ports })),

  ...createSaveWorkspaceActions(set, get),
  ...createOpenWorkspaceStoreActions(set, get),
  ...createCollabStoreActions(set, get),

  clearWorkspaceDrafts: async () => {
    const { workingCopyPort, logger } = get();
    try {
      await workingCopyPort.clearAllDrafts();
    } catch (err) {
      logger.error('Failed to purge working-copy drafts', err);
    }
  },
});
