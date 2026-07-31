import type { EntityRef, SystemSchema } from '../models/schema';
import type { ChaosSpec } from './faultSpec';
import type { MonteCarloConfig } from './monteCarlo';
import type { MonteCarloStats } from './simulation';

export interface WasmSimulationRequest {
  schema: Pick<SystemSchema, 'nodes' | 'dependencies'>;
  spec: ChaosSpec;
  monteCarlo?: MonteCarloConfig;
}

export interface WasmSimulationResult {
  heat: Record<EntityRef, number>;
  integrityHeat?: Record<EntityRef, number>;
  impactedNodes: EntityRef[];
  integrityImpactedNodes?: EntityRef[];
  entryPointSlas: Record<EntityRef, number>;
  overallSla: number;
  overallIntegrity?: number;
  spofs: EntityRef[];
  impactedDomains: string[];
  integrityImpactedDomains?: string[];
  advice: string[];
  propagationStoppedAt: EntityRef[];
  monteCarlo?: MonteCarloStats;
  engine?: 'go' | 'typescript';
  error?: string;
}

function computeOverallIntegrityFromHeat(integrityHeat: Map<EntityRef, number>): number {
  const impacted = [...integrityHeat.entries()].filter(([, v]) => v > 0);
  if (impacted.length === 0) return 100;
  const scores = impacted.map(([, intensity]) => (1 - intensity) * 100);
  const mean = scores.reduce((a, b) => a + b, 0) / scores.length;
  return Math.round(mean * 10) / 10;
}

/** Map WASM JSON payload into the in-memory simulation result shape. */
export function wasmResultToSimulationResult(result: WasmSimulationResult) {
  const heat = new Map<EntityRef, number>(
    Object.entries(result.heat ?? {}) as [EntityRef, number][]
  );
  const integrityHeat = new Map<EntityRef, number>(
    Object.entries(result.integrityHeat ?? {}) as [EntityRef, number][]
  );
  return {
    heat,
    heatHops: new Map<EntityRef, number>(),
    integrityHeat,
    impactedNodes: result.impactedNodes ?? [],
    integrityImpactedNodes: result.integrityImpactedNodes ?? [],
    entryPointSlas: result.entryPointSlas ?? {},
    overallSla: result.overallSla ?? 100,
    overallIntegrity: result.overallIntegrity ?? computeOverallIntegrityFromHeat(integrityHeat),
    spofs: result.spofs ?? [],
    impactedDomains: result.impactedDomains ?? [],
    integrityImpactedDomains: result.integrityImpactedDomains ?? [],
    advice: result.advice ?? [],
    propagationStoppedAt: result.propagationStoppedAt ?? [],
    faultNodeIds: [],
    monteCarlo: result.monteCarlo,
    engine: result.engine ?? 'go',
  };
}
