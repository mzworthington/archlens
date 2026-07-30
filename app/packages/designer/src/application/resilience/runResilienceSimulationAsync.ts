import type { LoggerPort } from '@archlens/core/logging';
import { noopLogger } from '@archlens/core/logging';
import type { SystemSchema } from '@archlens/core';
import type { ChaosSpec } from '@archlens/core/resilience';
import {
  runResilienceSimulation,
  computeResilienceHeatHops,
  wasmResultToSimulationResult,
  type MonteCarloConfig,
  type SimulationResult,
} from '@archlens/core/resilience';
import { runResilienceWasmSimulation } from '../../infrastructure/resilience/wasmClient';

export interface ResilienceSimulationOptions {
  monteCarlo?: MonteCarloConfig;
  logger?: LoggerPort;
}

export async function runResilienceSimulationAsync(
  schema: SystemSchema,
  spec: ChaosSpec,
  options?: ResilienceSimulationOptions
): Promise<SimulationResult> {
  const logger = options?.logger ?? noopLogger;

  const wasmResult = await runResilienceWasmSimulation(
    {
      schema: { nodes: schema.nodes, dependencies: schema.dependencies },
      spec,
      monteCarlo: options?.monteCarlo,
    },
    logger
  );

  if (wasmResult) {
    const result = wasmResultToSimulationResult(wasmResult);
    const withHops = { ...result, heatHops: computeResilienceHeatHops(schema, spec) };

    if (spec.faults.length > 0 && result.integrityHeat.size === 0) {
      const tsIntegrity = runResilienceSimulation(schema, spec);
      return {
        ...withHops,
        integrityHeat: tsIntegrity.integrityHeat,
        integrityImpactedNodes: tsIntegrity.integrityImpactedNodes,
        overallIntegrity: tsIntegrity.overallIntegrity,
        integrityImpactedDomains: tsIntegrity.integrityImpactedDomains,
        advice: [...new Set([...withHops.advice, ...tsIntegrity.advice])],
      };
    }

    return withHops;
  }

  logger.warn('ChaosLens WASM engine unavailable; running TypeScript fallback simulation.');

  const result = runResilienceSimulation(schema, spec);
  return { ...result, engine: 'typescript' };
}
