import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { PropertyPanel } from './PropertyPanel';
import { LeftWorkspacePanel } from '../../layout/LeftWorkspacePanel';
import { useBlueprintStore } from '../../../../../application/store/store';

vi.mock('wouter', () => ({
  useLocation: () => ['/workspace', vi.fn()],
}));

describe('PropertyPanel resilience tabs', () => {
  beforeEach(() => {
    useBlueprintStore.setState({
      activeLeftPanel: 'chaosLens',
      selectedNodeId: 'gateway-api',
      rightCollapsed: false,
      leftCollapsed: false,
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
    render(
      <>
        <LeftWorkspacePanel />
        <PropertyPanel />
      </>
    );

    expect(screen.getByTestId('resilience-section')).toBeInTheDocument();
    expect(screen.getByLabelText('Name')).toBeInTheDocument();

    fireEvent.click(screen.getByTestId('left-tab-schema'));

    expect(screen.queryByTestId('resilience-section')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: /^yaml$/i })).toBeInTheDocument();
  });
});
