import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, beforeEach } from 'vitest';
import { Router } from 'wouter';
import { memoryLocation } from 'wouter/memory-location';
import { Breadcrumbs } from './Breadcrumbs';
import { useBlueprintStore } from '../../../../../application/store/store';

describe('Breadcrumbs Component', () => {
  beforeEach(() => {
    useBlueprintStore.setState({
      workspaceName: '',
      isWorkspaceOpen: false,
      currentFilePath: 'blueprint.yaml',
      loadedSystems: [],
      selectedNodeId: null,
    });

    const { initSchema } = useBlueprintStore.getState();
    initSchema({
      name: 'Main App System',
      version: '1.0.0',
      level: 'container',
      nodes: [],
      dependencies: [],
    });
  });

  it('renders sample workspace label when bundled sample is open', () => {
    useBlueprintStore.setState({
      loadedSystems: [
        {
          path: 'context.yaml',
          name: 'Samples',
          schema: {
            name: 'Samples',
            version: '1.0.0',
            level: 'context',
            entityRef: 'samples',
            nodes: [],
            dependencies: [],
          },
        },
      ],
      isWorkspaceOpen: true,
      isSampleWorkspace: true,
      workspaceName: 'Samples',
      currentFilePath: 'context.yaml',
    });

    const { initSchema } = useBlueprintStore.getState();
    initSchema({
      name: 'Samples',
      version: '1.0.0',
      level: 'context',
      entityRef: 'samples',
      nodes: [],
      dependencies: [],
    });

    render(<Breadcrumbs />);

    expect(screen.getAllByText('Samples').length).toBeGreaterThan(0);
    expect(screen.getByTestId('workspace-storage-badge')).toHaveTextContent('Sample');
  });

  it('renders folder badge when a directory workspace is open', () => {
    useBlueprintStore.setState({
      isWorkspaceOpen: true,
      isSampleWorkspace: false,
      workspaceName: 'DevPortalRepo',
    });

    render(<Breadcrumbs />);

    expect(screen.getByText('DevPortalRepo')).toBeInTheDocument();
    expect(screen.getByTestId('workspace-storage-badge')).toHaveTextContent('Folder');
  });

  it('omits workspace chrome when no workspace is open', () => {
    render(<Breadcrumbs />);

    expect(screen.queryByTestId('workspace-storage-badge')).not.toBeInTheDocument();
    expect(screen.getAllByText('Main App System').length).toBeGreaterThan(0);
  });

  it('renders next hierarchy level preview when a node with next level component schema is selected', () => {
    useBlueprintStore.setState({
      currentFilePath: 'application/containers.yaml',
    });

    const { initSchema } = useBlueprintStore.getState();
    initSchema({
      entityRef: 'blueprint',
      name: 'Main App System',
      version: '1.0.0',
      level: 'container',
      nodes: [
        {
          entityRef: 'application/web-app',
          type: 'web-app',
          name: 'Web Application',
          position: { x: 100, y: 100 },
        },
      ],
      dependencies: [],
    });

    useBlueprintStore.setState({
      selectedNodeId: 'application/web-app',
      schema: {
        entityRef: 'blueprint',
        name: 'Main App System',
        version: '1.0.0',
        level: 'container',
        nodes: [
          {
            entityRef: 'application/web-app',
            type: 'web-app',
            name: 'Web Application',
            position: { x: 100, y: 100 },
          },
        ],
        dependencies: [],
      },
      loadedSystems: [
        {
          path: 'web-app-components.yaml',
          name: 'Web App Components',
          schema: {
            name: 'Web App Components',
            version: '1.0.0',
            level: 'component',
            entityRef: 'application/web-app',
            nodes: [],
            dependencies: [],
          },
        },
      ],
    });

    render(<Breadcrumbs />);

    expect(screen.getByText('Web Application')).toBeInTheDocument();
  });

  it('renders dropdown button with child components and triggers selectSystem when child is clicked', () => {
    const { initSchema } = useBlueprintStore.getState();
    initSchema({
      entityRef: 'blueprint',
      name: 'Container Diagram',
      version: '1.0.0',
      level: 'container',
      nodes: [
        {
          entityRef: 'application/component',
          type: 'web-app',
          name: 'Component Node',
        },
      ],
      dependencies: [],
    });

    useBlueprintStore.setState({
      isWorkspaceOpen: true,
      workspaceName: 'TestWorkspace',
      currentFilePath: 'blueprints/application/containers.yaml',

      schema: {
        entityRef: 'blueprint',
        name: 'Container Diagram',
        version: '1.0.0',
        level: 'container',
        nodes: [
          {
            entityRef: 'application/component',
            type: 'web-app',
            name: 'Component Node',
          },
        ],
        dependencies: [],
      },
      loadedSystems: [
        {
          path: 'blueprints/application/containers.yaml',
          name: 'Container Diagram',
          schema: {
            entityRef: 'application',
            name: 'Container Diagram',
            version: '1.0.0',
            level: 'container',
            nodes: [
              {
                entityRef: 'application/component',
                type: 'web-app',
                name: 'Component Node',
              },
            ],
            dependencies: [],
          },
        },
        {
          path: 'blueprints/application/component.yaml',
          name: 'Component Diagram',
          schema: {
            name: 'Component Diagram',
            version: '1.0.0',
            level: 'component',
            entityRef: 'application/component',
            nodes: [],
            dependencies: [],
          },
        },
      ],
    });

    render(<Breadcrumbs />);

    const dropdownBtn = screen.getByTitle('Explore child components');
    expect(dropdownBtn).toBeInTheDocument();

    fireEvent.click(dropdownBtn);

    expect(screen.getByText('Jump to component')).toBeInTheDocument();
    const childOption = screen.getByText('Component Diagram').closest('a');
    expect(childOption).toBeInTheDocument();
    expect(childOption).toHaveAttribute('href', '/workspace/application/component');
  });

  it('always shows the context diagram when viewing a deep diagram without intermediate ancestors loaded', () => {
    const contextSchema = {
      name: 'Application',
      version: '1.0.0',
      level: 'context' as const,
      entityRef: 'application',
      nodes: [
        {
          entityRef: 'backstage/packages',
          type: 'software-system' as const,
          name: 'Packages System',
        },
      ],
      dependencies: [],
    };
    const componentSchema = {
      name: 'Core Service Components',
      version: '1.0.0',
      level: 'component' as const,
      entityRef: 'backstage/packages/core',
      nodes: [],
      dependencies: [],
    };

    useBlueprintStore.setState({
      loadedSystems: [
        {
          path: 'application/context.yaml',
          name: 'Application',
          schema: contextSchema,
        },
        {
          path: 'packages/core-components.yaml',
          name: 'Core Service Components',
          schema: componentSchema,
        },
      ],
      workspaceCatalog: [
        {
          path: 'application/context.yaml',
          name: 'Application',
          level: 'context',
          entityRef: 'application',
          nodeEntityRefs: ['backstage/packages'],
        },
        {
          path: 'packages/core-components.yaml',
          name: 'Core Service Components',
          level: 'component',
          entityRef: 'backstage/packages/core',
          nodeEntityRefs: [],
          parentEntityRef: 'backstage/packages',
        },
      ],
      currentFilePath: 'packages/core-components.yaml',
      schema: componentSchema,
      isWorkspaceOpen: true,
      workspaceName: 'backstage',
    });

    render(<Breadcrumbs />);

    const contextLink = screen.getAllByText('Application').find(el => el.closest('a'));
    expect(contextLink?.closest('a')).toHaveAttribute('href', '/workspace/application');
    expect(screen.getAllByText('Application').length).toBeGreaterThan(0);
    expect(screen.getByText('Packages System')).toBeInTheDocument();
    expect(screen.getByText('Core Service Components')).toBeInTheDocument();
  });

  it('preserves TraceLens in breadcrumb links while the lens is active', () => {
    const { hook } = memoryLocation({
      path: '/workspace/samples/golden-journey/catalog-platform/catalog-api-components?lens=tracelens',
    });

    useBlueprintStore.setState({
      loadedSystems: [
        {
          path: 'golden-journey/context.yaml',
          name: 'Samples',
          schema: {
            name: 'Samples',
            version: '1.0.0',
            level: 'context',
            entityRef: 'samples',
            nodes: [{ entityRef: 'samples/golden-journey', type: 'group', name: 'Golden Journey' }],
            dependencies: [],
          },
        },
        {
          path: 'golden-journey/containers.yaml',
          name: 'Golden Journey Estate',
          schema: {
            name: 'Golden Journey Estate',
            version: '1.0.0',
            level: 'container',
            entityRef: 'samples/golden-journey',
            nodes: [
              {
                entityRef: 'samples/golden-journey/catalog-platform',
                type: 'group',
                name: 'Catalog Platform',
              },
            ],
            dependencies: [],
          },
        },
        {
          path: 'golden-journey/catalog-platform/containers.yaml',
          name: 'Catalog Platform',
          schema: {
            name: 'Catalog Platform',
            version: '1.0.0',
            level: 'container',
            entityRef: 'samples/golden-journey/catalog-platform',
            nodes: [
              {
                entityRef: 'samples/golden-journey/catalog-platform/catalog-api',
                type: 'rest-api',
                name: 'Catalog API',
              },
            ],
            dependencies: [],
          },
        },
        {
          path: 'golden-journey/catalog-platform/catalog-api-components.yaml',
          name: 'Catalog API Components',
          schema: {
            name: 'Catalog API Components',
            version: '1.0.0',
            level: 'component',
            entityRef: 'samples/golden-journey/catalog-platform/catalog-api',
            nodes: [],
            dependencies: [],
          },
        },
      ],
      workspaceCatalog: [
        {
          path: 'golden-journey/context.yaml',
          name: 'Samples',
          level: 'context',
          entityRef: 'samples',
          nodeEntityRefs: ['samples/golden-journey'],
        },
        {
          path: 'golden-journey/containers.yaml',
          name: 'Golden Journey Estate',
          level: 'container',
          entityRef: 'samples/golden-journey',
          nodeEntityRefs: ['samples/golden-journey/catalog-platform'],
          parentEntityRef: 'samples',
        },
        {
          path: 'golden-journey/catalog-platform/containers.yaml',
          name: 'Catalog Platform',
          level: 'container',
          entityRef: 'samples/golden-journey/catalog-platform',
          nodeEntityRefs: ['samples/golden-journey/catalog-platform/catalog-api'],
          parentEntityRef: 'samples/golden-journey',
        },
        {
          path: 'golden-journey/catalog-platform/catalog-api-components.yaml',
          name: 'Catalog API Components',
          level: 'component',
          entityRef: 'samples/golden-journey/catalog-platform/catalog-api',
          nodeEntityRefs: [],
          parentEntityRef: 'samples/golden-journey/catalog-platform',
        },
      ],
      currentFilePath: 'golden-journey/catalog-platform/catalog-api-components.yaml',
      isWorkspaceOpen: true,
      workspaceName: 'samples',
      isSampleWorkspace: true,
    });

    const { initSchema } = useBlueprintStore.getState();
    initSchema(useBlueprintStore.getState().loadedSystems[3]!.schema);

    render(
      <Router hook={hook}>
        <Breadcrumbs />
      </Router>
    );

    const samplesLink = screen.getAllByText('Samples').find(el => el.closest('a'));
    expect(samplesLink?.closest('a')).toHaveAttribute('href', '/workspace/samples?lens=tracelens');
  });

  it('shows a compact summary and opens the full trail in a mobile menu', () => {
    const { hook } = memoryLocation({ path: '/workspace' });
    render(
      <Router hook={hook}>
        <Breadcrumbs />
      </Router>
    );

    expect(screen.getAllByText('Main App System').length).toBeGreaterThan(0);

    fireEvent.click(screen.getByRole('button', { name: 'Open diagram location menu' }));

    expect(screen.getAllByText('Main App System').length).toBeGreaterThan(1);
  });

  it('lists peer context diagrams from the workspace catalog before they are lazy-loaded', () => {
    const samplesSchema = {
      name: 'Samples',
      version: '1.0.0',
      level: 'context' as const,
      entityRef: 'samples',
      nodes: [],
      dependencies: [],
    };

    useBlueprintStore.setState({
      isWorkspaceOpen: true,
      isSampleWorkspace: true,
      workspaceName: 'samples',
      currentFilePath: 'golden-journey/context.yaml',
      schema: samplesSchema,
      loadedSystems: [
        {
          path: 'golden-journey/context.yaml',
          name: 'Samples',
          schema: samplesSchema,
        },
      ],
      workspaceCatalog: [
        {
          path: 'golden-journey/context.yaml',
          name: 'Samples',
          level: 'context',
          entityRef: 'samples',
          nodeEntityRefs: [],
        },
        {
          path: 'backstage/context.yaml',
          name: 'Backstage',
          level: 'context',
          entityRef: 'backstage',
          nodeEntityRefs: [],
        },
        {
          path: 'blueprint/context.yaml',
          name: 'ArchLens',
          level: 'context',
          entityRef: 'blueprint',
          nodeEntityRefs: [],
        },
      ],
    });

    render(<Breadcrumbs />);

    fireEvent.click(screen.getByTitle('Other Context systems'));

    expect(screen.getByText('Other Context Levels')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Backstage' })).toHaveAttribute(
      'href',
      '/workspace/backstage'
    );
    expect(screen.getByRole('link', { name: 'ArchLens' })).toHaveAttribute(
      'href',
      '/workspace/blueprint'
    );
  });

  it('keeps peer context switching available on stress context diagrams', () => {
    const adviceSchema = {
      name: 'AdviceLens Stress Tests',
      version: '1.0.0',
      level: 'context' as const,
      entityRef: 'advicelens-stress',
      nodes: [
        {
          entityRef: 'advicelens-stress/scenarios',
          type: 'group' as const,
          name: 'AdviceLens Stress Tests',
        },
      ],
      dependencies: [],
    };

    useBlueprintStore.setState({
      isWorkspaceOpen: true,
      isSampleWorkspace: true,
      workspaceName: 'samples',
      currentFilePath: 'advicelens-stress/context.yaml',
      schema: adviceSchema,
      loadedSystems: [
        {
          path: 'advicelens-stress/context.yaml',
          name: 'AdviceLens Stress Tests',
          schema: adviceSchema,
        },
      ],
      workspaceCatalog: [
        {
          path: 'golden-journey/context.yaml',
          name: 'Samples',
          level: 'context',
          entityRef: 'samples',
          nodeEntityRefs: [],
        },
        {
          path: 'advicelens-stress/context.yaml',
          name: 'AdviceLens Stress Tests',
          level: 'context',
          entityRef: 'advicelens-stress',
          nodeEntityRefs: ['advicelens-stress/scenarios'],
        },
        {
          path: 'advicelens-stress/containers.yaml',
          name: 'AdviceLens Stress Tests',
          level: 'container',
          entityRef: 'advicelens-stress/scenarios',
          nodeEntityRefs: [],
          parentEntityRef: 'advicelens-stress',
        },
        {
          path: 'chaoslens-stress/context.yaml',
          name: 'ChaosLens Stress Tests',
          level: 'context',
          entityRef: 'chaoslens-stress',
          nodeEntityRefs: [],
        },
      ],
    });

    render(<Breadcrumbs />);

    fireEvent.click(screen.getByTitle('Other Context systems'));

    expect(screen.getByRole('link', { name: 'Samples' })).toHaveAttribute(
      'href',
      '/workspace/samples'
    );
    expect(screen.getByRole('link', { name: 'ChaosLens Stress Tests' })).toHaveAttribute(
      'href',
      '/workspace/chaoslens-stress'
    );
  });
});
