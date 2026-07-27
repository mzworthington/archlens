import type { LoggerPort } from '../logging/loggerPort';
import { noopLogger } from '../logging/loggerPort';
import type { SystemSchema } from '../models/schema';
import type { ChaosSpec } from './faultSpec';
import {
  runResilienceSimulation,
  computeResilienceHeatHops,
  type SimulationResult,
} from './simulation';
import {
  runResilienceWasmSimulation,
  wasmResultToSimulationResult,
  type MonteCarloConfig,
} from './wasmClient';

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
    return { ...result, heatHops: computeResilienceHeatHops(schema, spec) };
  }

  logger.warn('ChaosLens WASM engine unavailable; running TypeScript fallback simulation.');

  const result = runResilienceSimulation(schema, spec);
  return { ...result, engine: 'typescript' };
}
