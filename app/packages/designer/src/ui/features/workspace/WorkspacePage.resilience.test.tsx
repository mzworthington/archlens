import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, act, waitFor } from '@testing-library/react';
import { Router } from 'wouter';
import { memoryLocation } from 'wouter/memory-location';
import { WorkspacePage } from './WorkspacePage';
import { useBlueprintStore } from '../../../application/store/store';

vi.mock('./components/Canvas/Canvas', () => ({
  Canvas: () => <div data-testid="canvas-mock">Canvas Mock</div>,
}));

vi.mock('@xyflow/react', () => ({
  ReactFlowProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  useReactFlow: () => ({
    getNode: vi.fn(),
    setCenter: vi.fn(),
    fitView: vi.fn(),
  }),
}));

describe('WorkspacePage resilience mode', () => {
  beforeEach(() => {
    useBlueprintStore.setState({
      isStartupOpen: false,
      leftCollapsed: true,
      rightCollapsed: false,
      isResilienceMode: false,
      selectedNodeId: 'shop/payment',
      schema: {
        name: 'Shop',
        version: '1.0.0',
        level: 'container',
        nodes: [
          { entityRef: 'shop/web', name: 'Web', type: 'web-app' },
          { entityRef: 'shop/payment', name: 'Payment', type: 'microservice' },
        ],
        dependencies: [{ from: 'shop/web', to: 'shop/payment', type: 'direct-call' }],
      },
      loadedSystems: [
        {
          path: 'shop.yaml',
          name: 'Shop',
          schema: {
            name: 'Shop',
            version: '1.0.0',
            level: 'container',
            nodes: [
              { entityRef: 'shop/web', name: 'Web', type: 'web-app' },
              { entityRef: 'shop/payment', name: 'Payment', type: 'microservice' },
            ],
            dependencies: [{ from: 'shop/web', to: 'shop/payment', type: 'direct-call' }],
          },
        },
      ],
    });
  });

  it('shows resilience controls in the property panel when mode is enabled', () => {
    const { hook } = memoryLocation({ path: '/workspace' });
    render(
      <Router hook={hook}>
        <WorkspacePage />
      </Router>
    );

    act(() => {
      useBlueprintStore.getState().setResilienceMode(true);
    });
    expect(useBlueprintStore.getState().isResilienceMode).toBe(true);
    expect(screen.getByText('CHAOSLENS')).toBeInTheDocument();
    expect(screen.getByTestId('resilience-section')).toBeInTheDocument();
    expect(screen.getByTestId('monte-carlo-controls')).toBeInTheDocument();
  });

  it('runs simulation against the active diagram and shows SLA telemetry', async () => {
    const { hook } = memoryLocation({ path: '/workspace' });
    render(
      <Router hook={hook}>
        <WorkspacePage />
      </Router>
    );

    act(() => {
      useBlueprintStore.getState().setResilienceMode(true);
      useBlueprintStore.getState().runResilienceSimulation();
    });

    await waitFor(() => {
      expect(useBlueprintStore.getState().resilienceSimulationResult).not.toBeNull();
    });
    expect(screen.getByTestId('overall-sla')).toBeInTheDocument();
  });
});
