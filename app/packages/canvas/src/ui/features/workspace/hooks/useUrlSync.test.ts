import { renderHook } from '@testing-library/react';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { useUrlSync } from './useUrlSync';
import { useBlueprintStore } from '../../../../application/store/store';

const setLocation = vi.fn();
let mockLocation = '/workspace/blueprint/app/cli/nodefilesystem';
let mockRouteParams: { '*': string } = { '*': 'blueprint/app/cli/nodefilesystem' };

vi.mock('wouter', () => ({
  useLocation: () => [mockLocation, setLocation],
  useRoute: () => [true, mockRouteParams],
}));

describe('useUrlSync', () => {
  beforeEach(() => {
    mockLocation = '/workspace/blueprint/app/cli/nodefilesystem';
    mockRouteParams = { '*': 'blueprint/app/cli/nodefilesystem' };
    setLocation.mockReset();
    const { initSchema } = useBlueprintStore.getState();
    initSchema({
      name: 'CLI Components',
      version: '1.0.0',
      level: 'component',
      entityRef: 'blueprint/app/cli',
      nodes: [
        {
          entityRef: 'blueprint/app/cli/nodefilesystem',
          type: 'background-worker',
          name: 'nodeFileSystem',
        },
        { entityRef: 'blueprint/app/cli/ports', type: 'background-worker', name: 'ports Service' },
      ],
      dependencies: [
        {
          from: 'blueprint/app/cli/nodefilesystem',
          to: 'blueprint/app/cli/ports',
          type: 'direct-call',
        },
      ],
    });
    useBlueprintStore.setState({
      selectedNodeId: 'blueprint/app/cli/nodefilesystem',
      currentFilePath: 'app/cli-components.yaml',
      workspaceCatalog: [
        {
          path: 'app/cli-components.yaml',
          name: 'CLI Components',
          level: 'component',
          entityRef: 'blueprint/app/cli',
          nodeEntityRefs: ['blueprint/app/cli/nodefilesystem', 'blueprint/app/cli/ports'],
        },
      ],
      loadedSystems: [
        {
          path: 'app/cli-components.yaml',
          name: 'CLI Components',
          schema: useBlueprintStore.getState().schema,
        },
      ],
      isWorkspaceOpen: true,
      workspaceName: 'blueprint',
      isStartupOpen: false,
      systemSelectInFlight: null,
      diagramLoadCount: 0,
    });
  });

  it('does not update the URL when the user selects a node on the canvas', () => {
    const { rerender } = renderHook(() => useUrlSync());

    useBlueprintStore.getState().selectNode('blueprint/app/cli/ports');
    rerender();

    expect(setLocation).not.toHaveBeenCalled();
    expect(useBlueprintStore.getState().selectedNodeId).toBe('blueprint/app/cli/ports');
  });

  it('selects a node when the URL names a node on the loaded diagram', () => {
    renderHook(() => useUrlSync());

    expect(useBlueprintStore.getState().selectedNodeId).toBe('blueprint/app/cli/nodefilesystem');
  });

  it('loads the owning diagram when the URL names a node on another file', async () => {
    mockLocation = '/workspace/billing/api';
    mockRouteParams = { '*': 'billing/api' };

    const { initSchema } = useBlueprintStore.getState();
    initSchema({
      name: 'Billing Context',
      version: '1.0.0',
      level: 'context',
      entityRef: 'billing',
      nodes: [
        { entityRef: 'billing/api', type: 'microservice', name: 'Billing API' },
        { entityRef: 'billing/orders', type: 'microservice', name: 'Orders' },
      ],
      dependencies: [],
    });

    useBlueprintStore.setState({
      selectedNodeId: null,
      currentFilePath: 'context.yaml',
      workspaceCatalog: [
        {
          path: 'context.yaml',
          name: 'Billing Context',
          level: 'context',
          entityRef: 'billing',
          nodeEntityRefs: ['billing/api', 'billing/orders'],
        },
        {
          path: 'api-components.yaml',
          name: 'Billing API Components',
          level: 'component',
          entityRef: 'billing/api',
          nodeEntityRefs: ['billing/api/handler'],
        },
      ],
      loadedSystems: [
        {
          path: 'context.yaml',
          name: 'Billing Context',
          schema: useBlueprintStore.getState().schema,
        },
        {
          path: 'api-components.yaml',
          name: 'Billing API Components',
          schema: {
            name: 'Billing API Components',
            version: '1.0.0',
            level: 'component',
            entityRef: 'billing/api',
            nodes: [{ entityRef: 'billing/api/handler', type: 'component', name: 'Handler' }],
            dependencies: [],
          },
        },
      ],
      isWorkspaceOpen: true,
      workspaceName: 'billing',
      isStartupOpen: false,
      systemSelectInFlight: null,
      diagramLoadCount: 0,
    });

    const selectSystem = vi.spyOn(useBlueprintStore.getState(), 'selectSystem');
    renderHook(() => useUrlSync());

    await vi.waitFor(() => {
      expect(selectSystem).toHaveBeenCalledWith('api-components.yaml');
    });
  });

  it('selects the context diagram when the URL names a context but the canvas shows a child estate', async () => {
    mockLocation = '/workspace/samples';
    mockRouteParams = { '*': 'samples' };

    const contextSchema = {
      name: 'Samples',
      version: '1.0.0',
      level: 'context' as const,
      entityRef: 'samples',
      nodes: [
        {
          entityRef: 'samples/golden-journey',
          type: 'group' as const,
          name: 'Golden Journey Estate',
        },
      ],
      dependencies: [],
    };
    const estateSchema = {
      name: 'Golden Journey Estate',
      version: '1.0.0',
      level: 'container' as const,
      entityRef: 'samples/golden-journey',
      nodes: [
        {
          entityRef: 'samples/golden-journey/web',
          type: 'web-app' as const,
          name: 'Web Storefront',
        },
      ],
      dependencies: [],
    };

    useBlueprintStore.setState({
      schema: estateSchema,
      selectedNodeId: null,
      currentFilePath: 'containers.yaml',
      workspaceCatalog: [
        {
          path: 'context.yaml',
          name: 'Samples',
          level: 'context',
          entityRef: 'samples',
          nodeEntityRefs: ['samples/golden-journey'],
        },
        {
          path: 'containers.yaml',
          name: 'Golden Journey Estate',
          level: 'container',
          entityRef: 'samples/golden-journey',
          nodeEntityRefs: ['samples/golden-journey/web'],
          parentEntityRef: 'samples',
        },
      ],
      loadedSystems: [
        {
          path: 'context.yaml',
          name: 'Samples',
          schema: contextSchema,
        },
        {
          path: 'containers.yaml',
          name: 'Golden Journey Estate',
          schema: estateSchema,
        },
      ],
      isWorkspaceOpen: false,
      workspaceName: '',
      isStartupOpen: false,
      systemSelectInFlight: null,
      diagramLoadCount: 0,
    });

    const selectSystem = vi.spyOn(useBlueprintStore.getState(), 'selectSystem');
    renderHook(() => useUrlSync());

    await vi.waitFor(() => {
      expect(selectSystem).toHaveBeenCalledWith('context.yaml');
    });
  });
});
