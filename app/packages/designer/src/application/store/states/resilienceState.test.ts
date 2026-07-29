import { describe, expect, it, beforeEach, vi, afterEach } from 'vitest';
import { useBlueprintStore } from '../store';
import { DEFAULT_RESILIENCE_MONTE_CARLO } from './resilienceState';

function mockDesktopViewport(matches: boolean) {
  vi.stubGlobal('matchMedia', (query: string) => ({
    matches: query.includes('min-width: 640px') ? matches : false,
    media: query,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    addListener: vi.fn(),
    removeListener: vi.fn(),
    dispatchEvent: vi.fn(),
  }));
}

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

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('expands the property panel when entering resilience mode on desktop', () => {
    mockDesktopViewport(true);
    useBlueprintStore.setState({ rightCollapsed: true });

    useBlueprintStore.getState().setResilienceMode(true);

    expect(useBlueprintStore.getState().rightCollapsed).toBe(false);
    expect(useBlueprintStore.getState().resiliencePanelTab).toBe('simulation');
  });

  it('keeps the property panel collapsed when entering resilience mode on mobile', () => {
    mockDesktopViewport(false);
    useBlueprintStore.setState({ rightCollapsed: true });

    useBlueprintStore.getState().setResilienceMode(true);

    expect(useBlueprintStore.getState().rightCollapsed).toBe(true);
    expect(useBlueprintStore.getState().isResilienceMode).toBe(true);
    expect(useBlueprintStore.getState().resiliencePanelTab).toBe('simulation');
  });

  it('keeps the property panel collapsed when a simulation completes on mobile', async () => {
    mockDesktopViewport(false);
    useBlueprintStore.setState({ rightCollapsed: true });

    useBlueprintStore.getState().setResilienceMode(true);
    useBlueprintStore.getState().runResilienceSimulation();

    await vi.waitFor(() => {
      expect(useBlueprintStore.getState().resilienceSimulationResult).not.toBeNull();
    });

    expect(useBlueprintStore.getState().rightCollapsed).toBe(true);
  });

  it('does not expand the property panel when a simulation completes on desktop', async () => {
    mockDesktopViewport(true);
    useBlueprintStore.getState().setResilienceMode(true);
    useBlueprintStore.setState({ rightCollapsed: true });

    useBlueprintStore.getState().runResilienceSimulation();

    await vi.waitFor(() => {
      expect(useBlueprintStore.getState().resilienceSimulationResult).not.toBeNull();
    });

    expect(useBlueprintStore.getState().rightCollapsed).toBe(true);
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

  it('resets telemetry view when leaving resilience mode', () => {
    useBlueprintStore.getState().setResilienceTelemetryView('executive');
    useBlueprintStore.getState().toggleResilienceMode();
    useBlueprintStore.getState().toggleResilienceMode();

    expect(useBlueprintStore.getState().resilienceTelemetryView).toBe('sre');
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

  it('persists safeguard toggles to node properties for schema explorer and draft diff', () => {
    const { initSchema } = useBlueprintStore.getState();
    initSchema({
      name: 'Shop',
      version: '1.0.0',
      level: 'container',
      nodes: [
        { entityRef: 'shop/web', name: 'Web', type: 'web-app' },
        { entityRef: 'shop/payment', name: 'Payment', type: 'microservice' },
      ],
      dependencies: [{ from: 'shop/web', to: 'shop/payment', type: 'direct-call' }],
    });

    useBlueprintStore.getState().setResilienceMode(true);
    useBlueprintStore.getState().setResilienceSafeguard('shop/payment', 'circuitBreaker', true);

    const payment = useBlueprintStore
      .getState()
      .schema.nodes.find(node => node.entityRef === 'shop/payment');

    expect(payment?.resilience).toEqual({ circuitBreaker: true });
    expect(useBlueprintStore.getState().yamlCode).toContain('resilience:');
    expect(useBlueprintStore.getState().yamlCode).toContain('circuitBreaker: true');
  });
});
