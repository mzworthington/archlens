import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, beforeEach } from 'vitest';
import { PropertyPanel } from './PropertyPanel';
import { useBlueprintStore } from '../../../../../application/store/store';

describe('PropertyPanel resilience tabs', () => {
  beforeEach(() => {
    useBlueprintStore.setState({
      selectedNodeId: 'gateway-api',
      rightCollapsed: false,
      isResilienceMode: true,
      resiliencePanelTab: 'simulation',
      currentFilePath: 'blueprint.yaml',
      workspaceName: undefined,
      loadedSystems: [],
    });

    const { initSchema } = useBlueprintStore.getState();
    initSchema({
      name: 'Test',
      version: '1.0.0',
      level: 'container',
      nodes: [
        {
          entityRef: 'gateway-api',
          type: 'rest-api',
          name: 'Gateway API',
          position: { x: 0, y: 0 },
        },
      ],
      dependencies: [],
    });
  });

  it('shows simulation tab by default and switches to properties', () => {
    render(<PropertyPanel />);

    expect(screen.getByTestId('resilience-section')).toBeInTheDocument();
    expect(screen.queryByLabelText('Name')).not.toBeInTheDocument();

    fireEvent.click(screen.getByTestId('resilience-tab-properties'));

    expect(screen.queryByTestId('resilience-section')).not.toBeInTheDocument();
    expect(screen.getByLabelText('Name')).toBeInTheDocument();
  });
});
