import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { LensToolbarControls } from './LensToolbarControls';
import { useBlueprintStore } from '../../../../../application/store/store';

describe('LensToolbarControls', () => {
  beforeEach(() => {
    useBlueprintStore.setState({
      isResilienceMode: false,
      isTraceLensMode: false,
      isTraceLensPanelOpen: false,
      selectedNodeId: 'shop/payment',
      showCoupling: false,
      notification: null,
      leftCollapsed: true,
    });
  });

  it('does not render a TraceLens toolbar toggle', () => {
    render(<LensToolbarControls />);
    expect(screen.queryByTestId('toolbar-tracelens-lens')).not.toBeInTheDocument();
  });

  it('does not render coupling lens in the toolbar', () => {
    render(<LensToolbarControls />);
    expect(screen.queryByTestId('toolbar-coupling-lens')).not.toBeInTheDocument();
  });

  it('toggles resilience mode from the lenses group', () => {
    render(<LensToolbarControls />);
    fireEvent.click(screen.getByTestId('toolbar-resilience-lens'));
    expect(useBlueprintStore.getState().isResilienceMode).toBe(true);
    expect(screen.getByTestId('toolbar-resilience-simulate')).toBeInTheDocument();
  });

  it('shows guidance when resilience is unavailable on component diagrams', () => {
    const { initSchema } = useBlueprintStore.getState();
    initSchema({
      name: 'Components',
      version: '1.0.0',
      level: 'component',
      entityRef: 'shop/api',
      nodes: [{ entityRef: 'shop/api/handlers', type: 'component', name: 'Handlers' }],
      dependencies: [],
    });

    render(<LensToolbarControls />);
    fireEvent.click(screen.getByTestId('toolbar-resilience-lens'));
    expect(useBlueprintStore.getState().isResilienceMode).toBe(false);
    expect(useBlueprintStore.getState().notification?.title).toBe('Resilience lens');
  });
});
