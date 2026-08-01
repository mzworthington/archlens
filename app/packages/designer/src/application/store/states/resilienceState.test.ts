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
      resilienceFaults: [{ nodeId: 'shop/payment', faultType: 'region-outage', severity: 1 }],
      chaosSpecMetadata: null,
      resilienceFaultType: 'region-outage',
      resilienceSeverity: 1,
      resilienceMonteCarlo: { ...DEFAULT_RESILIENCE_MONTE_CARLO },
      selectedNodeId: 'shop/payment',
      schema: {
        name: 'Shop',
        version: '1.0.0',
        level: 'container',
        entityRef: 'shop',
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

  it('materializes unresolved externals when entering resilience mode', async () => {
    useBlueprintStore.setState({
      loadedSystems: [
        {
          path: 'chaoslens-stress/external-scope-containers.yaml',
          name: 'External Scope',
          schema: {
            name: 'External Scope',
            version: '1.0.0',
            level: 'container',
            entityRef: 'chaoslens-stress/external-scope',
            nodes: [
              {
                entityRef: 'chaoslens-stress/external-scope/web',
                name: 'Web',
                type: 'web-app',
              },
              {
                entityRef: 'chaoslens-stress/external-scope/api',
                name: 'API',
                type: 'rest-api',
              },
            ],
            dependencies: [
              {
                from: 'chaoslens-stress/external-scope/web',
                to: 'chaoslens-stress/external-scope/api',
                type: 'direct-call',
              },
              {
                from: 'chaoslens-stress/external-scope/api',
                to: 'chaoslens-stress/external-auth/auth',
                type: 'direct-call',
              },
            ],
          },
        },
        {
          path: 'chaoslens-stress/external-auth-containers.yaml',
          name: 'External Auth',
          schema: {
            name: 'External Auth',
            version: '1.0.0',
            level: 'container',
            entityRef: 'chaoslens-stress/external-auth',
            nodes: [
              {
                entityRef: 'chaoslens-stress/external-auth/auth',
                name: 'Auth Service',
                type: 'microservice',
              },
            ],
            dependencies: [],
          },
        },
      ],
      schema: {
        name: 'External Scope',
        version: '1.0.0',
        level: 'container',
        entityRef: 'chaoslens-stress/external-scope',
        nodes: [
          {
            entityRef: 'chaoslens-stress/external-scope/web',
            name: 'Web',
            type: 'web-app',
          },
          {
            entityRef: 'chaoslens-stress/external-scope/api',
            name: 'API',
            type: 'rest-api',
          },
        ],
        dependencies: [
          {
            from: 'chaoslens-stress/external-scope/web',
            to: 'chaoslens-stress/external-scope/api',
            type: 'direct-call',
          },
          {
            from: 'chaoslens-stress/external-scope/api',
            to: 'chaoslens-stress/external-auth/auth',
            type: 'direct-call',
          },
        ],
      },
      nodes: [],
      edges: [],
    });

    const { initSchema } = useBlueprintStore.getState();
    initSchema(useBlueprintStore.getState().schema);

    useBlueprintStore.getState().setResilienceMode(true);

    await vi.waitFor(() => {
      expect(
        useBlueprintStore
          .getState()
          .nodes.some(
            node => node.id === 'chaoslens-stress/external-auth/auth' && node.data.external
          )
      ).toBe(true);
    });
  });

  it('materializes connected external neighbors before simulating', async () => {
    useBlueprintStore.setState({
      loadedSystems: [
        {
          path: 'shop.yaml',
          name: 'Shop',
          schema: {
            name: 'Shop',
            version: '1.0.0',
            level: 'container',
            entityRef: 'shop',
            nodes: [
              { entityRef: 'shop/web', name: 'Web', type: 'web-app' },
              { entityRef: 'shop/api', name: 'API', type: 'microservice' },
            ],
            dependencies: [
              { from: 'shop/web', to: 'shop/api', type: 'direct-call' },
              { from: 'shop/api', to: 'shop/auth', type: 'direct-call' },
            ],
          },
        },
        {
          path: 'auth.yaml',
          name: 'Auth',
          schema: {
            name: 'Auth',
            version: '1.0.0',
            level: 'container',
            entityRef: 'shop/auth',
            nodes: [{ entityRef: 'shop/auth', name: 'Auth Service', type: 'microservice' }],
            dependencies: [],
          },
        },
      ],
      schema: {
        name: 'Shop',
        version: '1.0.0',
        level: 'container',
        entityRef: 'shop',
        nodes: [
          { entityRef: 'shop/web', name: 'Web', type: 'web-app' },
          { entityRef: 'shop/api', name: 'API', type: 'microservice' },
        ],
        dependencies: [
          { from: 'shop/web', to: 'shop/api', type: 'direct-call' },
          { from: 'shop/api', to: 'shop/auth', type: 'direct-call' },
        ],
      },
      selectedNodeId: 'shop/auth',
      resilienceFaults: [{ nodeId: 'shop/auth', faultType: 'region-outage', severity: 1 }],
    });

    useBlueprintStore.getState().setResilienceMode(true);
    useBlueprintStore.getState().runResilienceSimulation();

    await vi.waitFor(() => {
      expect(useBlueprintStore.getState().resilienceSimulationResult).not.toBeNull();
    });

    const state = useBlueprintStore.getState();
    expect(state.nodes.some(n => n.id === 'shop/auth' && n.data.external)).toBe(true);
    expect(state.resilienceSimulationScope).toContain('shop/auth');
    expect(state.resilienceSimulationScope).toContain('shop/web');
    expect(state.resilienceSimulationResult!.entryPointSlas['shop/web']).toBeLessThan(100);
  });

  it('expands through an auth proxy into its home diagram when faulting session-db', async () => {
    const storefront = {
      name: 'Storefront',
      version: '1.0.0' as const,
      level: 'container' as const,
      entityRef: 'shop/storefront',
      nodes: [
        { entityRef: 'shop/storefront/web', name: 'Web', type: 'web-app' as const },
        { entityRef: 'shop/storefront/api', name: 'API', type: 'microservice' as const },
      ],
      dependencies: [
        { from: 'shop/storefront/web', to: 'shop/storefront/api', type: 'direct-call' as const },
        { from: 'shop/storefront/api', to: 'shop/auth/service', type: 'direct-call' as const },
      ],
    };
    const authHome = {
      name: 'Auth',
      version: '1.0.0' as const,
      level: 'container' as const,
      entityRef: 'shop/auth',
      nodes: [
        { entityRef: 'shop/auth/service', name: 'Auth Service', type: 'microservice' as const },
        { entityRef: 'shop/auth/session-db', name: 'Session DB', type: 'database' as const },
      ],
      dependencies: [
        {
          from: 'shop/auth/service',
          to: 'shop/auth/session-db',
          type: 'read-write' as const,
        },
      ],
    };

    useBlueprintStore.setState({
      loadedSystems: [
        { path: 'storefront.yaml', name: 'Storefront', schema: storefront },
        { path: 'auth.yaml', name: 'Auth', schema: authHome },
      ],
      schema: storefront,
      selectedNodeId: 'shop/auth/session-db',
      resilienceFaults: [
        { nodeId: 'shop/auth/session-db', faultType: 'region-outage', severity: 1 },
      ],
    });

    useBlueprintStore.getState().setResilienceMode(true);
    useBlueprintStore.getState().runResilienceSimulation();

    await vi.waitFor(() => {
      expect(useBlueprintStore.getState().resilienceSimulationResult).not.toBeNull();
    });

    const state = useBlueprintStore.getState();
    expect(state.nodes.some(n => n.id === 'shop/auth/service' && n.data.external)).toBe(true);
    expect(state.nodes.some(n => n.id === 'shop/auth/session-db' && n.data.external)).toBe(true);
    expect(state.resilienceSimulationScope).toEqual(
      expect.arrayContaining([
        'shop/storefront/web',
        'shop/storefront/api',
        'shop/auth/service',
        'shop/auth/session-db',
      ])
    );
    expect(state.resilienceSimulationResult!.entryPointSlas['shop/storefront/web']).toBeLessThan(
      100
    );
  });

  it('includes upstream transitive callers in the simulation scope', async () => {
    useBlueprintStore.setState({
      schema: {
        name: 'Deep Chain',
        version: '1.0.0',
        level: 'container',
        entityRef: 'chain',
        nodes: [
          { entityRef: 'chain/entry', name: 'Entry', type: 'web-app' },
          { entityRef: 'chain/hop-01', name: 'Hop 01', type: 'microservice' },
          { entityRef: 'chain/hop-02', name: 'Hop 02', type: 'microservice' },
          { entityRef: 'chain/leaf', name: 'Leaf', type: 'database' },
        ],
        dependencies: [
          { from: 'chain/entry', to: 'chain/hop-01', type: 'direct-call' },
          { from: 'chain/hop-01', to: 'chain/hop-02', type: 'direct-call' },
          { from: 'chain/hop-02', to: 'chain/leaf', type: 'read-write' },
        ],
      },
      resilienceFaults: [{ nodeId: 'chain/leaf', faultType: 'region-outage', severity: 1 }],
      selectedNodeId: 'chain/leaf',
    });

    useBlueprintStore.getState().setResilienceMode(true);
    useBlueprintStore.getState().runResilienceSimulation();

    await vi.waitFor(() => {
      expect(useBlueprintStore.getState().resilienceSimulationResult).not.toBeNull();
    });

    const scope = useBlueprintStore.getState().resilienceSimulationScope ?? [];
    expect(scope).toEqual(
      expect.arrayContaining(['chain/leaf', 'chain/hop-02', 'chain/hop-01', 'chain/entry'])
    );
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

  it('loads a ChaosSpec YAML scenario onto the active diagram', () => {
    const error = useBlueprintStore.getState().applyChaosSpecYaml(`
version: https://archlens.dev/schemas/v1/chaos.schema.json
metadata:
  name: Payment outage
  diagramRef: shop
faults:
  - nodeId: shop/payment
    faultType: region-outage
safeguards:
  shop/web:
    localCache: true
monteCarlo:
  iterations: 500
  seed: 9
`);

    expect(error).toBeNull();
    expect(useBlueprintStore.getState().chaosSpecMetadata?.name).toBe('Payment outage');
    expect(useBlueprintStore.getState().resilienceFaults).toEqual([
      { nodeId: 'shop/payment', faultType: 'region-outage' },
    ]);
    expect(useBlueprintStore.getState().isResilienceMode).toBe(true);
    expect(useBlueprintStore.getState().selectedNodeId).toBe('shop/payment');
    expect(useBlueprintStore.getState().resilienceSafeguards).toEqual({
      'shop/web': { localCache: true },
    });
    expect(useBlueprintStore.getState().resilienceMonteCarlo.iterations).toBe(500);
  });

  it('rejects ChaosSpec YAML when diagramRef does not match', () => {
    const error = useBlueprintStore.getState().applyChaosSpecYaml(`
version: https://archlens.dev/schemas/v1/chaos.schema.json
metadata:
  name: Wrong diagram
  diagramRef: application/other
faults:
  - nodeId: shop/payment
    faultType: region-outage
`);

    expect(error).toMatch(/active diagram/i);
    expect(useBlueprintStore.getState().resilienceFaults).toEqual([
      { nodeId: 'shop/payment', faultType: 'region-outage', severity: 1 },
    ]);
    expect(useBlueprintStore.getState().chaosSpecMetadata).toBeNull();
  });

  it('runs simulation from configured faults without a selected node', async () => {
    useBlueprintStore.setState({
      resilienceFaults: [{ nodeId: 'shop/payment', faultType: 'region-outage', severity: 1 }],
    });
    useBlueprintStore.setState({ selectedNodeId: null });

    useBlueprintStore.getState().runResilienceSimulation();

    await vi.waitFor(() => {
      expect(useBlueprintStore.getState().resilienceSimulationResult).not.toBeNull();
    });
  });

  it('supports multiple faults in the scenario list', async () => {
    useBlueprintStore.setState({ resilienceFaults: [] });
    useBlueprintStore.getState().addResilienceFaultFromDraft();
    useBlueprintStore.setState({
      selectedNodeId: 'shop/web',
      resilienceFaultType: 'latency',
      resilienceSeverity: 0.5,
    });
    useBlueprintStore.getState().addResilienceFaultFromDraft();

    expect(useBlueprintStore.getState().resilienceFaults).toEqual([
      { nodeId: 'shop/payment', faultType: 'region-outage', severity: 1 },
      { nodeId: 'shop/web', faultType: 'latency', severity: 0.5 },
    ]);

    useBlueprintStore.getState().runResilienceSimulation();

    await vi.waitFor(() => {
      expect(useBlueprintStore.getState().resilienceSimulationResult).not.toBeNull();
    });
  });

  it('removes a fault from the scenario list', () => {
    useBlueprintStore.getState().addResilienceFaultFromDraft();
    useBlueprintStore.getState().removeResilienceFault('shop/payment');
    expect(useBlueprintStore.getState().resilienceFaults).toEqual([]);
  });

  it('simulates a region outage at a specific node', async () => {
    useBlueprintStore.getState().simulateResilienceFaultAtNode('shop/payment');

    expect(useBlueprintStore.getState().isResilienceMode).toBe(true);
    expect(useBlueprintStore.getState().selectedNodeId).toBe('shop/payment');
    expect(useBlueprintStore.getState().resilienceFaults).toEqual([
      { nodeId: 'shop/payment', faultType: 'region-outage', severity: 1 },
    ]);

    await vi.waitFor(() => {
      expect(useBlueprintStore.getState().resilienceSimulationResult).not.toBeNull();
    });
  });
});
