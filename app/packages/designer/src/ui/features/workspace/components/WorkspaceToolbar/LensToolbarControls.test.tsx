import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { LensToolbarControls } from './LensToolbarControls';
import { useBlueprintStore } from '../../../../../application/store/store';

describe('LensToolbarControls', () => {
  beforeEach(() => {
    useBlueprintStore.setState({
      isResilienceMode: false,
      selectedNodeId: 'shop/payment',
      showCoupling: false,
      notification: null,
    });
  });

  it('toggles resilience mode from the lenses group', () => {
    render(<LensToolbarControls />);
    fireEvent.click(screen.getByTestId('toolbar-resilience-lens'));
    expect(useBlueprintStore.getState().isResilienceMode).toBe(true);
    expect(screen.getByTestId('toolbar-resilience-simulate')).toBeInTheDocument();
  });

  it('shows guidance when coupling data is missing', () => {
    render(<LensToolbarControls />);
    fireEvent.click(screen.getByTestId('toolbar-coupling-lens'));
    expect(useBlueprintStore.getState().showCoupling).toBe(false);
    expect(useBlueprintStore.getState().notification?.title).toBe('Coupling lens');
  });

  it('toggles coupling lens when coupling data exists', () => {
    const { initSchema } = useBlueprintStore.getState();
    initSchema({
      name: 'Coupling',
      version: '1.0.0',
      level: 'code',
      nodes: [
        {
          entityRef: 'a',
          type: 'component',
          name: 'A',
          position: { x: 0, y: 0 },
          properties: { filepath: 'src/a.ts' },
          forensics: {
            coupledFiles: [{ path: 'src/b.ts', score: 0.8, sharedCommits: 3 }],
          },
        },
      ],
      dependencies: [],
    });

    render(<LensToolbarControls />);
    fireEvent.click(screen.getByTestId('toolbar-coupling-lens'));
    expect(useBlueprintStore.getState().showCoupling).toBe(true);
  });
});
