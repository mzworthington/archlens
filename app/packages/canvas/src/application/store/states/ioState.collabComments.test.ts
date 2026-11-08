import { describe, expect, it, vi } from 'vitest';
import { serializeCommentDocument, type NodeComment, type SystemSchema } from '@archlens/core';
import {
  noopCollabSession,
  noopWorkspace,
  type CollabPresence,
  type CollabSessionPort,
  type WorkspacePort,
} from '../../../core';
import { useBlueprintStore } from '../store';

const seed: SystemSchema = {
  name: 'Shop',
  version: '1.0.0',
  level: 'container',
  nodes: [{ entityRef: 'shop/api', type: 'rest-api', name: 'API' }],
  dependencies: [],
};

describe('ioState collab comments', () => {
  it('marks the room active after join so the comment thread can render', async () => {
    let onComments: ((comments: NodeComment[]) => void) | undefined;
    const port: CollabSessionPort = {
      ...noopCollabSession,
      isActive: () => true,
      join: async args => {
        onComments = args.onComments;
        args.onPresence({
          connectedCount: 1,
          cursors: [],
          participants: [{ clientId: 7, name: 'Ada', color: '#38bdf8', isLocal: true }],
        } satisfies CollabPresence);
      },
    };

    useBlueprintStore.setState({
      schema: seed,
      collabSessionPort: port,
      collabRoomActive: false,
      applyRemoteCollabSchema: () => {},
    });

    await useBlueprintStore.getState().joinCollabRoom('room-1', 'Ada');
    expect(useBlueprintStore.getState().collabRoomActive).toBe(true);

    onComments?.([
      {
        id: 'c1',
        nodeEntityRef: 'shop/api',
        authorName: 'Ada',
        authorClientId: 7,
        body: 'needs a gateway',
        createdAtMs: 1,
        status: 'open',
      },
    ]);
    expect(useBlueprintStore.getState().collabComments.map(c => c.body)).toEqual([
      'needs a gateway',
    ]);

    useBlueprintStore.getState().leaveCollabRoom();
    expect(useBlueprintStore.getState().collabRoomActive).toBe(false);
    expect(useBlueprintStore.getState().collabComments).toEqual([]);
  });

  it('marks the room active when presence arrives before join resolves', async () => {
    let releaseJoin!: () => void;
    const hang = new Promise<void>(resolve => {
      releaseJoin = resolve;
    });
    let active = false;
    const port: CollabSessionPort = {
      ...noopCollabSession,
      isActive: () => active,
      join: async args => {
        active = true;
        args.onPresence({
          connectedCount: 2,
          cursors: [],
          participants: [
            { clientId: 7, name: 'Ada', color: '#38bdf8', isLocal: true },
            { clientId: 8, name: 'Grace', color: '#f472b6', isLocal: false },
          ],
        } satisfies CollabPresence);
        await hang;
      },
    };

    useBlueprintStore.setState({
      schema: seed,
      collabSessionPort: port,
      collabRoomActive: false,
      applyRemoteCollabSchema: () => {},
    });

    const joining = useBlueprintStore.getState().joinCollabRoom('room-1', 'Ada');
    await Promise.resolve();
    expect(useBlueprintStore.getState().collabRoomActive).toBe(true);

    releaseJoin();
    await joining;
  });

  it('passes persisted comments into the room and drops a room delete from the sidecar', async () => {
    const existing: NodeComment = {
      id: 'c1',
      nodeEntityRef: 'shop/api',
      authorName: 'Ada',
      authorClientId: 0,
      authorKey: 'ada-stable',
      body: 'needs a gateway',
      createdAtMs: 1,
      status: 'open',
    };
    let live = [existing];
    let onComments: ((comments: NodeComment[]) => void) | undefined;
    const writeFile = vi.fn<WorkspacePort['writeFile']>(async () => true);
    const port: CollabSessionPort = {
      ...noopCollabSession,
      isActive: () => true,
      localAuthorKey: () => 'ada-stable',
      join: async args => {
        onComments = args.onComments;
        expect(args.seedComments).toEqual([existing]);
        args.onComments?.(live);
      },
      deleteComment: id => {
        live = live.filter(comment => comment.id !== id);
        onComments?.(live);
      },
      leave: () => {
        onComments?.([]);
      },
    };

    useBlueprintStore.setState({
      schema: seed,
      collabSessionPort: port,
      collabRoomActive: false,
      collabComments: [],
      persistedComments: [existing],
      currentFilePath: 'blueprint.yaml',
      isWorkspaceOpen: true,
      isSampleWorkspace: false,
      workspacePort: { ...noopWorkspace, writeFile },
      applyRemoteCollabSchema: () => {},
    });

    await useBlueprintStore.getState().joinCollabRoom('room-1', 'Ada');
    useBlueprintStore.getState().deleteComment('c1');
    useBlueprintStore.getState().leaveCollabRoom();
    await new Promise(resolve => setTimeout(resolve, 0));

    expect(useBlueprintStore.getState().persistedComments).toEqual([]);
    expect(writeFile).toHaveBeenCalled();
    expect(String(writeFile.mock.calls.at(-1)?.[1])).not.toContain('needs a gateway');

    useBlueprintStore.setState({ isWorkspaceOpen: false, persistedComments: [] });
  });

  it('keeps a sidecar comment the room never had when leaving', async () => {
    const diskOnly: NodeComment = {
      id: 'c-disk',
      nodeEntityRef: 'shop/api',
      authorName: 'Ada',
      authorClientId: 0,
      authorKey: 'ada-stable',
      body: 'only on disk',
      createdAtMs: 1,
      status: 'open',
    };
    const inRoom: NodeComment = {
      id: 'c-room',
      nodeEntityRef: 'shop/api',
      authorName: 'Ada',
      authorClientId: 7,
      authorKey: 'ada-stable',
      body: 'in the room',
      createdAtMs: 2,
      status: 'open',
    };
    let onComments: ((comments: NodeComment[]) => void) | undefined;
    const writeFile = vi.fn<WorkspacePort['writeFile']>(async () => true);
    const port: CollabSessionPort = {
      ...noopCollabSession,
      isActive: () => true,
      join: async args => {
        onComments = args.onComments;
        args.onComments?.([inRoom]);
      },
      leave: () => {
        onComments?.([]);
      },
    };

    useBlueprintStore.setState({
      schema: seed,
      collabSessionPort: port,
      collabComments: [],
      persistedComments: [diskOnly],
      currentFilePath: 'blueprint.yaml',
      isWorkspaceOpen: true,
      isSampleWorkspace: false,
      workspacePort: { ...noopWorkspace, writeFile },
      applyRemoteCollabSchema: () => {},
    });

    await useBlueprintStore.getState().joinCollabRoom('room-1', 'Ada');
    useBlueprintStore.getState().leaveCollabRoom();

    expect(
      useBlueprintStore
        .getState()
        .persistedComments.map(comment => comment.id)
        .sort()
    ).toEqual(['c-disk', 'c-room']);
    useBlueprintStore.setState({ isWorkspaceOpen: false, persistedComments: [] });
  });

  it('loads the sidecar for the diagram that was just opened', async () => {
    const containers: SystemSchema = {
      name: 'Containers',
      version: '1.0.0',
      level: 'container',
      nodes: [{ entityRef: 'shop/api', type: 'rest-api', name: 'API' }],
      dependencies: [],
    };
    const onContainers: NodeComment = {
      id: 'c-containers',
      nodeEntityRef: 'shop/api',
      authorName: 'Ada',
      authorClientId: 0,
      authorKey: 'ada-stable',
      body: 'on containers',
      createdAtMs: 5,
      status: 'open',
    };
    const files: Record<string, string> = {
      'containers.comments.yaml': serializeCommentDocument({
        comments: { 'c-containers': onContainers },
      }),
    };
    const workspacePort: WorkspacePort = {
      ...noopWorkspace,
      readFile: async path => {
        const contents = files[path];
        if (contents === undefined) throw new Error(`missing ${path}`);
        return contents;
      },
      writeFile: async (path, contents) => {
        files[path] = contents;
        return true;
      },
    };

    useBlueprintStore.setState({
      schema: seed,
      currentFilePath: 'context.yaml',
      isWorkspaceOpen: true,
      isSampleWorkspace: false,
      collabRoomActive: false,
      collabSessionPort: noopCollabSession,
      persistedComments: [
        {
          id: 'c-context',
          nodeEntityRef: 'shop',
          authorName: 'Ada',
          authorClientId: 0,
          authorKey: 'ada-stable',
          body: 'on context',
          createdAtMs: 1,
          status: 'open',
        },
      ],
      loadedSystems: [
        { path: 'context.yaml', name: 'Context', schema: seed },
        { path: 'containers.yaml', name: 'Containers', schema: containers },
      ],
      workspacePort,
    });

    await useBlueprintStore.getState().selectSystem('containers.yaml');

    expect(useBlueprintStore.getState().currentFilePath).toBe('containers.yaml');
    expect(useBlueprintStore.getState().persistedComments.map(comment => comment.body)).toEqual([
      'on containers',
    ]);
    expect(files['containers.comments.yaml']).not.toContain('on context');

    useBlueprintStore.setState({ isWorkspaceOpen: false, persistedComments: [] });
  });

  it('does not seed a room-deleted comment back when the sidecar write is still stale', async () => {
    const deleted: NodeComment = {
      id: 'c-deleted',
      nodeEntityRef: 'shop',
      authorName: 'Ada',
      authorClientId: 7,
      authorKey: 'ada-stable',
      body: 'deleted in the room',
      createdAtMs: 1,
      status: 'open',
    };
    const kept: NodeComment = {
      id: 'c-kept',
      nodeEntityRef: 'shop',
      authorName: 'Ada',
      authorClientId: 7,
      authorKey: 'ada-stable',
      body: 'still open',
      createdAtMs: 2,
      status: 'open',
    };
    let live = [deleted, kept];
    let onComments: ((comments: NodeComment[]) => void) | undefined;
    const seeded: string[][] = [];
    const files: Record<string, string> = {
      'context.comments.yaml': serializeCommentDocument({
        comments: { 'c-deleted': deleted, 'c-kept': kept },
      }),
      'containers.comments.yaml': serializeCommentDocument({ comments: {} }),
    };
    const port: CollabSessionPort = {
      ...noopCollabSession,
      isActive: () => true,
      localAuthorKey: () => 'ada-stable',
      join: async args => {
        onComments = args.onComments;
        args.onPresence({ connectedCount: 1, cursors: [], participants: [] });
        args.onComments?.(live);
      },
      deleteComment: id => {
        live = live.filter(comment => comment.id !== id);
        onComments?.(live);
      },
      focusDiagram: () => true,
      seedComments: comments => {
        seeded.push(comments.map(comment => comment.id));
        for (const comment of comments) {
          if (!live.some(existing => existing.id === comment.id)) live.push(comment);
        }
        onComments?.(live);
      },
      leave: () => {
        onComments?.([]);
      },
    };
    const containers: SystemSchema = {
      ...seed,
      name: 'Containers',
      nodes: [{ entityRef: 'shop/api', type: 'rest-api', name: 'API' }],
    };

    useBlueprintStore.setState({
      schema: seed,
      currentFilePath: 'context.yaml',
      isWorkspaceOpen: true,
      isSampleWorkspace: false,
      collabRoomActive: false,
      collabComments: [],
      persistedComments: [deleted, kept],
      loadedSystems: [
        { path: 'context.yaml', name: 'Context', schema: seed },
        { path: 'containers.yaml', name: 'Containers', schema: containers },
      ],
      workspacePort: {
        ...noopWorkspace,
        readFile: async path => {
          const contents = files[path];
          if (contents === undefined) throw new Error(`missing ${path}`);
          return contents;
        },
        writeFile: async () => true,
      },
      collabSessionPort: port,
      applyRemoteCollabSchema: () => {},
    });

    await useBlueprintStore.getState().joinCollabRoom('room-1', 'Ada');
    useBlueprintStore.getState().deleteComment('c-deleted');
    await useBlueprintStore.getState().selectSystem('containers.yaml');
    await useBlueprintStore.getState().selectSystem('context.yaml');

    expect(seeded.at(-1) ?? []).not.toContain('c-deleted');
    expect(live.map(comment => comment.id)).not.toContain('c-deleted');
    expect(useBlueprintStore.getState().persistedComments.map(comment => comment.id)).toEqual([
      'c-kept',
    ]);

    useBlueprintStore.getState().leaveCollabRoom();
    useBlueprintStore.setState({ isWorkspaceOpen: false, persistedComments: [] });
  });

  it('does not write another diagram’s threads into the open sidecar', async () => {
    const onContext: NodeComment = {
      id: 'c-context',
      nodeEntityRef: 'shop',
      authorName: 'Ada',
      authorClientId: 7,
      authorKey: 'ada-stable',
      body: 'on context',
      createdAtMs: 1,
      status: 'open',
    };
    const onContainers: NodeComment = {
      id: 'c-containers',
      nodeEntityRef: 'shop/api',
      authorName: 'Ada',
      authorClientId: 7,
      authorKey: 'ada-stable',
      body: 'on containers',
      createdAtMs: 2,
      status: 'open',
    };
    let live = [onContext];
    let onComments: ((comments: NodeComment[]) => void) | undefined;
    const files: Record<string, string> = {
      'context.comments.yaml': serializeCommentDocument({
        comments: { 'c-context': onContext },
      }),
      'containers.comments.yaml': serializeCommentDocument({
        comments: { 'c-containers': onContainers },
      }),
    };
    const port: CollabSessionPort = {
      ...noopCollabSession,
      isActive: () => true,
      localAuthorKey: () => 'ada-stable',
      join: async args => {
        onComments = args.onComments;
        args.onPresence({ connectedCount: 1, cursors: [], participants: [] });
        args.onComments?.(live);
      },
      focusDiagram: () => true,
      seedComments: comments => {
        for (const comment of comments) {
          if (!live.some(existing => existing.id === comment.id)) live.push(comment);
        }
        onComments?.([...live]);
      },
      addComment: () => {
        live = [
          ...live,
          {
            id: 'c-new',
            nodeEntityRef: 'shop/api',
            authorName: 'Ada',
            authorClientId: 7,
            authorKey: 'ada-stable',
            body: 'added on containers',
            createdAtMs: 3,
            status: 'open',
          },
        ];
        onComments?.([...live]);
      },
      leave: () => {
        onComments?.([]);
      },
    };
    const containers: SystemSchema = {
      ...seed,
      name: 'Containers',
      nodes: [{ entityRef: 'shop/api', type: 'rest-api', name: 'API' }],
    };

    useBlueprintStore.setState({
      schema: seed,
      currentFilePath: 'context.yaml',
      isWorkspaceOpen: true,
      isSampleWorkspace: false,
      collabRoomActive: false,
      collabComments: [],
      persistedComments: [onContext],
      loadedSystems: [
        { path: 'context.yaml', name: 'Context', schema: seed },
        { path: 'containers.yaml', name: 'Containers', schema: containers },
      ],
      workspacePort: {
        ...noopWorkspace,
        readFile: async path => {
          const contents = files[path];
          if (contents === undefined) throw new Error(`missing ${path}`);
          return contents;
        },
        writeFile: async (path, contents) => {
          files[path] = contents;
          return true;
        },
      },
      collabSessionPort: port,
      applyRemoteCollabSchema: () => {},
    });

    await useBlueprintStore.getState().joinCollabRoom('room-1', 'Ada');
    await useBlueprintStore.getState().selectSystem('containers.yaml');
    useBlueprintStore
      .getState()
      .addComment({ nodeEntityRef: 'shop/api', body: 'added on containers' });
    await new Promise(resolve => setTimeout(resolve, 0));

    expect(files['containers.comments.yaml']).not.toContain('on context');
    expect(files['containers.comments.yaml']).toContain('on containers');
    expect(files['containers.comments.yaml']).toContain('added on containers');
    expect(files['context.comments.yaml']).not.toContain('on containers');
    expect(files['context.comments.yaml']).not.toContain('added on containers');

    useBlueprintStore.getState().leaveCollabRoom();
    await new Promise(resolve => setTimeout(resolve, 0));
    expect(files['containers.comments.yaml']).not.toContain('on context');
    expect(files['context.comments.yaml']).not.toContain('on containers');

    useBlueprintStore.setState({ isWorkspaceOpen: false, persistedComments: [] });
  });

  it('writes a peer comment to its sidecar when the room switches files', async () => {
    const onContext: NodeComment = {
      id: 'c-context',
      nodeEntityRef: 'shop',
      authorName: 'Ada',
      authorClientId: 7,
      authorKey: 'ada-stable',
      body: 'on context',
      createdAtMs: 1,
      status: 'open',
    };
    const fromPeer: NodeComment = {
      id: 'c-peer',
      nodeEntityRef: 'shop',
      authorName: 'Grace',
      authorClientId: 8,
      authorKey: 'grace-stable',
      body: 'from a peer',
      createdAtMs: 2,
      status: 'open',
    };
    const onContainers: NodeComment = {
      id: 'c-containers',
      nodeEntityRef: 'shop/api',
      authorName: 'Ada',
      authorClientId: 7,
      authorKey: 'ada-stable',
      body: 'on containers',
      createdAtMs: 3,
      status: 'open',
    };
    let onComments: ((comments: NodeComment[]) => void) | undefined;
    const files: Record<string, string> = {
      'context.comments.yaml': serializeCommentDocument({
        comments: { 'c-context': onContext },
      }),
    };
    const port: CollabSessionPort = {
      ...noopCollabSession,
      isActive: () => true,
      localAuthorKey: () => 'ada-stable',
      join: async args => {
        onComments = args.onComments;
        args.onPresence({ connectedCount: 2, cursors: [], participants: [] });
        args.onComments?.([onContext]);
      },
      focusDiagram: next => {
        onComments?.(next === 'containers.yaml' ? [onContainers] : [onContext, fromPeer]);
        return true;
      },
      leave: () => {
        onComments?.([]);
      },
    };
    const containers: SystemSchema = {
      ...seed,
      name: 'Containers',
      nodes: [{ entityRef: 'shop/api', type: 'rest-api', name: 'API' }],
    };

    useBlueprintStore.setState({
      schema: seed,
      currentFilePath: 'context.yaml',
      isWorkspaceOpen: true,
      isSampleWorkspace: false,
      collabRoomActive: false,
      collabComments: [],
      persistedComments: [onContext],
      loadedSystems: [
        { path: 'context.yaml', name: 'Context', schema: seed },
        { path: 'containers.yaml', name: 'Containers', schema: containers },
      ],
      workspacePort: {
        ...noopWorkspace,
        readFile: async path => {
          const contents = files[path];
          if (contents === undefined) throw new Error(`missing ${path}`);
          return contents;
        },
        writeFile: async (path, contents) => {
          files[path] = contents;
          return true;
        },
      },
      collabSessionPort: port,
      applyRemoteCollabSchema: () => {},
    });

    await useBlueprintStore.getState().joinCollabRoom('room-1', 'Ada');
    onComments?.([onContext, fromPeer]);
    await useBlueprintStore.getState().selectSystem('containers.yaml');
    useBlueprintStore.getState().leaveCollabRoom();

    expect(files['context.comments.yaml']).toContain('from a peer');
    expect(files['context.comments.yaml']).toContain('on context');
    expect(files['containers.comments.yaml'] ?? '').not.toContain('from a peer');
    expect(useBlueprintStore.getState().collabComments).toEqual([]);

    useBlueprintStore.setState({ isWorkspaceOpen: false, persistedComments: [] });
  });
});
