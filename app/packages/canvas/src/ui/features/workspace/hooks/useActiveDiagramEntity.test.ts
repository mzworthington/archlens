import { describe, it, expect, beforeEach } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useActiveDiagramEntity } from './useActiveDiagramEntity';
import { useBlueprintStore } from '../../../../application/store/store';

describe('useActiveDiagramEntity', () => {
  beforeEach(() => {
    useBlueprintStore.getState().initSchema({
      name: 'Web Containers',
      version: '1.0.0',
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
          path: 'application/context.yaml',
          name: 'Application',
          level: 'context',
          entityRef: 'application',
          nodeEntityRefs: ['blueprint/app'],
        },
        {
          path: 'app/containers.yaml',
          name: 'App Containers',
          level: 'container',
          entityRef: 'blueprint/app',
          nodeEntityRefs: ['blueprint/app/cli'],
          parentEntityRef: 'application',
        },
        {
          path: 'app/cli-components.yaml',
          name: 'Cli Service',
          level: 'component',
          entityRef: 'blueprint/app/cli',
          nodeEntityRefs: [],
          parentEntityRef: 'blueprint/app',
        },
      ],
      loadedSystems: [
        {
          path: 'app/cli-components.yaml',
          name: 'Cli Service',
          schema: {
            name: 'Cli Service',
            version: '1.0.0',
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
