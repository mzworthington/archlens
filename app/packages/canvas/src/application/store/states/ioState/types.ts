import type { LiteScanProgress } from '../../../analysis/liteScanProgress';
import type {
  CollabPresence,
  CollabSessionPort,
  FileSystemPort,
  GraphChangePort,
  LayoutRegistryPort,
  LoggerPort,
  ResilienceEnginePort,
  WorkingCopyPort,
  WorkspacePort,
} from '../../../../core';
import type { DiagramState } from '../diagramState/types';
import type { UiState } from '../uiState';

export interface IoState {
  fileSystemPort: FileSystemPort;
  workspacePort: WorkspacePort;
  /** Folder-picker workspace adapter (browser FS access). */
  folderWorkspacePort: WorkspacePort;
  /** Bundled demo blueprints adapter. */
  sampleWorkspacePort: WorkspacePort;
  logger: LoggerPort;
  layoutRegistry: LayoutRegistryPort;
  workingCopyPort: WorkingCopyPort;
  graphChangePort: GraphChangePort;
  resilienceEnginePort: ResilienceEnginePort;
  collabSessionPort: CollabSessionPort;
  collabPresence: CollabPresence;
  /** Set when a protected room rejects the guest. */
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
  /** Structural TS/JS scan in the browser (no git / CLI install). */
  openBrowserLiteScan: () => Promise<boolean>;
  persistBrowserScanMapToFolder: () => Promise<boolean>;
  persistBrowserScanMapDownload: () => Promise<boolean>;
  dismissScanMapPersist: () => void;
  /** Live files/bytes while a browser lite scan is in flight. */
  liteScanProgress: LiteScanProgress | null;
  /** Abort the in-flight browser lite scan (chooser or toolbar). */
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

export type IoStateDeps = IoState & DiagramState & UiState;
