import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, beforeEach } from 'vitest';
import { PropertyPanel } from './PropertyPanel';
import { useBlueprintStore } from '../../../../../application/store/store';

describe('PropertyPanel UI Component', () => {
  beforeEach(() => {
    useBlueprintStore.setState({
      selectedNodeId: null,
      currentFilePath: 'blueprint.yaml',
      workspaceName: undefined,
      loadedSystems: [],
      rightPanelTab: 'properties',
    });

    const { initSchema } = useBlueprintStore.getState();
    initSchema({
      name: 'Cloud Infrastructure Workspace',
      version: '1.0.0',
      level: 'container',
      nodes: [
        {
          entityRef: 'gateway-api',
          type: 'rest-api',
          name: 'Gateway API',
          position: { x: 0, y: 0 },
        },
        {
          entityRef: 'session-store',
          type: 'cache-store',
          name: 'Session Cache',
          position: { x: 10, y: 10 },
        },
      ],
      dependencies: [],
    });
  });

  it('should render External Dependencies section when no node is selected and workspace is loaded', () => {
    useBlueprintStore.setState({
      loadedSystems: [
        {
          path: 'containers.yaml',
          name: 'Containers',
          schema: {
            name: 'Containers',
            version: '1.0.0',
            level: 'container',
            nodes: [],
            dependencies: [],
          },
        },
      ],
      listWorkspaceExternalCandidates: () => [],
    });

    render(<PropertyPanel />);
    expect(screen.getByText('External Dependencies')).toBeInTheDocument();
    expect(screen.getByLabelText('Search external dependencies')).toBeInTheDocument();
  });

  it('should render Workspace config when no node is selected, and Catalog when tab is clicked', () => {
    render(<PropertyPanel />);

    expect(screen.getByText(/Properties Panel/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Name/i)).toBeInTheDocument();

    fireEvent.click(screen.getByTestId('right-tab-catalog'));
    expect(screen.getByText('Component Catalog')).toBeInTheDocument();
    expect(screen.getByText('REST API')).toBeInTheDocument();
    expect(screen.getByText('Event Broker')).toBeInTheDocument();
  });

  it('shows Catalog when the stored right panel tab is catalog', () => {
    useBlueprintStore.setState({ rightPanelTab: 'catalog' });
    render(<PropertyPanel />);

    expect(screen.getByText('Component Catalog')).toBeInTheDocument();
    expect(screen.getByTestId('right-tab-catalog')).toHaveAttribute('aria-selected', 'true');
  });

  it('should render Diagram C4 Level selector and trigger updateSchemaLevel on change', () => {
    render(<PropertyPanel />);

    const select = screen.getByLabelText(/C4 Level/i);
    expect(select).toBeInTheDocument();
    expect(select).toHaveValue('container');

    fireEvent.change(select, { target: { value: 'context' } });
    expect(useBlueprintStore.getState().schema.level).toBe('context');
  });

  it('should render read-only Diagram entityRef from workspaceName or schema.name', () => {
    useBlueprintStore.setState({ workspaceName: 'Awesome Cloud Workspace' });
    render(<PropertyPanel />);

    expect(screen.getByText('Entity Reference')).toBeInTheDocument();
    const slugInput = screen.getByLabelText(/Entity Reference/i);
    expect(slugInput).toBeInTheDocument();
    expect(slugInput).toHaveAttribute('readonly');
    expect(slugInput).toHaveValue('awesome-cloud-workspace');
  });

  it('should trigger node creation when catalog component is clicked in Catalog tab', () => {
    render(<PropertyPanel />);

    expect(useBlueprintStore.getState().nodes).toHaveLength(2);

    fireEvent.click(screen.getByTestId('right-tab-catalog'));
    fireEvent.click(screen.getByText('REST API'));

    expect(useBlueprintStore.getState().nodes).toHaveLength(3);
  });

  it('should trigger group node creation when Group / Boundary component is clicked in Catalog tab', () => {
    render(<PropertyPanel />);

    expect(useBlueprintStore.getState().nodes).toHaveLength(2);

    fireEvent.click(screen.getByTestId('right-tab-catalog'));
    fireEvent.click(screen.getByText('Group / Boundary'));

    const nodes = useBlueprintStore.getState().nodes;
    expect(nodes).toHaveLength(3);
    const groupNode = nodes.find(n => n.data.type === 'group');
    expect(groupNode).toBeDefined();
  });

  it('should display node attributes editor when a node is selected', () => {
    useBlueprintStore.setState({ selectedNodeId: 'gateway-api' });

    render(<PropertyPanel />);

    expect(screen.getByLabelText(/Name/i)).toBeInTheDocument();
    expect(screen.getByDisplayValue('Gateway API')).toBeInTheDocument();
  });

  it('should rename node and metadata attributes when edited in node details', () => {
    useBlueprintStore.setState({ selectedNodeId: 'gateway-api' });

    render(<PropertyPanel />);

    const nameInput = screen.getByLabelText(/Name/i);
    fireEvent.change(nameInput, { target: { value: 'API Gateway Proxy' } });

    const updatedNode = useBlueprintStore
      .getState()
      .schema.nodes.find(n => n.entityRef === 'cloud-infrastructure-workspace/api-gateway-proxy');
    expect(updatedNode?.name).toBe('API Gateway Proxy');
    expect(updatedNode?.entityRef).toBe('cloud-infrastructure-workspace/api-gateway-proxy');

    const entityRefInput = screen.getByLabelText(/Entity Reference/i);
    expect(entityRefInput).toHaveValue('cloud-infrastructure-workspace/api-gateway-proxy');
  });

  it('should allow adding custom metadata attributes to the component', () => {
    useBlueprintStore.setState({ selectedNodeId: 'gateway-api' });

    render(<PropertyPanel />);

    const keyInput = screen.getByPlaceholderText(/Key \(e.g. port\)/i);
    const valueInput = screen.getByPlaceholderText(/Value/i);
    const addButton = screen.getByRole('button', { name: /Add attribute/i });

    fireEvent.change(keyInput, { target: { value: 'port' } });
    fireEvent.change(valueInput, { target: { value: '443' } });
    fireEvent.click(addButton);

    const updatedNode = useBlueprintStore
      .getState()
      .schema.nodes.find(n => n.entityRef === 'cloud-infrastructure-workspace/gateway-api');
    expect(updatedNode?.properties?.port).toBe('443');
  });

  it('should allow editing active connection descriptions', () => {
    const { onConnect } = useBlueprintStore.getState();
    onConnect({
      source: 'gateway-api',
      target: 'session-store',
      sourceHandle: 'right-source',
      targetHandle: 'left-target',
    });

    useBlueprintStore.setState({ selectedNodeId: 'gateway-api' });

    render(<PropertyPanel />);

    const descInput = screen.getByPlaceholderText(/Add description/i);
    expect(descInput).toBeInTheDocument();
    expect(descInput).toHaveValue('');

    fireEvent.change(descInput, { target: { value: 'JSON over HTTPS' } });

    const edge = useBlueprintStore.getState().edges[0];
    expect(edge.data?.description).toBe('JSON over HTTPS');
  });

  it('shows child level externals when selected node has a child diagram with externals', () => {
    useBlueprintStore.setState({
      selectedNodeId: 'gateway-api',
      workspaceCatalog: [
        {
          path: 'containers.yaml',
          name: 'Gateway Containers',
          level: 'container',
          entityRef: 'cloud-infrastructure-workspace/gateway-api',
          nodeEntityRefs: ['cloud-infrastructure-workspace/gateway-api/legacy'],
        },
      ],
      loadedSystems: [
        {
          path: 'containers.yaml',
          name: 'Gateway Containers',
          schema: {
            name: 'Gateway Containers',
            version: '1.0.0',
            level: 'container',
            entityRef: 'cloud-infrastructure-workspace/gateway-api',
            nodes: [
              {
                entityRef: 'cloud-infrastructure-workspace/gateway-api/legacy',
                type: 'microservice',
                name: 'Legacy API',
                external: true,
              },
            ],
            dependencies: [],
          },
        },
      ],
    });

    render(<PropertyPanel />);

    expect(screen.getByTestId('child-level-externals-section')).toBeInTheDocument();
    expect(screen.getByTestId('open-child-externals-dialog')).toBeInTheDocument();
    expect(screen.getByText(/Externals \(1\)/)).toBeInTheDocument();
  });
});
