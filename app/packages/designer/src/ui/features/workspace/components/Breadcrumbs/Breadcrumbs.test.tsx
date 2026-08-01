import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, beforeEach } from 'vitest';
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

  it('renders demo sandbox label when bundled workspace is loaded', () => {
    useBlueprintStore.setState({
      loadedSystems: [
        {
          path: 'application/context.yaml',
          name: 'Application',
          schema: {
            name: 'Application',
            version: '1.0.0',
            level: 'context',
            entityRef: 'application',
            nodes: [],
            dependencies: [],
          },
        },
        {
          path: 'infrastructure/context.yaml',
          name: 'Infrastructure Examples',
          schema: {
            name: 'Infrastructure Examples',
            version: '1.0.0',
            level: 'context',
            entityRef: 'infrastructure',
            nodes: [],
            dependencies: [],
          },
        },
      ],
      isWorkspaceOpen: false,
      currentFilePath: 'application/context.yaml',
    });

    const { initSchema } = useBlueprintStore.getState();
    initSchema({
      name: 'Application',
      version: '1.0.0',
      level: 'context',
      entityRef: 'blueprint',
      nodes: [],
      dependencies: [],
    });

    render(<Breadcrumbs />);

    expect(screen.getByText('Sandboxes')).toBeInTheDocument();
    expect(screen.getByText('Application')).toBeInTheDocument();
  });

  it('renders demo sandbox label when no workspace folder is open', () => {
    useBlueprintStore.setState({
      activeSandboxContextPath: 'application/context.yaml',
    });

    render(<Breadcrumbs />);

    expect(screen.getByText('Sandboxes')).toBeInTheDocument();
    expect(screen.getByTestId('workspace-storage-badge')).toHaveTextContent('Demo (not on disk)');
    expect(screen.getByText('Main App System')).toBeInTheDocument();
  });

  it('renders specific workspace name when workspace directory is loaded', () => {
    useBlueprintStore.setState({
      isWorkspaceOpen: true,
      workspaceName: 'DevPortalRepo',
    });

    render(<Breadcrumbs />);

    expect(screen.getByText('DevPortalRepo')).toBeInTheDocument();
  });

  it('renders active diagram breadcrumbs and ancestor system breadcrumbs', () => {
    const contextSchema = {
      name: 'Enterprise System Context',
      version: '1.0.0',
      level: 'context' as const,
      entityRef: 'enterprise',
      nodes: [
        {
          entityRef: 'enterprise/main-app',
          type: 'software-system' as const,
          name: 'Main App System',
        },
      ],
      dependencies: [],
    };
    const containerSchema = {
      name: 'Main App System',
      version: '1.0.0',
      level: 'container' as const,
      entityRef: 'enterprise/main-app',
      nodes: [],
      dependencies: [],
    };

    useBlueprintStore.setState({
      loadedSystems: [
        {
          path: 'context.yaml',
          name: 'Enterprise System Context',
          schema: contextSchema,
        },
        {
          path: 'services/auth/container.yaml',
          name: 'Main App System',
          schema: containerSchema,
        },
      ],
      currentFilePath: 'services/auth/container.yaml',
      schema: containerSchema,
    });

    render(<Breadcrumbs />);

    expect(screen.getByText('Enterprise System Context')).toBeInTheDocument();
    expect(screen.getByText('Main App System')).toBeInTheDocument();
  });

  it('renders correct href links for ancestor breadcrumbs', async () => {
    const rootSchema = {
      name: 'Root Map',
      version: '1.0.0',
      level: 'context' as const,
      entityRef: 'enterprise',
      nodes: [
        {
          type: 'software-system' as const,
          name: 'Child System',
          entityRef: 'enterprise/child-system',
        },
      ],
      dependencies: [],
    };
    const childSchema = {
      name: 'Child System',
      version: '1.0.0',
      level: 'container' as const,
      entityRef: 'enterprise/child-system',
      nodes: [],
      dependencies: [],
    };

    useBlueprintStore.setState({
      isWorkspaceOpen: true,
      workspaceName: 'enterprise',
      loadedSystems: [
        {
          path: 'context.yaml',
          name: 'Root Map',
          schema: rootSchema,
        },
        {
          path: 'child.yaml',
          name: 'Child System',
          schema: childSchema,
        },
      ],
      currentFilePath: 'child.yaml',
      schema: childSchema,
    });

    render(<Breadcrumbs />);

    const rootLink = screen.getByText('Root Map').closest('a');
    expect(rootLink).toHaveAttribute('href', '/workspace/enterprise');
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

    // Check if dropdown trigger button is present
    const dropdownBtn = screen.getByTitle('Explore child components');
    expect(dropdownBtn).toBeInTheDocument();

    // Click trigger to open menu
    fireEvent.click(dropdownBtn);

    // Verify Jump to Component header and child item exists
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
      activeSandboxContextPath: 'application/context.yaml',
    });

    render(<Breadcrumbs />);

    const contextLink = screen.getAllByText('Application').find(el => el.closest('a'));
    expect(contextLink?.closest('a')).toHaveAttribute('href', '/workspace/application');
    expect(screen.getAllByText('Application').length).toBeGreaterThan(0);
    expect(screen.getByText('Packages System')).toBeInTheDocument();
    expect(screen.getByText('Core Service Components')).toBeInTheDocument();
  });

  it('renders zoom preview segment for container level zoom from context level', () => {
    useBlueprintStore.setState({
      selectedNodeId: 'application/cli',
    });

    const { initSchema } = useBlueprintStore.getState();
    initSchema({
      entityRef: 'blueprint',
      name: 'Context Diagram',
      version: '1.0.0',
      level: 'context',
      nodes: [
        {
          entityRef: 'application/cli',
          type: 'software-system',
          name: 'Cli System',
        },
      ],
      dependencies: [],
    });

    useBlueprintStore.setState({
      isWorkspaceOpen: true,
      workspaceName: 'TestWorkspace',
      currentFilePath: 'blueprints/context.yaml',
      loadedSystems: [
        {
          path: 'blueprints/context.yaml',
          name: 'Context Diagram',
          schema: {
            entityRef: 'application',
            name: 'Context Diagram',
            version: '1.0.0',
            level: 'context',
            nodes: [
              {
                entityRef: 'application/cli',
                type: 'software-system',
                name: 'Cli System',
              },
            ],
            dependencies: [],
          },
        },
        {
          path: 'blueprints/containers.yaml',
          name: 'Cli System',
          schema: {
            name: 'Cli System',
            version: '1.0.0',
            level: 'container',
            entityRef: 'application/cli',
            nodes: [],
            dependencies: [],
          },
        },
      ],
    });

    render(<Breadcrumbs />);

    expect(screen.getByText('Context Diagram')).toBeInTheDocument();
    expect(screen.getByText('Cli System')).toBeInTheDocument();
  });
});
