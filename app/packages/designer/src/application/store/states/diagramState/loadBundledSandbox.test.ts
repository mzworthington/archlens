import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  activateBundledSandbox,
  pickSandboxEntryDiagram,
  reloadBundledSandbox,
} from './loadBundledSandbox';
import type { SystemSchema } from '@archlens/core';
import * as clearSandboxModule from '../../clearSandboxCaches';

const contextSchema: SystemSchema = {
  name: 'ArchLens Context',
  version: '1.0.0',
  level: 'context',
  entityRef: 'blueprint',
  nodes: [
    { entityRef: 'blueprint/user', type: 'person', name: 'User' },
    { entityRef: 'blueprint/app', type: 'software-system', name: 'App' },
  ],
  dependencies: [],
};

describe('loadBundledSandbox', () => {
  beforeEach(() => {
    vi.spyOn(clearSandboxModule, 'clearSandboxCaches').mockResolvedValue(undefined);
  });

  it('pickSandboxEntryDiagram prefers context level', () => {
    const entry = pickSandboxEntryDiagram([
      {
        path: 'app/containers.yaml',
        name: 'Containers',
        schema: { ...contextSchema, level: 'container', nodes: [] },
      },
      { path: 'context.yaml', name: 'Context', schema: contextSchema },
    ]);
    expect(entry?.path).toBe('context.yaml');
  });

  it('activateBundledSandbox loads systems and initializes the entry diagram', () => {
    const systems = [
      { path: 'context.yaml', name: 'Context', schema: contextSchema },
      {
        path: 'app/containers.yaml',
        name: 'Containers',
        schema: {
          name: 'App Containers',
          version: '1.0.0',
          level: 'container' as const,
          entityRef: 'blueprint/app',
          nodes: [],
          dependencies: [],
        },
      },
    ];

    let store: Record<string, unknown> = {
      isWorkspaceOpen: false,
      loadedSystems: [],
      workspaceName: '',
      diagramLoadCount: 0,
      isLoading: false,
      systemSelectInFlight: null as string | null,
      clearHistory: () => {},
      initSchema: (schema: SystemSchema) => {
        store = { ...store, schema };
      },
    };

    activateBundledSandbox(
      partial => {
        store = { ...store, ...partial };
      },
      () =>
        store as {
          isWorkspaceOpen: boolean;
          initSchema: (schema: SystemSchema) => void;
          clearHistory: () => void;
          diagramLoadCount: number;
          isLoading: boolean | string;
          systemSelectInFlight: string | null;
          loadedSystems: typeof systems;
          workspaceName: string;
        },
      systems
    );

    expect(store.loadedSystems).toHaveLength(2);
    expect(store.currentFilePath).toBe('context.yaml');
    expect(store.workspaceCatalog).toEqual(
      expect.arrayContaining([expect.objectContaining({ path: 'context.yaml', level: 'context' })])
    );
    expect(store.schema).toMatchObject({ level: 'context', name: 'ArchLens Context' });
  });

  it('activateBundledSandbox replaces a prior empty canvas', () => {
    let store: Record<string, unknown> = {
      isWorkspaceOpen: false,
      loadedSystems: [
        {
          path: 'blueprint.yaml',
          name: 'Empty',
          schema: {
            name: 'Empty',
            version: '1.0.0',
            level: 'container',
            nodes: [],
            dependencies: [],
          },
        },
      ],
      currentFilePath: 'blueprint.yaml',
      workspaceName: '',
      diagramLoadCount: 0,
      isLoading: false,
      systemSelectInFlight: null as string | null,
      clearHistory: () => {},
      initSchema: (schema: SystemSchema) => {
        store = { ...store, schema };
      },
    };

    activateBundledSandbox(
      partial => {
        store = { ...store, ...partial };
      },
      () =>
        store as {
          isWorkspaceOpen: boolean;
          initSchema: (schema: SystemSchema) => void;
          clearHistory: () => void;
          diagramLoadCount: number;
          isLoading: boolean | string;
          systemSelectInFlight: string | null;
          loadedSystems: Array<{ path: string; name: string; schema: SystemSchema }>;
          workspaceName: string;
        },
      [{ path: 'context.yaml', name: 'Context', schema: contextSchema }]
    );

    expect(store.currentFilePath).toBe('context.yaml');
    expect((store.schema as SystemSchema).nodes).toHaveLength(2);
  });

  it('reloadBundledSandbox clears storage and resets workspace state even after a folder was open', async () => {
    const clearHistory = vi.fn();
    const initSchema = vi.fn();
    let store: Record<string, unknown> = {
      isWorkspaceOpen: true,
      workspaceName: 'my-folder',
      loadedSystems: [],
      currentFilePath: 'other/context.yaml',
      diagramLoadCount: 0,
      isLoading: false,
      systemSelectInFlight: null as string | null,
      clearHistory,
      initSchema,
    };

    await reloadBundledSandbox(
      partial => {
        store = { ...store, ...partial };
      },
      () =>
        store as {
          isWorkspaceOpen: boolean;
          initSchema: (schema: SystemSchema) => void;
          clearHistory: () => void;
          diagramLoadCount: number;
          isLoading: boolean | string;
          systemSelectInFlight: string | null;
          loadedSystems: Array<{ path: string; name: string; schema: SystemSchema }>;
          workspaceName: string;
        }
    );

    expect(clearSandboxModule.clearSandboxCaches).toHaveBeenCalledTimes(1);
    expect(clearHistory).toHaveBeenCalledTimes(1);
    expect(store.isWorkspaceOpen).toBe(false);
    expect(store.workspaceName).toBe('');
    expect(store.currentFilePath).toBe('context.yaml');
    expect(initSchema).toHaveBeenCalled();
  });
});
