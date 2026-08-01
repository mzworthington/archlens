import { describe, expect, it, vi } from 'vitest';
import type { SystemSchema } from '@archlens/core';
import type { ResilienceEnginePort } from '../../core';
import { runResilienceSimulationAsync } from './runResilienceSimulationAsync';

const schema: SystemSchema = {
  name: 'Shop',
  version: '1.0.0',
  level: 'container',
  nodes: [
    { entityRef: 'shop/web', name: 'Web', type: 'web-app' },
    { entityRef: 'shop/payment', name: 'Payment', type: 'microservice' },
  ],
  dependencies: [{ from: 'shop/web', to: 'shop/payment', type: 'direct-call' }],
};

const unavailableEngine: ResilienceEnginePort = {
  runSimulation: async () => null,
};

describe('runResilienceSimulationAsync', () => {
  it('falls back to the TypeScript engine when WASM is unavailable', async () => {
    const result = await runResilienceSimulationAsync(
      schema,
      {
        faults: [{ nodeId: 'shop/payment', faultType: 'region-outage' }],
        entryPoints: ['shop/web'],
      },
      { engine: unavailableEngine }
    );

    expect(result.engine).toBe('typescript');
    expect(result.overallSla).toBeLessThan(100);
    expect(result.monteCarlo).toBeUndefined();
  });

  it('propagates WASM simulation errors instead of falling back', async () => {
    const engine: ResilienceEnginePort = {
      runSimulation: async () => {
        throw new Error('sim failed');
      },
    };

    await expect(
      runResilienceSimulationAsync(
        schema,
        {
          faults: [{ nodeId: 'shop/payment', faultType: 'region-outage' }],
          entryPoints: ['shop/web'],
        },
        { engine }
      )
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
      { logger, engine: unavailableEngine }
    );

    expect(logger.warn).toHaveBeenCalledWith(
      'ChaosLens WASM engine unavailable; running TypeScript fallback simulation.'
    );
  });
});
