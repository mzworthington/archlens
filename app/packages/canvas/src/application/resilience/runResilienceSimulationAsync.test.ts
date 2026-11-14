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
    ).rejects.toHaveProperty('message', 'sim failed');
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

  it('normalizes legacy WASM target-side SPOF advice to canonical caller-side recommendations', async () => {
    const fanInSchema: SystemSchema = {
      name: 'Shop',
      version: '1.0.0',
      level: 'container',
      nodes: [
        { entityRef: 'shop/web', name: 'Web', type: 'web-app' },
        { entityRef: 'shop/mobile', name: 'Mobile', type: 'mobile-app' },
        { entityRef: 'external/stripe', name: 'Stripe', type: 'software-system', external: true },
      ],
      dependencies: [
        { from: 'shop/web', to: 'external/stripe', type: 'direct-call' },
        { from: 'shop/mobile', to: 'external/stripe', type: 'direct-call' },
      ],
    };
    const engine: ResilienceEnginePort = {
      runSimulation: async () => ({
        heat: { 'external/stripe': 1, 'shop/web': 0.8, 'shop/mobile': 0.8 },
        integrityHeat: {},
        impactedNodes: ['external/stripe', 'shop/mobile', 'shop/web'],
        integrityImpactedNodes: [],
        entryPointSlas: { 'shop/web': 20, 'shop/mobile': 20 },
        overallSla: 20,
        overallIntegrity: 100,
        spofs: ['external/stripe'],
        impactedDomains: ['external', 'shop'],
        integrityImpactedDomains: [],
        advice: [
          'Add a circuit breaker on Stripe - multiple services depend on it with no isolation.',
        ],
        propagationStoppedAt: [],
        engine: 'go',
      }),
    };

    const result = await runResilienceSimulationAsync(
      fanInSchema,
      {
        faults: [{ nodeId: 'external/stripe', faultType: 'region-outage' }],
        entryPoints: ['shop/web', 'shop/mobile'],
      },
      { engine }
    );

    expect(result.advice.some(line => line.startsWith('In Web, add a circuit breaker'))).toBe(true);
    expect(result.advice.some(line => line.startsWith('Add a circuit breaker on Stripe'))).toBe(
      false
    );
  });
});
