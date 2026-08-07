import { describe, expect, it, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { EmptyDiagramOverlay } from './EmptyDiagramOverlay';
import { useBlueprintStore } from '../../../../../application/store/store';

describe('EmptyDiagramOverlay', () => {
  beforeEach(() => {
    useBlueprintStore.setState({
      isLoading: false,
      nodes: [],
      schema: {
        name: 'Plugins Infrastructure',
        version: '1.0.0',
        level: 'container',
        nodes: [],
        dependencies: [],
      },
      currentFilePath: 'plugins/containers.yaml',
    });
  });

  it('shows when a named diagram has zero nodes', () => {
    render(<EmptyDiagramOverlay />);
    expect(screen.getByTestId('empty-diagram-overlay')).toBeInTheDocument();
    expect(screen.getByText('No nodes in this diagram')).toBeInTheDocument();
    expect(screen.getByText(/Plugins Infrastructure/)).toBeInTheDocument();
  });

  it('hides while loading', () => {
    useBlueprintStore.setState({ isLoading: 'Loading diagram...' });
    render(<EmptyDiagramOverlay />);
    expect(screen.queryByTestId('empty-diagram-overlay')).not.toBeInTheDocument();
  });

  it('hides when nodes are present', () => {
    useBlueprintStore.setState({
      nodes: [
        {
          id: 'a',
          position: { x: 0, y: 0 },
          data: { id: 'a', type: 'container', name: 'A', properties: {} },
        },
      ],
    });
    render(<EmptyDiagramOverlay />);
    expect(screen.queryByTestId('empty-diagram-overlay')).not.toBeInTheDocument();
  });

  it('hides for the intentional empty workspace starter', () => {
    useBlueprintStore.setState({
      schema: {
        name: 'Empty Workspace',
        version: '1.0.0',
        level: 'container',
        nodes: [],
        dependencies: [],
      },
      currentFilePath: 'blueprint.yaml',
    });
    render(<EmptyDiagramOverlay />);
    expect(screen.queryByTestId('empty-diagram-overlay')).not.toBeInTheDocument();
  });
});
