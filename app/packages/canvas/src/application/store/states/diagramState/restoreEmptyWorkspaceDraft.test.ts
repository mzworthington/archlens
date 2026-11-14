import { describe, it, expect, beforeEach, vi } from 'vitest';
import { systemSchemaPublicUrl } from '@archlens/core';
import { useBlueprintStore } from '../../store';
import { noopWorkingCopy } from '../../../../core';
import { resetEmptyWorkspaceDraftSessionForTests } from './emptyWorkspaceDraft';
import { persistBlankCanvasSession } from '../ioState/blankCanvasSession';
import { EMPTY_WORKSPACE_PATH } from './resetToEmptyWorkspace';

const namedSession = {
  filePath: 'super_amazing.yaml',
  entityRef: 'super-amazing',
  name: 'Super amazing',
  placement: 'file' as const,
};

function draftSchema(name: string, entityRef: string, nodeRef: string) {
  return {
    name,
    version: systemSchemaPublicUrl(),
    level: 'container' as const,
    entityRef,
    nodes: [
      {
        entityRef: nodeRef,
        type: 'software-system' as const,
        name: 'API',
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
}) {
  if (input.session) persistBlankCanvasSession(input.session);
  const loadWorkingSchema = vi.fn().mockResolvedValue(input.schema);
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

  it.each([
    ['super-amazing', 'person/ada'],
    ['super-amazing/software-system-1204', 'super-amazing/software-system-1204'],
  ])('rehydrates the named blank draft for %s', async (expectedEntityRef, nodeRef) => {
    const { restored, loadWorkingSchema } = await restoreDraft({
      expectedEntityRef,
      session: namedSession,
      schema: draftSchema('Super amazing', 'super-amazing', nodeRef),
    });

    expect(restored).toBe(true);
    expect(loadWorkingSchema).toHaveBeenCalledWith(
      expect.objectContaining({
        filePath: namedSession.filePath,
        systemName: namedSession.name,
        systemEntityRef: namedSession.entityRef,
      })
    );
    expect(useBlueprintStore.getState().schema.entityRef).toBe(namedSession.entityRef);
    expect(useBlueprintStore.getState().isSampleWorkspace).toBe(false);
    expect(useBlueprintStore.getState().currentFilePath).toBe(namedSession.filePath);
  });

  it('rehydrates the empty-workspace draft for a child zoom when no named session exists', async () => {
    const { restored, loadWorkingSchema } = await restoreDraft({
      expectedEntityRef: 'empty-workspace/software-system-1204',
      schema: draftSchema(
        'Empty Workspace',
        'empty-workspace',
        'empty-workspace/software-system-1204'
      ),
    });

    expect(restored).toBe(true);
    expect(loadWorkingSchema).toHaveBeenCalledWith(
      expect.objectContaining({
        filePath: EMPTY_WORKSPACE_PATH,
        systemEntityRef: 'empty-workspace',
      })
    );
  });
});
