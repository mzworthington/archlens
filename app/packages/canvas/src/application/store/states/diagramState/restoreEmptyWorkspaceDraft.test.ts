import { describe, it, expect, beforeEach, vi } from 'vitest';
import { systemSchemaPublicUrl } from '@archlens/core';
import { useBlueprintStore } from '../../store';
import { noopWorkingCopy } from '../../../../core';
import { resetEmptyWorkspaceDraftSessionForTests } from './emptyWorkspaceDraft';
import { persistBlankCanvasSession } from '../ioState/blankCanvasSession';
import { EMPTY_WORKSPACE_PATH } from './resetToEmptyWorkspace';

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

  it('rehydrates a named saved draft for its workspace URL', async () => {
    persistBlankCanvasSession({
      filePath: 'super_amazing.yaml',
      entityRef: 'super-amazing',
      name: 'Super amazing',
    });
    const loadWorkingSchema = vi.fn().mockResolvedValue({
      name: 'Super amazing',
      version: systemSchemaPublicUrl(),
      level: 'container',
      entityRef: 'super-amazing',
      nodes: [
        {
          entityRef: 'person/ada',
          type: 'person',
          name: 'Ada',
          position: { x: 10, y: 20 },
        },
      ],
      dependencies: [],
    });
    useBlueprintStore.setState({
      workingCopyPort: { ...noopWorkingCopy, loadWorkingSchema },
    });

    const restored = await useBlueprintStore
      .getState()
      .restoreEmptyWorkspaceDraft({ expectedEntityRef: 'super-amazing' });

    expect(restored).toBe(true);
    expect(loadWorkingSchema).toHaveBeenCalledWith(
      expect.objectContaining({
        filePath: 'super_amazing.yaml',
        systemName: 'Super amazing',
        systemEntityRef: 'super-amazing',
      })
    );
    expect(useBlueprintStore.getState().schema.entityRef).toBe('super-amazing');
    expect(useBlueprintStore.getState().currentFilePath).toBe('super_amazing.yaml');
  });
});
