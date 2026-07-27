import { describe, expect, it, beforeEach, vi } from 'vitest';
import { useBlueprintStore } from '../store';

describe('resilienceState', () => {
  beforeEach(() => {
    useBlueprintStore.setState({
      isResilienceMode: false,
      resilienceSimulationResult: null,
      resilienceSafeguards: {},
      selectedNodeId: 'shop/payment',
      schema: {
        name: 'Shop',
        apiVersion: 'blueprint.dev/v4', kind: 'Diagram',
        level: 'container',
        nodes: [
          { entityRef: 'shop/web', name: 'Web', type: 'web-app' },
          { entityRef: 'shop/payment', name: 'Payment', type: 'microservice' },
        ],
        dependencies: [{ from: 'shop/web', to: 'shop/payment', type: 'direct-call' }],
      },
    });
  });

  it('runs simulation against the active workspace schema', async () => {
    useBlueprintStore.getState().setResilienceMode(true);
    useBlueprintStore.getState().runResilienceSimulation();

    await vi.waitFor(() => {
      expect(useBlueprintStore.getState().resilienceSimulationResult).not.toBeNull();
    });

    const { resilienceSimulationResult } = useBlueprintStore.getState();
    expect(resilienceSimulationResult!.overallSla).toBeLessThan(100);
  });

  it('clears simulation when leaving resilience mode', () => {
    useBlueprintStore.getState().toggleResilienceMode();
    useBlueprintStore.getState().runResilienceSimulation();
    useBlueprintStore.getState().toggleResilienceMode();

    expect(useBlueprintStore.getState().resilienceSimulationResult).toBeNull();
  });
});
