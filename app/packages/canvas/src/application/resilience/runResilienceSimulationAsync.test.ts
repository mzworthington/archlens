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
  it('uses WASM integrityHeat without merging TypeScript integrity', async () => {
    const engine: ResilienceEnginePort = {
      runSimulation: async () => ({
        heat: { 'shop/payment': 1, 'shop/web': 0.5 },
        integrityHeat: { 'shop/payment': 0.8 },
        impactedNodes: ['shop/payment', 'shop/web'],
        integrityImpactedNodes: ['shop/payment'],
        entryPointSlas: { 'shop/web': 50 },
        overallSla: 50,
        overallIntegrity: 20,
        spofs: [],
        impactedDomains: [],
        integrityImpactedDomains: [],
        advice: ['wasm-advice'],
        propagationStoppedAt: [],
        engine: 'go',
      }),
    };

    const result = await runResilienceSimulationAsync(
      schema,
      {
        faults: [{ nodeId: 'shop/payment', faultType: 'region-outage' }],
        entryPoints: ['shop/web'],
      },
      { engine }
    );

    expect(result.engine).toBe('go');
    expect(result.integrityHeat.get('shop/payment')).toBe(0.8);
    expect(result.overallIntegrity).toBe(20);
    expect(result.advice).toEqual(['wasm-advice']);
  });

  it('does not hybrid-merge TypeScript when WASM returns empty integrityHeat', async () => {
    const engine: ResilienceEnginePort = {
      runSimulation: async () => ({
        heat: { 'shop/payment': 1 },
        integrityHeat: {},
        impactedNodes: ['shop/payment'],
        integrityImpactedNodes: [],
        entryPointSlas: { 'shop/web': 0 },
        overallSla: 0,
        overallIntegrity: 100,
        spofs: [],
        impactedDomains: [],
        integrityImpactedDomains: [],
        advice: [],
        propagationStoppedAt: [],
        engine: 'go',
      }),
    };

    const result = await runResilienceSimulationAsync(
      schema,
      {
        faults: [{ nodeId: 'shop/payment', faultType: 'region-outage' }],
        entryPoints: ['shop/web'],
      },
      { engine }
    );

    expect(result.engine).toBe('go');
    expect(result.integrityHeat.size).toBe(0);
    expect(result.overallIntegrity).toBe(100);
  });

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
