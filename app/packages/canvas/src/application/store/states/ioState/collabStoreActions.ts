import {
  buildWorkspaceCatalog,
  projectRoomComments,
  type CollabCommentDocument,
} from '@archlens/core';
import type { DiagramState } from '../diagramState';
import type { UiState } from '../uiState';
import { EMPTY_COLLAB_PRESENCE, type NodeComment } from '../../../../core';
import { setCollabDisplayName as persistCollabDisplayName } from '../../../collab/collabDisplayName';
import { readCollabHostToken } from '../../../collab/collabRoomCredentials';
import { mergeLoadedSystemsWithRoom } from '../../../collab/mergeCollabWorkspaceSystems';
import type { BlueprintStoreSet } from '../../store';
import type { IoState } from './index';
import {
  flushCommentSidecar,
  loadCommentSidecar,
  mergeCommentDocuments,
  resolveStandaloneAuthor,
  standaloneAddComment,
  standaloneDeleteComment,
  standaloneResolveComment,
} from './commentSidecarActions';

type IoStateDeps = IoState & DiagramState & UiState;

export function createCollabStoreActions(
  set: BlueprintStoreSet,
  get: () => IoStateDeps
): Pick<
  IoState,
  | 'joinCollabRoom'
  | 'endCollabRoom'
  | 'flushOpenRoomComments'
  | 'leaveCollabRoom'
  | 'setCollabCursor'
  | 'updateCollabDisplayName'
  | 'addCollabComment'
  | 'resolveCollabComment'
  | 'deleteCollabComment'
  | 'addComment'
  | 'resolveComment'
  | 'deleteComment'
  | 'loadPersistedComments'
> {
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

  const mutateStandaloneComment = (
    mutate: (
      doc: CollabCommentDocument,
      author: NonNullable<ReturnType<typeof resolveStandaloneAuthor>>
    ) => CollabCommentDocument
  ) => {
    const {
      collabSessionPort,
      currentFilePath,
      isWorkspaceOpen,
      isSampleWorkspace,
      workspacePort,
      logger,
      persistedComments,
    } = get();
    const author = resolveStandaloneAuthor(collabSessionPort.localAuthorKey());
    if (!author) return;
    const doc: CollabCommentDocument = {
      comments: Object.fromEntries(persistedComments.map(c => [c.id, c])),
    };
    const next = mutate(doc, author);
    set({ persistedComments: Object.values(next.comments) });
    if (isWorkspaceOpen && !isSampleWorkspace && currentFilePath) {
      void flushCommentSidecar(currentFilePath, next, workspacePort, logger);
    }
  };

  return {
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

    flushOpenRoomComments: () => {
      const flushPath = get().currentFilePath;
      if (!flushPath || !get().collabSessionPort.isActive()) return;
      const {
        isWorkspaceOpen,
        isSampleWorkspace,
        workspacePort,
        logger,
        persistedComments,
        collabComments,
      } = get();
      if (!isWorkspaceOpen || isSampleWorkspace) return;
      const snapshot = commentsForDiagram(flushPath, collabComments);
      const seen = new Set(roomCommentIdsSeen);
      if (snapshot.length === 0 && seen.size === 0) return;
      roomSyncGeneration += 1;
      const existingDoc: CollabCommentDocument = {
        comments: Object.fromEntries(persistedComments.map(comment => [comment.id, comment])),
      };
      const merged = projectRoomComments(existingDoc, snapshot, seen);
      set({ persistedComments: Object.values(merged.comments) });
      void flushCommentSidecar(flushPath, merged, workspacePort, logger);
    },

    leaveCollabRoom: () => {
      const flushPath = get().currentFilePath;
      const snapshot = flushPath ? commentsForDiagram(flushPath, get().collabComments) : [];
      const seen = new Set(roomCommentIdsSeen);
      roomSyncGeneration += 1;
      get().collabSessionPort.leave();

      const { isWorkspaceOpen, isSampleWorkspace, workspacePort, logger, persistedComments } =
        get();
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

    addComment: input => {
      commentsEpoch += 1;
      const { collabSessionPort, collabRoomActive } = get();
      if (collabRoomActive) {
        collabSessionPort.addComment(input);
        scheduleRoomSidecarSync();
        return;
      }
      mutateStandaloneComment((doc, author) => standaloneAddComment(doc, input, author).doc);
    },

    resolveComment: id => {
      commentsEpoch += 1;
      const { collabSessionPort, collabRoomActive } = get();
      if (collabRoomActive) {
        collabSessionPort.resolveComment(id);
        scheduleRoomSidecarSync();
        return;
      }
      mutateStandaloneComment((doc, author) => standaloneResolveComment(doc, id, author));
    },

    deleteComment: id => {
      commentsEpoch += 1;
      const { collabSessionPort, collabRoomActive } = get();
      if (collabRoomActive) {
        roomCommentIdsSeen.add(id);
        collabSessionPort.deleteComment(id);
        scheduleRoomSidecarSync();
        return;
      }
      mutateStandaloneComment((doc, author) => standaloneDeleteComment(doc, id, author));
    },

    loadPersistedComments: async (diagramPath: string) => {
      const epochAtStart = commentsEpoch;
      const { isWorkspaceOpen, isSampleWorkspace, workspacePort, collabSessionPort } = get();
      if (!isWorkspaceOpen || isSampleWorkspace) return;
      if (get().currentFilePath !== diagramPath) return;
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
}
