import type { LoggerPort } from '@archlens/core/logging';
import { noopLogger } from '@archlens/core/logging';
import type { SystemSchema } from '@archlens/core';
import {
  buildResilienceRecommendations,
  resilienceRecommendationsToAdvice,
} from '@archlens/core/recommendations';
import type { ChaosSpec } from '@archlens/core/resilience';
import {
  runResilienceSimulation,
  computeResilienceHeatHops,
  resolveFaultNodeIds,
  wasmResultToSimulationResult,
  type MonteCarloConfig,
  type SimulationResult,
} from '@archlens/core/resilience';
import type { ResilienceEnginePort } from '../../core';
import { noopResilienceEngine } from '../../core';

export interface ResilienceSimulationOptions {
  monteCarlo?: MonteCarloConfig;
  logger?: LoggerPort;
  engine?: ResilienceEnginePort;
}

function hasLegacyTargetSpofAdvice(advice: readonly string[]): boolean {
  return advice.some(line => line.startsWith('Add a circuit breaker on '));
}

export async function runResilienceSimulationAsync(
  schema: SystemSchema,
  spec: ChaosSpec,
  options?: ResilienceSimulationOptions
): Promise<SimulationResult> {
  const logger = options?.logger ?? noopLogger;
  const engine = options?.engine ?? noopResilienceEngine;

  const wasmResult = await engine.runSimulation(
    {
      schema: { nodes: schema.nodes, dependencies: schema.dependencies },
      spec,
      monteCarlo: options?.monteCarlo,
    },
    logger
  );

  // Go WASM already computes integrityHeat (resilience-engine/internal/sim/integrity.go).
  // Per ADR-0005, trust WASM when available - TypeScript only when WASM is unavailable.
  if (wasmResult) {
    const result = wasmResultToSimulationResult(wasmResult);
    const faultNodeIds = resolveFaultNodeIds(schema, spec);
    const advice = hasLegacyTargetSpofAdvice(result.advice)
      ? resilienceRecommendationsToAdvice(
          buildResilienceRecommendations({
            schema,
            spofs: result.spofs,
            heat: result.heat,
            propagationStoppedAt: result.propagationStoppedAt,
            integrityHeat: result.integrityHeat,
            faultNodeIds,
          })
        )
      : result.advice;
    return {
      ...result,
      advice,
      heatHops: computeResilienceHeatHops(schema, spec),
      faultNodeIds,
    };
  }

  logger.warn('ChaosLens WASM engine unavailable; running TypeScript fallback simulation.');

  const result = runResilienceSimulation(schema, spec);
  return { ...result, engine: 'typescript' };
}
