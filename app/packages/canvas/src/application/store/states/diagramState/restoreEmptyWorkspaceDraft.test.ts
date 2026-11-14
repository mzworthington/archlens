import { describe, it, expect, beforeEach, vi } from 'vitest';
import { systemSchemaPublicUrl } from '@archlens/core';
import { useBlueprintStore } from '../../store';
import { noopWorkingCopy } from '../../../../core';
import {
  isFolderWorkspacePreferred,
  resetWorkspaceOpenSessionForTests,
} from '../../workspaceOpenSession';
import { resetEmptyWorkspaceDraftSessionForTests } from './emptyWorkspaceDraft';
import { persistBlankCanvasSession } from '../ioState/blankCanvasSession';
import { EMPTY_WORKSPACE_PATH } from './resetToEmptyWorkspace';

const namedSession = {
  filePath: 'super_amazing.yaml',
  entityRef: 'super-amazing',
  name: 'Super amazing',
  placement: 'file' as const,
};

const childZoomPath = 'software-system-1204-components.yaml';
const grandchildZoomPath = 'handler-code.yaml';

function draftSchema(
  name: string,
  entityRef: string,
  nodeRef: string,
  options?: { level?: 'container' | 'component' | 'code'; nodeName?: string; nodeType?: string }
) {
  return {
    name,
    version: systemSchemaPublicUrl(),
    level: options?.level ?? ('container' as const),
    entityRef,
    nodes: [
      {
        entityRef: nodeRef,
        type: (options?.nodeType ?? 'software-system') as 'software-system',
        name: options?.nodeName ?? 'API',
        position: { x: 10, y: 20 },
      },
    ],
    dependencies: [],
  };
}

async function restoreDraft(input: {
  expectedEntityRef: string;
  schema: ReturnType<typeof draftSchema>;
  session?: typeof namedSession;
  child?: { filePath: string; schema: ReturnType<typeof draftSchema> | null };
  children?: Array<{ filePath: string; schema: ReturnType<typeof draftSchema> | null }>;
}) {
  if (input.session) persistBlankCanvasSession(input.session);
  const byPath = new Map<string, ReturnType<typeof draftSchema> | null>();
  if (input.child) byPath.set(input.child.filePath, input.child.schema);
  for (const child of input.children ?? []) {
    byPath.set(child.filePath, child.schema);
  }
  const loadWorkingSchema = vi.fn(async (args: { filePath: string }) => {
    if (byPath.has(args.filePath)) return byPath.get(args.filePath) ?? null;
    return input.schema;
  });
  useBlueprintStore.setState({
    workingCopyPort: { ...noopWorkingCopy, loadWorkingSchema },
  });
  const restored = await useBlueprintStore
    .getState()
    .restoreEmptyWorkspaceDraft({ expectedEntityRef: input.expectedEntityRef });
  return { restored, loadWorkingSchema };
}

describe('restoreEmptyWorkspaceDraft', () => {
  beforeEach(() => {
    resetEmptyWorkspaceDraftSessionForTests();
    resetWorkspaceOpenSessionForTests();
    useBlueprintStore.setState({
      isWorkspaceOpen: false,
      nodes: [],
      schema: {
        name: 'Loading',
        version: systemSchemaPublicUrl(),
        level: 'context',
        nodes: [],
        dependencies: [],
      },
      workingCopyPort: {
        ...noopWorkingCopy,
        loadWorkingSchema: vi.fn().mockResolvedValue({
          name: 'Empty Workspace',
          version: systemSchemaPublicUrl(),
          level: 'container',
          entityRef: 'empty-workspace',
          nodes: [
            {
              entityRef: 'person/ada',
              type: 'person',
              name: 'Ada',
              position: { x: 10, y: 20 },
            },
          ],
          dependencies: [],
        }),
      },
    });
  });

  it('rehydrates an IndexedDB blank-canvas draft onto the empty workspace', async () => {
    const restored = await useBlueprintStore.getState().restoreEmptyWorkspaceDraft();

    expect(restored).toBe(true);
    const state = useBlueprintStore.getState();
    expect(state.currentFilePath).toBe(EMPTY_WORKSPACE_PATH);
    expect(state.schema.nodes).toHaveLength(1);
    expect(state.schema.nodes[0]?.name).toBe('Ada');
    expect(state.nodes).toHaveLength(1);
    expect(state.isWorkspaceOpen).toBe(false);
    expect(isFolderWorkspacePreferred()).toBe(true);
  });

  it('does not restore when a folder workspace is open', async () => {
    useBlueprintStore.setState({ isWorkspaceOpen: true });

    const restored = await useBlueprintStore.getState().restoreEmptyWorkspaceDraft();

    expect(restored).toBe(false);
    expect(useBlueprintStore.getState().schema.nodes).toHaveLength(0);
  });

  it('does not restore when the in-memory canvas already has nodes', async () => {
    useBlueprintStore.setState({
      nodes: [{ id: 'existing', position: { x: 0, y: 0 }, data: {} } as never],
    });

    const restored = await useBlueprintStore.getState().restoreEmptyWorkspaceDraft();

    expect(restored).toBe(false);
  });

  it('does not restore immediately after an explicit blank start', async () => {
    useBlueprintStore.getState().resetToEmptyWorkspace();

    const restored = await useBlueprintStore.getState().restoreEmptyWorkspaceDraft();

    expect(restored).toBe(false);
    expect(useBlueprintStore.getState().schema.nodes).toEqual([]);
  });

  it('rehydrates a named saved draft for its workspace URL', async () => {
    const { restored, loadWorkingSchema } = await restoreDraft({
      expectedEntityRef: namedSession.entityRef,
      session: namedSession,
      schema: draftSchema('Super amazing', 'super-amazing', 'person/ada'),
    });

    expect(restored).toBe(true);
    expect(loadWorkingSchema).toHaveBeenCalledTimes(1);
    expect(loadWorkingSchema).toHaveBeenCalledWith(
      expect.objectContaining({
        filePath: namedSession.filePath,
        systemName: namedSession.name,
        systemEntityRef: namedSession.entityRef,
      })
    );
    expect(useBlueprintStore.getState().schema.entityRef).toBe(namedSession.entityRef);
    expect(useBlueprintStore.getState().currentFilePath).toBe(namedSession.filePath);
  });

  it('rehydrates the create-zoom child and its working copy for a child URL', async () => {
    const childRef = 'super-amazing/software-system-1204';
    const { restored, loadWorkingSchema } = await restoreDraft({
      expectedEntityRef: childRef,
      session: namedSession,
      schema: draftSchema('Super amazing', 'super-amazing', childRef),
      child: {
        filePath: childZoomPath,
        schema: draftSchema('API Components', childRef, `${childRef}/handler`, {
          level: 'component',
          nodeName: 'Handler',
        }),
      },
    });

    expect(restored).toBe(true);
    expect(loadWorkingSchema).toHaveBeenCalledWith(
      expect.objectContaining({
        filePath: namedSession.filePath,
        systemEntityRef: namedSession.entityRef,
      })
    );
    expect(loadWorkingSchema).toHaveBeenCalledWith(
      expect.objectContaining({
        filePath: childZoomPath,
        systemName: 'API Components',
        systemEntityRef: childRef,
        systemLevel: 'component',
      })
    );
    const state = useBlueprintStore.getState();
    expect(state.isSampleWorkspace).toBe(false);
    expect(state.currentFilePath).toBe(childZoomPath);
    expect(state.schema.entityRef).toBe(childRef);
    expect(state.schema.nodes.map(node => node.name)).toEqual(['Handler']);
    expect(state.loadedSystems.map(system => system.path).sort()).toEqual([
      childZoomPath,
      namedSession.filePath,
    ]);
    expect(state.workspaceCatalog).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          path: namedSession.filePath,
          entityRef: namedSession.entityRef,
        }),
        expect.objectContaining({
          path: childZoomPath,
          entityRef: childRef,
        }),
      ])
    );
  });

  it('rehydrates an empty create-zoom child when that working copy has no nodes', async () => {
    const childRef = 'empty-workspace/software-system-1204';
    const { restored, loadWorkingSchema } = await restoreDraft({
      expectedEntityRef: childRef,
      schema: draftSchema('Empty Workspace', 'empty-workspace', childRef),
      child: { filePath: childZoomPath, schema: null },
    });

    expect(restored).toBe(true);
    expect(loadWorkingSchema).toHaveBeenCalledWith(
      expect.objectContaining({
        filePath: EMPTY_WORKSPACE_PATH,
        systemEntityRef: 'empty-workspace',
      })
    );
    expect(loadWorkingSchema).toHaveBeenCalledWith(
      expect.objectContaining({
        filePath: childZoomPath,
        systemEntityRef: childRef,
      })
    );
    const state = useBlueprintStore.getState();
    expect(state.currentFilePath).toBe(childZoomPath);
    expect(state.schema.entityRef).toBe(childRef);
    expect(state.schema.level).toBe('component');
    expect(state.schema.nodes).toEqual([]);
    expect(state.workspaceCatalog).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          entityRef: childRef,
          path: childZoomPath,
        }),
      ])
    );
  });

  it('rehydrates a nested create-zoom grandchild for a deeper URL', async () => {
    const childRef = 'super-amazing/software-system-1204';
    const grandchildRef = `${childRef}/handler`;
    const { restored } = await restoreDraft({
      expectedEntityRef: grandchildRef,
      session: namedSession,
      schema: draftSchema('Super amazing', 'super-amazing', childRef),
      children: [
        {
          filePath: childZoomPath,
          schema: draftSchema('API Components', childRef, grandchildRef, {
            level: 'component',
            nodeName: 'Handler',
            nodeType: 'component',
          }),
        },
        {
          filePath: grandchildZoomPath,
          schema: draftSchema('Handler Code', grandchildRef, `${grandchildRef}/fn`, {
            level: 'code',
            nodeName: 'Fn',
            nodeType: 'component',
          }),
        },
      ],
    });

    expect(restored).toBe(true);
    const state = useBlueprintStore.getState();
    expect(state.currentFilePath).toBe(grandchildZoomPath);
    expect(state.schema.entityRef).toBe(grandchildRef);
    expect(state.schema.level).toBe('code');
    expect(state.loadedSystems.map(system => system.path).sort()).toEqual(
      [childZoomPath, grandchildZoomPath, namedSession.filePath].sort()
    );
  });
});
