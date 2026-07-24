import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Searchbar } from './Searchbar';
import { useBlueprintStore } from '../../../../../application/store/store';
import type { SystemSchema } from '@blueprint/core';

const mockGetNode = vi.fn().mockReturnValue({
  id: 'node-1',
  position: { x: 100, y: 200 },
  measured: { width: 100, height: 50 },
});
const mockSetCenter = vi.fn();
const mockSetLocation = vi.fn();

vi.mock('wouter', () => ({
  useLocation: () => ['/workspace/search-test-app', mockSetLocation],
}));

vi.mock('@xyflow/react', () => {
  return {
    useReactFlow: () => ({
      getNode: mockGetNode,
      setCenter: mockSetCenter,
      fitView: vi.fn(),
    }),
  };
});

const currentSchema: SystemSchema = {
  name: 'Search Test App',
  version: '1.0.0',
  level: 'container',
  entityRef: 'search-test-app',
  nodes: [
    { entityRef: 'node-1', name: 'Auth Controller', type: 'microservice' },
    { entityRef: 'node-2', name: 'Database Instance', type: 'database' },
    { entityRef: 'node-3', name: 'Test Gateway', type: 'gateway-api', isTest: true },
  ],
  dependencies: [],
};

const otherSchema: SystemSchema = {
  name: 'Other Diagram',
  version: '1.0.0',
  level: 'component',
  entityRef: 'search-test-app/other',
  nodes: [
    {
      entityRef: 'search-test-app/other-node-1',
      name: 'Auth Remote Service',
      type: 'microservice',
    },
    {
      entityRef: 'search-test-app/other-node-2',
      name: 'Queue Worker',
      type: 'background-worker',
    },
  ],
  dependencies: [],
};

function buildCatalog() {
  return [
    {
      path: 'current.yaml',
      name: currentSchema.name,
      level: currentSchema.level,
      entityRef: 'search-test-app',
      nodeEntityRefs: [
        'search-test-app/node-1',
        'search-test-app/node-2',
        'search-test-app/node-3',
      ],
    },
    {
      path: 'other.yaml',
      name: otherSchema.name,
      level: otherSchema.level,
      entityRef: 'search-test-app/other',
      nodeEntityRefs: ['search-test-app/other-node-1', 'search-test-app/other-node-2'],
      parentEntityRef: 'search-test-app',
    },
  ];
}

describe('Searchbar Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    const { initSchema } = useBlueprintStore.getState();
    initSchema(currentSchema);
    const resolvedCurrentSchema = useBlueprintStore.getState().schema;
    useBlueprintStore.setState({
      showTests: false,
      currentFilePath: 'current.yaml',
      loadedSystems: [
        { path: 'current.yaml', name: resolvedCurrentSchema.name, schema: resolvedCurrentSchema },
        { path: 'other.yaml', name: otherSchema.name, schema: otherSchema },
      ],
      workspaceCatalog: buildCatalog(),
    });
  });

  it('renders search input with placeholder', () => {
    render(<Searchbar />);
    expect(screen.getByPlaceholderText('Search nodes...')).toBeInTheDocument();
  });

  it('renders matching results in a body portal above the toolbar', () => {
    render(<Searchbar />);
    const input = screen.getByPlaceholderText('Search nodes...');

    fireEvent.change(input, { target: { value: 'Auth' } });

    const result = screen.getByText('Auth Controller');
    expect(result.closest('[role="listbox"]')).toBe(document.body.lastElementChild);
  });

  it('filters and displays nodes matching search query', () => {
    render(<Searchbar />);
    const input = screen.getByPlaceholderText('Search nodes...');

    fireEvent.change(input, { target: { value: 'Auth' } });

    expect(screen.getByText('Auth Controller')).toBeInTheDocument();
    expect(screen.getByText('Auth Remote Service')).toBeInTheDocument();
    expect(screen.queryByText('Database Instance')).not.toBeInTheDocument();
  });

  it('lists current-diagram matches before other diagrams', () => {
    render(<Searchbar />);
    const input = screen.getByPlaceholderText('Search nodes...');

    fireEvent.change(input, { target: { value: 'Auth' } });

    const options = screen.getAllByRole('option');
    expect(options[0]).toHaveTextContent('Auth Controller');
    expect(options[1]).toHaveTextContent('Auth Remote Service');
    expect(screen.getByText('in Other Diagram')).toBeInTheDocument();
  });

  it('respects showTests filtering state', () => {
    const { rerender } = render(<Searchbar />);
    const input = screen.getByPlaceholderText('Search nodes...');

    fireEvent.change(input, { target: { value: 'Gateway' } });
    expect(screen.queryByText('Test Gateway')).not.toBeInTheDocument();

    useBlueprintStore.setState({ showTests: true });
    rerender(<Searchbar />);

    fireEvent.change(input, { target: { value: 'Gateway' } });
    expect(screen.getByText('Test Gateway')).toBeInTheDocument();
  });

  it('handles clearing search input', () => {
    render(<Searchbar />);
    const input = screen.getByPlaceholderText('Search nodes...');

    fireEvent.change(input, { target: { value: 'Auth' } });
    expect(screen.getByText('Auth Controller')).toBeInTheDocument();

    const clearButton = screen.getByTestId('search-clear-button');
    fireEvent.click(clearButton);

    expect(input).toHaveValue('');
    expect(screen.queryByText('Auth Controller')).not.toBeInTheDocument();
  });

  it('navigates to the selected node when dropdown item is clicked', () => {
    vi.useFakeTimers();
    render(<Searchbar />);

    const input = screen.getByPlaceholderText('Search nodes...');
    fireEvent.change(input, { target: { value: 'Auth' } });

    fireEvent.click(screen.getByText('Auth Controller'));
    vi.runAllTimers();

    expect(mockSetLocation).toHaveBeenCalledWith('/workspace/search-test-app/node-1');
    expect(mockGetNode).toHaveBeenCalledWith('search-test-app/node-1');
    expect(mockSetCenter).toHaveBeenCalledWith(150, 225, { zoom: 1.15, duration: 800 });
    expect(screen.queryByText('Auth Controller')).not.toBeInTheDocument();
    vi.useRealTimers();
  });

  it('navigates to nodes on other diagrams', () => {
    render(<Searchbar />);

    const input = screen.getByPlaceholderText('Search nodes...');
    fireEvent.change(input, { target: { value: 'Queue' } });
    fireEvent.click(screen.getByText('Queue Worker'));

    expect(mockSetLocation).toHaveBeenCalledWith('/workspace/search-test-app/other-node-2');
  });

  it('navigates dropdown using arrow keys and selects with Enter', () => {
    render(<Searchbar />);

    const input = screen.getByPlaceholderText('Search nodes...');
    fireEvent.change(input, { target: { value: 'node' } });

    fireEvent.keyDown(input, { key: 'ArrowDown' });
    fireEvent.keyDown(input, { key: 'Enter' });

    expect(mockSetLocation).toHaveBeenCalledWith('/workspace/search-test-app/node-2');
  });

  it('closes dropdown when Escape key is pressed', () => {
    render(<Searchbar />);
    const input = screen.getByPlaceholderText('Search nodes...');

    fireEvent.change(input, { target: { value: 'Auth' } });
    expect(screen.getByText('Auth Controller')).toBeInTheDocument();

    fireEvent.keyDown(input, { key: 'Escape' });
    expect(screen.queryByText('Auth Controller')).not.toBeInTheDocument();
  });
});
