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

  it('updates the URL when the user selects a different node on the canvas', () => {
    const { rerender } = renderHook(() => useUrlSync());

    useBlueprintStore.getState().selectNode('blueprint/app/cli/ports');
    rerender();

    expect(setLocation).toHaveBeenCalledWith('/workspace/blueprint/app/cli/ports', {
      replace: true,
    });
    expect(useBlueprintStore.getState().selectedNodeId).toBe('blueprint/app/cli/ports');
  });

  it('keeps the diagram URL when selecting an external node on the canvas', () => {
    mockLocation = '/workspace/billing/orders';
    mockRouteParams = { '*': 'billing/orders' };

    const { initSchema } = useBlueprintStore.getState();
    initSchema({
      name: 'Orders Components',
      version: '1.0.0',
      level: 'component',
      entityRef: 'billing/orders',
      nodes: [
        { entityRef: 'billing/orders/checkout', type: 'component', name: 'Checkout' },
        {
          entityRef: 'billing/api',
          type: 'rest-api',
          name: 'Billing API',
          external: true,
        },
      ],
      dependencies: [],
    });

    useBlueprintStore.setState({
      selectedNodeId: null,
      currentFilePath: 'orders-components.yaml',
      workspaceCatalog: [
        {
          path: 'orders-components.yaml',
          name: 'Orders Components',
          level: 'component',
          entityRef: 'billing/orders',
          nodeEntityRefs: ['billing/orders/checkout', 'billing/api'],
        },
        {
          path: 'containers.yaml',
          name: 'Billing Containers',
          level: 'container',
          entityRef: 'billing',
          nodeEntityRefs: ['billing/api'],
        },
      ],
      loadedSystems: [
        {
          path: 'orders-components.yaml',
          name: 'Orders Components',
          schema: useBlueprintStore.getState().schema,
        },
      ],
      isWorkspaceOpen: true,
      workspaceName: 'billing',
      isStartupOpen: false,
      systemSelectInFlight: null,
      diagramLoadCount: 0,
    });

    const { rerender } = renderHook(() => useUrlSync());
    setLocation.mockClear();

    useBlueprintStore.getState().selectNode('billing/api');
    rerender();

    expect(useBlueprintStore.getState().selectedNodeId).toBe('billing/api');
    expect(setLocation).not.toHaveBeenCalledWith('/workspace/billing/api', expect.anything());
  });

  it('keeps the diagram URL when selecting a node that has a child diagram (zoom is explicit)', () => {
    mockLocation = '/workspace/billing';
    mockRouteParams = { '*': 'billing' };

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
    const { rerender } = renderHook(() => useUrlSync());
    setLocation.mockClear();
    selectSystem.mockClear();

    useBlueprintStore.getState().selectNode('billing/api');
    rerender();

    expect(useBlueprintStore.getState().selectedNodeId).toBe('billing/api');
    expect(setLocation).not.toHaveBeenCalled();
    expect(selectSystem).not.toHaveBeenCalled();
    expect(useBlueprintStore.getState().currentFilePath).toBe('context.yaml');
  });

  it('selects the context diagram when the URL names a context but the canvas shows a child estate', async () => {
    mockLocation = '/workspace/golden-paths';
    mockRouteParams = { '*': 'golden-paths' };

    const contextSchema = {
      name: 'Golden Paths',
      version: '1.0.0',
      level: 'context' as const,
      entityRef: 'golden-paths',
      nodes: [
        {
          entityRef: 'golden-paths/golden-journey',
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
      entityRef: 'golden-paths/golden-journey',
      nodes: [
        {
          entityRef: 'golden-paths/golden-journey/web',
          type: 'web-app' as const,
          name: 'Web Storefront',
        },
      ],
      dependencies: [],
    };

    useBlueprintStore.setState({
      schema: estateSchema,
      selectedNodeId: null,
      currentFilePath: 'golden-journey/containers.yaml',
      workspaceCatalog: [
        {
          path: 'golden-journey/context.yaml',
          name: 'Golden Paths',
          level: 'context',
          entityRef: 'golden-paths',
          nodeEntityRefs: ['golden-paths/golden-journey'],
        },
        {
          path: 'golden-journey/containers.yaml',
          name: 'Golden Journey Estate',
          level: 'container',
          entityRef: 'golden-paths/golden-journey',
          nodeEntityRefs: ['golden-paths/golden-journey/web'],
          parentEntityRef: 'golden-paths',
        },
      ],
      loadedSystems: [
        {
          path: 'golden-journey/context.yaml',
          name: 'Golden Paths',
          schema: contextSchema,
        },
        {
          path: 'golden-journey/containers.yaml',
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
      expect(selectSystem).toHaveBeenCalledWith('golden-journey/context.yaml');
    });
  });
});
