import { describe, it, expect, beforeEach } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useActiveDiagramEntity } from './useActiveDiagramEntity';
import { useBlueprintStore } from '../../../../application/store/store';

describe('useActiveDiagramEntity', () => {
  beforeEach(() => {
    useBlueprintStore.getState().initSchema({
      name: 'Web Containers',
      apiVersion: 'blueprint.dev/v4', kind: 'Diagram',
      level: 'container',
      entityRef: 'blueprint/app/cli',
      nodes: [],
      dependencies: [],
    });
    useBlueprintStore.setState({
      isWorkspaceOpen: false,
      workspaceName: '',
      workspaceCatalog: [
        {
          path: 'context.yaml',
          name: 'Blueprint',
          level: 'context',
          entityRef: 'blueprint',
          nodeEntityRefs: ['blueprint/app'],
        },
        {
          path: 'app/cli-components.yaml',
          name: 'Cli Service',
          level: 'component',
          entityRef: 'blueprint/app/cli',
          nodeEntityRefs: [],
        },
      ],
      loadedSystems: [
        {
          path: 'app/cli-components.yaml',
          name: 'Cli Service',
          schema: {
            name: 'Cli Service',
            apiVersion: 'blueprint.dev/v4', kind: 'Diagram',
            level: 'component',
            entityRef: 'blueprint/app/cli',
            nodes: [],
            dependencies: [],
          },
        },
      ],
    });
  });

  it('derives parent entityRef from the active diagram without loading the parent system', () => {
    const { result } = renderHook(() => useActiveDiagramEntity());

    expect(result.current.activeEntityRef).toBe('blueprint/app/cli');
    expect(result.current.parentEntityRef).toBe('blueprint/app');
  });
});
