import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  activateBundledSandbox,
  pickSandboxEntryDiagram,
  reloadBundledSandbox,
} from './loadBundledSandbox';
import type { SystemSchema } from '@archlens/core';
import * as clearSandboxModule from '../../clearSandboxCaches';
import {
  APPLICATION_CONTEXT_PATH,
  GOLDEN_PATHS_CONTAINERS_PATH,
  GOLDEN_PATHS_CONTEXT_PATH,
} from '../../defaultData';

const goldenContainersSchema: SystemSchema = {
  name: 'Golden Journey Estate',
  version: '1.0.0',
  level: 'container',
  entityRef: 'golden-paths/golden-journey',
  nodes: [{ entityRef: 'golden-paths/golden-journey/web', type: 'web-app', name: 'Web' }],
  dependencies: [],
};

const goldenContextSchema: SystemSchema = {
  name: 'Golden Paths',
  version: '1.0.0',
  level: 'context',
  entityRef: 'golden-paths',
  nodes: [],
  dependencies: [],
};

const contextSchema: SystemSchema = {
  name: 'Application',
  version: '1.0.0',
  level: 'context',
  entityRef: 'application',
  nodes: [
    { entityRef: 'application/user', type: 'person', name: 'User' },
    { entityRef: 'blueprint/app', type: 'software-system', name: 'App' },
  ],
  dependencies: [],
};

describe('loadBundledSandbox', () => {
  beforeEach(() => {
    vi.spyOn(clearSandboxModule, 'clearSandboxCaches').mockResolvedValue(undefined);
  });

  it('pickSandboxEntryDiagram prefers Golden Paths context', () => {
    const entry = pickSandboxEntryDiagram([
      {
        path: 'app/containers.yaml',
        name: 'Containers',
        schema: { ...contextSchema, level: 'container', nodes: [] },
      },
      { path: APPLICATION_CONTEXT_PATH, name: 'Context', schema: contextSchema },
      { path: GOLDEN_PATHS_CONTEXT_PATH, name: 'Golden Paths', schema: goldenContextSchema },
      {
        path: GOLDEN_PATHS_CONTAINERS_PATH,
        name: 'Golden Journey Estate',
        schema: goldenContainersSchema,
      },
    ]);
    expect(entry?.path).toBe(GOLDEN_PATHS_CONTEXT_PATH);
  });

  it('activateBundledSandbox loads systems and initializes the entry diagram', () => {
    const systems = [
      { path: APPLICATION_CONTEXT_PATH, name: 'Context', schema: contextSchema },
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
      APPLICATION_CONTEXT_PATH,
      systems
    );

    expect(store.loadedSystems).toHaveLength(2);
    expect(store.currentFilePath).toBe(APPLICATION_CONTEXT_PATH);
    expect(store.workspaceCatalog).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ path: APPLICATION_CONTEXT_PATH, level: 'context' }),
      ])
    );
    expect(store.schema).toMatchObject({ level: 'context', name: 'Application' });
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
      APPLICATION_CONTEXT_PATH,
      [{ path: APPLICATION_CONTEXT_PATH, name: 'Context', schema: contextSchema }]
    );

    expect(store.currentFilePath).toBe(APPLICATION_CONTEXT_PATH);
    expect((store.schema as SystemSchema).nodes).toHaveLength(2);
  });

  it('buildSandboxInitialSystems loads only the selected sandbox tree', async () => {
    const { buildSandboxInitialSystems, getBlueprintPathsForSandbox } =
      await import('../../defaultData');

    const applicationSystems = buildSandboxInitialSystems(APPLICATION_CONTEXT_PATH);
    expect(applicationSystems).toHaveLength(1);
    expect(applicationSystems[0]?.path).toBe(APPLICATION_CONTEXT_PATH);

    const goldenSystems = buildSandboxInitialSystems(GOLDEN_PATHS_CONTEXT_PATH);
    expect(goldenSystems.map(system => system.path)).toEqual([
      GOLDEN_PATHS_CONTEXT_PATH,
      GOLDEN_PATHS_CONTAINERS_PATH,
    ]);

    const applicationPaths = getBlueprintPathsForSandbox(APPLICATION_CONTEXT_PATH);
    expect(applicationPaths.every(path => path.startsWith('application/'))).toBe(true);
    expect(applicationPaths).not.toContain('infrastructure/context.yaml');
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
    expect(store.currentFilePath).toBe(GOLDEN_PATHS_CONTEXT_PATH);
    expect(initSchema).toHaveBeenCalled();
  });
});
