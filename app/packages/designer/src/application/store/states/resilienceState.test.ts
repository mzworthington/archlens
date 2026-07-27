import { describe, expect, it, beforeEach, vi } from 'vitest';
import { useBlueprintStore } from '../store';
import { DEFAULT_RESILIENCE_MONTE_CARLO } from './resilienceState';

describe('resilienceState', () => {
  beforeEach(() => {
    useBlueprintStore.setState({
      isResilienceMode: false,
      resilienceSimulationResult: null,
      resilienceSafeguards: {},
      resilienceMonteCarlo: { ...DEFAULT_RESILIENCE_MONTE_CARLO },
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

  it('stores Monte Carlo settings for the next simulation run', () => {
    useBlueprintStore.getState().setResilienceMonteCarlo({
      iterations: 2000,
      seed: 7,
      severityJitter: 0.2,
    });

    expect(useBlueprintStore.getState().resilienceMonteCarlo).toEqual({
      iterations: 2000,
      seed: 7,
      severityJitter: 0.2,
    });
  });

  it('clamps Monte Carlo values to supported ranges', () => {
    useBlueprintStore.getState().setResilienceMonteCarlo({
      iterations: 50,
      seed: 0,
      severityJitter: 0.9,
    });

    expect(useBlueprintStore.getState().resilienceMonteCarlo).toEqual({
      iterations: 200,
      seed: 1,
      severityJitter: 0.3,
    });
  });

  it('defaults Monte Carlo config to engine-aligned values', () => {
    expect(useBlueprintStore.getState().resilienceMonteCarlo).toEqual(
      DEFAULT_RESILIENCE_MONTE_CARLO
    );
  });
});
