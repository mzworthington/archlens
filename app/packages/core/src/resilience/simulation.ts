import type { EntityRef, SystemSchema } from '../models/schema';
import { computeBlastRadius } from './blastRadius';
import type { ChaosSpec } from './faultSpec';

export interface SimulationResult {
  heat: Map<EntityRef, number>;
  impactedNodes: EntityRef[];
  entryPointSlas: Record<EntityRef, number>;
  overallSla: number;
  spofs: EntityRef[];
  impactedDomains: string[];
  advice: string[];
  propagationStoppedAt: EntityRef[];
}

function buildDependents(schema: SystemSchema): Map<EntityRef, EntityRef[]> {
  const nodeIds = new Set(schema.nodes.map(n => n.entityRef));
  const dependents = new Map<EntityRef, EntityRef[]>();

  for (const dep of schema.dependencies) {
    if (!nodeIds.has(dep.from) || !nodeIds.has(dep.to)) continue;
    const list = dependents.get(dep.to);
    if (list) list.push(dep.from);
    else dependents.set(dep.to, [dep.from]);
  }

  return dependents;
}

function resolveEntryPoints(schema: SystemSchema, explicit?: EntityRef[]): EntityRef[] {
  if (explicit && explicit.length > 0) return explicit;

  const called = new Set(schema.dependencies.map(d => d.to));
  const entryPoints = schema.nodes.map(n => n.entityRef).filter(id => !called.has(id));

  return entryPoints.length > 0 ? entryPoints : schema.nodes.map(n => n.entityRef);
}

function domainFromEntityRef(ref: EntityRef): string {
  const segment = ref.split('/').filter(Boolean)[0];
  return segment || ref;
}

function buildAdvice(
  schema: SystemSchema,
  spofs: EntityRef[],
  heat: Map<EntityRef, number>,
  propagationStoppedAt: EntityRef[]
): string[] {
  const advice: string[] = [];
  const nodeById = new Map(schema.nodes.map(n => [n.entityRef, n]));

  for (const spof of spofs) {
    const node = nodeById.get(spof);
    advice.push(
      `Add a circuit breaker on ${node?.name ?? spof} — multiple services depend on it with no isolation.`
    );
  }

  for (const stopped of propagationStoppedAt) {
    const node = nodeById.get(stopped);
    advice.push(
      `Circuit breaker on ${node?.name ?? stopped} contained the blast radius — keep this safeguard enabled.`
    );
  }

  const hotNodes = [...heat.entries()]
    .filter(([, intensity]) => intensity >= 0.7)
    .map(([id]) => nodeById.get(id)?.name ?? id);

  if (hotNodes.length > 0) {
    advice.push(`High-impact nodes: ${hotNodes.join(', ')}. Review timeouts and fallbacks.`);
  }

  return advice;
}

/**
 * Detect single points of failure: dependencies with multiple callers and no circuit breaker.
 */
export function detectSpofs(schema: SystemSchema): EntityRef[] {
  const dependents = buildDependents(schema);
  const spofs: EntityRef[] = [];

  for (const [dependency, callers] of dependents) {
    if (callers.length < 2) continue;

    const node = schema.nodes.find(n => n.entityRef === dependency);
    const raw = node?.properties?.resilience;
    let hasCircuitBreaker = false;
    if (typeof raw === 'string') {
      try {
        const parsed = JSON.parse(raw) as { safeguards?: { circuitBreaker?: boolean } };
        hasCircuitBreaker = Boolean(parsed.safeguards?.circuitBreaker);
      } catch {
        hasCircuitBreaker = false;
      }
    }

    if (!hasCircuitBreaker) spofs.push(dependency);
  }

  return spofs;
}

/**
 * Deterministic resilience simulation: merge blast radii, compute SLA degradation, flag SPOFs.
 */
export function runResilienceSimulation(schema: SystemSchema, spec: ChaosSpec): SimulationResult {
  const mergedHeat = new Map<EntityRef, number>();
  const propagationStoppedAt = new Set<EntityRef>();

  for (const fault of spec.faults) {
    const blast = computeBlastRadius(schema, fault, { safeguards: spec.safeguards });
    for (const stopped of blast.propagationStoppedAt) propagationStoppedAt.add(stopped);
    for (const [nodeId, intensity] of blast.heat) {
      const existing = mergedHeat.get(nodeId) ?? 0;
      mergedHeat.set(nodeId, Math.min(1, Math.max(existing, intensity)));
    }
  }

  const entryPoints = resolveEntryPoints(schema, spec.entryPoints);
  const entryPointSlas: Record<EntityRef, number> = {};
  for (const entry of entryPoints) {
    const impact = mergedHeat.get(entry) ?? 0;
    entryPointSlas[entry] = Math.round((1 - impact) * 1000) / 10;
  }

  const slaValues = Object.values(entryPointSlas);
  const overallSla =
    slaValues.length > 0
      ? Math.round((slaValues.reduce((a, b) => a + b, 0) / slaValues.length) * 10) / 10
      : 100;

  const impactedNodes = [...mergedHeat.entries()]
    .filter(([, intensity]) => intensity > 0)
    .map(([id]) => id);

  const impactedDomains = [...new Set(impactedNodes.map(domainFromEntityRef))];

  const spofs = detectSpofs(schema);

  return {
    heat: mergedHeat,
    impactedNodes,
    entryPointSlas,
    overallSla,
    spofs,
    impactedDomains,
    advice: buildAdvice(schema, spofs, mergedHeat, [...propagationStoppedAt]),
    propagationStoppedAt: [...propagationStoppedAt],
  };
}
