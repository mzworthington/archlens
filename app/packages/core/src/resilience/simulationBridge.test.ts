import { describe, expect, it, vi, beforeEach } from 'vitest';
import type { SystemSchema } from '../models/schema';
import { runResilienceSimulationAsync } from './simulationBridge';
import { runResilienceWasmSimulation } from './wasmClient';

vi.mock('./wasmClient', () => ({
  runResilienceWasmSimulation: vi.fn().mockResolvedValue(null),
}));

const schema: SystemSchema = {
  name: 'Shop',
  apiVersion: 'blueprint.dev/v4', kind: 'Diagram',
  level: 'container',
  nodes: [
    { entityRef: 'shop/web', name: 'Web', type: 'web-app' },
    { entityRef: 'shop/payment', name: 'Payment', type: 'microservice' },
  ],
  dependencies: [{ from: 'shop/web', to: 'shop/payment', type: 'direct-call' }],
};

describe('runResilienceSimulationAsync', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('falls back to the TypeScript engine when WASM is unavailable', async () => {
    const result = await runResilienceSimulationAsync(schema, {
      faults: [{ nodeId: 'shop/payment', faultType: 'region-outage' }],
      entryPoints: ['shop/web'],
    });

    expect(result.engine).toBe('typescript');
    expect(result.overallSla).toBeLessThan(100);
    expect(result.monteCarlo).toBeUndefined();
  });

  it('propagates WASM simulation errors instead of falling back', async () => {
    vi.mocked(runResilienceWasmSimulation).mockRejectedValueOnce(new Error('sim failed'));

    await expect(
      runResilienceSimulationAsync(schema, {
        faults: [{ nodeId: 'shop/payment', faultType: 'region-outage' }],
        entryPoints: ['shop/web'],
      })
    ).rejects.toThrow('sim failed');
  });

  it('logs WASM unavailability through the injected logger', async () => {
    const logger = { info: vi.fn(), warn: vi.fn(), error: vi.fn() };

    await runResilienceSimulationAsync(
      schema,
      {
        faults: [{ nodeId: 'shop/payment', faultType: 'region-outage' }],
        entryPoints: ['shop/web'],
      },
      { logger }
    );

    expect(logger.warn).toHaveBeenCalledWith(
      'ChaosLens WASM engine unavailable; running TypeScript fallback simulation.'
    );
  });
});
