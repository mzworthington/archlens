import {
  buildWorkspaceCatalog,
  projectRoomComments,
  type CollabCommentDocument,
} from '@archlens/core';
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
import { setCollabDisplayName as persistCollabDisplayName } from '../../../collab/collabDisplayName';
import { readCollabHostToken } from '../../../collab/collabRoomCredentials';
import { mergeLoadedSystemsWithRoom } from '../../../collab/mergeCollabWorkspaceSystems';
import type { LiteScanProgress } from '../../../analysis/liteScanProgress';
import type { BlueprintStoreSet } from '../../store';
import { createOpenWorkspaceStoreActions } from './openWorkspace/openWorkspaceStoreActions';
import { createSaveWorkspaceActions } from './saveWorkspaceActions';
import {
  flushCommentSidecar,
  loadCommentSidecar,
  mergeCommentDocuments,
  resolveStandaloneAuthor,
  standaloneAddComment,
  standaloneDeleteComment,
  standaloneResolveComment,
} from './commentSidecarActions';

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
  /** Comments loaded from the YAML sidecar — always visible, independent of room state. */
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
   * Unified comment actions — work in and out of a collab room.
   * When in a room, the comment is also written to Yjs (real-time sync).
   * Always persisted to the YAML sidecar when a workspace folder is open.
   */
  addComment: (input: { nodeEntityRef: string; body: string }) => void;
  resolveComment: (id: string) => void;
  deleteComment: (id: string) => void;
  /** Load comments from the sidecar file for the given diagram path. */
  loadPersistedComments: (diagramPath: string) => Promise<void>;
}

type IoStateDeps = IoState & DiagramState & UiState;

export const createIoState = (set: BlueprintStoreSet, get: () => IoStateDeps): IoState => {
  /** Ids observed in the live room. Absence after that means the row was deleted. */
  const roomCommentIdsSeen = new Set<string>();
  /** Comment ids that belong to each diagram file. A room shares one map per file. */
  const commentIdsByDiagram = new Map<string, Set<string>>();
  /** Bumped on local comment edits so an in-flight sidecar load cannot clobber them. */
  let commentsEpoch = 0;
  /** Bumped on leave so a queued room flush cannot rewrite the sidecar after it. */
  let roomSyncGeneration = 0;

  const rememberRoomComments = (comments: readonly NodeComment[]) => {
    for (const comment of comments) roomCommentIdsSeen.add(comment.id);
  };

  const idsForDiagram = (path: string): Set<string> => {
    let ids = commentIdsByDiagram.get(path);
    if (!ids) {
      ids = new Set();
      commentIdsByDiagram.set(path, ids);
    }
    return ids;
  };

  const ownsComment = (path: string, id: string): boolean => {
    for (const [other, ids] of commentIdsByDiagram) {
      if (other !== path && ids.has(id)) return true;
    }
    return false;
  };

  /** `exclusive` moves sidecar ids onto this file. Otherwise only unowned ids are claimed. */
  const claimDiagramComments = (path: string, ids: readonly string[], exclusive: boolean) => {
    if (!path || ids.length === 0) return;
    if (exclusive) {
      for (const [other, owned] of commentIdsByDiagram) {
        if (other === path) continue;
        for (const id of ids) owned.delete(id);
      }
    }
    const target = idsForDiagram(path);
    for (const id of ids) {
      if (!exclusive && ownsComment(path, id)) continue;
      target.add(id);
    }
  };

  const commentsForDiagram = (path: string, comments: readonly NodeComment[]): NodeComment[] => {
    const ids = commentIdsByDiagram.get(path);
    if (!ids) return [];
    return comments.filter(comment => ids.has(comment.id));
  };

  const scheduleRoomSidecarSync = () => {
    const generation = roomSyncGeneration;
    const flushPath = get().currentFilePath;
    const persistedAtSchedule = get().persistedComments;
    const liveAtSchedule = get().collabComments;
    const seenAtSchedule = new Set(roomCommentIdsSeen);
    setTimeout(() => {
      if (generation !== roomSyncGeneration || !flushPath) return;
      const { isWorkspaceOpen, isSampleWorkspace, workspacePort, logger } = get();
      if (!isWorkspaceOpen || isSampleWorkspace) return;
      const stillHere = get().currentFilePath === flushPath;
      const live = commentsForDiagram(flushPath, stillHere ? get().collabComments : liveAtSchedule);
      if (live.length === 0 && seenAtSchedule.size === 0) return;
      const base = stillHere ? get().persistedComments : persistedAtSchedule;
      const persistedDoc: CollabCommentDocument = {
        comments: Object.fromEntries(base.map(comment => [comment.id, comment])),
      };
      const merged = projectRoomComments(persistedDoc, live, seenAtSchedule);
      if (stillHere) set({ persistedComments: Object.values(merged.comments) });
      void flushCommentSidecar(flushPath, merged, workspacePort, logger);
    }, 0);
  };

  return {
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

    clearWorkspaceDrafts: async () => {
      const { workingCopyPort, logger } = get();
      try {
        await workingCopyPort.clearAllDrafts();
      } catch (err) {
        logger.error('Failed to purge working-copy drafts', err);
      }
    },

    joinCollabRoom: async (roomId, displayName, credentials) => {
      roomCommentIdsSeen.clear();
      commentIdsByDiagram.clear();
      if (get().currentFilePath) {
        claimDiagramComments(
          get().currentFilePath,
          get().persistedComments.map(comment => comment.id),
          true
        );
      }
      const {
        collabSessionPort,
        schema,
        loadedSystems,
        currentFilePath,
        applyRemoteCollabSchema,
        logger,
        setNotification,
      } = get();
      const seedDiagrams = loadedSystems.map(system => ({
        path: system.path,
        schema: system.schema,
      }));
      try {
        set({ collabJoinError: null, collabRoomActive: false });
        await collabSessionPort.join({
          roomId,
          seedSchema: schema,
          seedDiagrams: seedDiagrams.length > 0 ? seedDiagrams : undefined,
          activePath: currentFilePath,
          displayName,
          credentials,
          onSchema: applyRemoteCollabSchema,
          onDiagram: (path, next) => get().applyRemoteCollabDiagram(path, next),
          onWorkspace: update => {
            const merged = mergeLoadedSystemsWithRoom(
              get().loadedSystems,
              update.diagrams,
              update.activePath ?? get().currentFilePath
            );
            set({
              loadedSystems: merged,
              workspaceCatalog: buildWorkspaceCatalog(
                merged.map(system => ({ path: system.path, schema: system.schema })),
                get().workspaceName
              ),
            });
          },
          onPresence: presence =>
            set({
              collabPresence: presence,
              collabRoomActive: get().collabSessionPort.isActive(),
            }),
          onComments: comments => {
            rememberRoomComments(comments);
            const path = get().currentFilePath;
            if (path) {
              claimDiagramComments(
                path,
                comments.map(comment => comment.id),
                false
              );
            }
            set({ collabComments: comments });
          },
          seedComments: get().persistedComments,
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
        set({ collabRoomActive: get().collabSessionPort.isActive() });
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
      const flushPath = get().currentFilePath;
      const snapshot = flushPath ? commentsForDiagram(flushPath, get().collabComments) : [];
      const seen = new Set(roomCommentIdsSeen);
      roomSyncGeneration += 1;
      get().collabSessionPort.leave();

      const { isWorkspaceOpen, isSampleWorkspace, workspacePort, logger, persistedComments } =
        get();
      // Flush even when the live list is empty: deleting the last comment leaves
      // nothing to merge, and skipping that write kept the row in the sidecar.
      if (
        isWorkspaceOpen &&
        !isSampleWorkspace &&
        flushPath &&
        (snapshot.length > 0 || seen.size > 0)
      ) {
        const existingDoc: CollabCommentDocument = {
          comments: Object.fromEntries(persistedComments.map(comment => [comment.id, comment])),
        };
        const merged = projectRoomComments(existingDoc, snapshot, seen);
        set({ persistedComments: Object.values(merged.comments) });
        void flushCommentSidecar(flushPath, merged, workspacePort, logger);
      }
      roomCommentIdsSeen.clear();
      commentIdsByDiagram.clear();

      set({
        collabPresence: EMPTY_COLLAB_PRESENCE,
        collabComments: [],
        collabRoomActive: false,
        collabJoinError: null,
      });
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

    addCollabComment: input => {
      get().collabSessionPort.addComment(input);
    },

    resolveCollabComment: id => {
      get().collabSessionPort.resolveComment(id);
    },

    deleteCollabComment: id => {
      get().collabSessionPort.deleteComment(id);
    },

    // ---------------------------------------------------------------------------
    // Unified comment actions (in-room + persisted)
    // ---------------------------------------------------------------------------

    addComment: input => {
      commentsEpoch += 1;
      const {
        collabSessionPort,
        collabRoomActive,
        currentFilePath,
        isWorkspaceOpen,
        isSampleWorkspace,
        workspacePort,
        logger,
      } = get();

      if (collabRoomActive) {
        collabSessionPort.addComment(input);
        // collabComments updates via onComments. Flush after that observer runs.
        scheduleRoomSidecarSync();
        return;
      }

      // Standalone (no room) — write directly to persistedComments.
      const authorKey = collabSessionPort.localAuthorKey();
      const author = resolveStandaloneAuthor(authorKey);
      if (!author) return;

      const { persistedComments } = get();
      const doc: CollabCommentDocument = {
        comments: Object.fromEntries(persistedComments.map(c => [c.id, c])),
      };
      const { doc: next } = standaloneAddComment(doc, input, author);
      set({ persistedComments: Object.values(next.comments) });
      if (isWorkspaceOpen && !isSampleWorkspace && currentFilePath) {
        void flushCommentSidecar(currentFilePath, next, workspacePort, logger);
      }
    },

    resolveComment: id => {
      commentsEpoch += 1;
      const {
        collabSessionPort,
        collabRoomActive,
        currentFilePath,
        isWorkspaceOpen,
        isSampleWorkspace,
        workspacePort,
        logger,
      } = get();

      if (collabRoomActive) {
        collabSessionPort.resolveComment(id);
        scheduleRoomSidecarSync();
        return;
      }

      const authorKey = collabSessionPort.localAuthorKey();
      const author = resolveStandaloneAuthor(authorKey);
      if (!author) return;

      const { persistedComments } = get();
      const doc: CollabCommentDocument = {
        comments: Object.fromEntries(persistedComments.map(c => [c.id, c])),
      };
      const next = standaloneResolveComment(doc, id, author);
      set({ persistedComments: Object.values(next.comments) });
      if (isWorkspaceOpen && !isSampleWorkspace && currentFilePath) {
        void flushCommentSidecar(currentFilePath, next, workspacePort, logger);
      }
    },

    deleteComment: id => {
      commentsEpoch += 1;
      const {
        collabSessionPort,
        collabRoomActive,
        currentFilePath,
        isWorkspaceOpen,
        isSampleWorkspace,
        workspacePort,
        logger,
      } = get();

      if (collabRoomActive) {
        roomCommentIdsSeen.add(id);
        collabSessionPort.deleteComment(id);
        scheduleRoomSidecarSync();
        return;
      }

      const authorKey = collabSessionPort.localAuthorKey();
      const author = resolveStandaloneAuthor(authorKey);
      if (!author) return;

      const { persistedComments } = get();
      const doc: CollabCommentDocument = {
        comments: Object.fromEntries(persistedComments.map(c => [c.id, c])),
      };
      const next = standaloneDeleteComment(doc, id, author);
      set({ persistedComments: Object.values(next.comments) });
      if (isWorkspaceOpen && !isSampleWorkspace && currentFilePath) {
        void flushCommentSidecar(currentFilePath, next, workspacePort, logger);
      }
    },

    loadPersistedComments: async (diagramPath: string) => {
      const epochAtStart = commentsEpoch;
      const { isWorkspaceOpen, isSampleWorkspace, workspacePort, collabSessionPort } = get();
      if (!isWorkspaceOpen || isSampleWorkspace) return;
      if (get().currentFilePath !== diagramPath) return;
      // Drop the previous diagram's rows before the read yields, so an add on the
      // newly active file cannot flush them into that file's sidecar.
      set({ persistedComments: [] });
      const doc = await loadCommentSidecar(diagramPath, workspacePort);
      if (get().currentFilePath !== diagramPath) return;

      const inRoom = collabSessionPort.isActive();
      if (inRoom) {
        claimDiagramComments(diagramPath, Object.keys(doc.comments), true);
      }
      let next = doc;
      if (commentsEpoch !== epochAtStart) {
        const liveDoc: CollabCommentDocument = {
          comments: Object.fromEntries(
            get().persistedComments.map(comment => [comment.id, comment])
          ),
        };
        const merged = mergeCommentDocuments(doc, Object.values(liveDoc.comments));
        next = inRoom
          ? projectRoomComments(
              merged,
              commentsForDiagram(diagramPath, get().collabComments),
              roomCommentIdsSeen
            )
          : merged;
        if (get().persistedComments.length > 0) {
          void flushCommentSidecar(diagramPath, next, get().workspacePort, get().logger);
        }
      } else if (inRoom) {
        // A delete bumps the epoch before this read, so compare the room set even
        // when nothing else changed while the sidecar was loading.
        next = projectRoomComments(
          doc,
          commentsForDiagram(diagramPath, get().collabComments),
          roomCommentIdsSeen
        );
      }
      if (get().currentFilePath !== diagramPath) return;
      if (inRoom) {
        claimDiagramComments(
          diagramPath,
          Object.values(next.comments).map(comment => comment.id),
          true
        );
      }
      set({ persistedComments: Object.values(next.comments) });
    },
  };
};
