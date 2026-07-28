import type { EntityRef, SystemSchema } from '../models/schema';
import { computeBlastRadius } from './blastRadius';
import type { ChaosSpec } from './faultSpec';
import {
  buildDependents,
  pubSubBrokersForPublisher,
  pubSubPeersOnBroker,
  resolveFaultTargets,
} from './graph';
import { computeIntegrityRadius, INTEGRITY_PEER_FACTOR } from './integrityRadius';
import { resolveNodeResilience } from './nodeResilience';

export interface MonteCarloStats {
  iterations: number;
  overallSlaMean: number;
  overallSlaP5: number;
  overallSlaP95: number;
  entryPointSlasP95?: Record<EntityRef, number>;
}

export interface SimulationResult {
  heat: Map<EntityRef, number>;
  /** Minimum hop distance from any fault origin for animated ripple ordering. */
  heatHops: Map<EntityRef, number>;
  integrityHeat: Map<EntityRef, number>;
  impactedNodes: EntityRef[];
  integrityImpactedNodes: EntityRef[];
  entryPointSlas: Record<EntityRef, number>;
  overallSla: number;
  overallIntegrity: number;
  spofs: EntityRef[];
  impactedDomains: string[];
  integrityImpactedDomains: string[];
  advice: string[];
  propagationStoppedAt: EntityRef[];
  /** Present when WASM Monte Carlo ran, or omitted for deterministic TypeScript fallback. */
  monteCarlo?: MonteCarloStats;
  /** Which engine produced this result (`go` from WASM, `typescript` from fallback). */
  engine?: 'go' | 'typescript';
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
  propagationStoppedAt: EntityRef[],
  integrityHeat: Map<EntityRef, number>,
  faultNodeIds: EntityRef[]
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

  for (const faultId of faultNodeIds) {
    const brokers = pubSubBrokersForPublisher(schema, faultId);
    if (brokers.length === 0) continue;

    const publisher = nodeById.get(faultId);
    const publisherName = publisher?.name ?? faultId;
    const stalePeers = new Set<EntityRef>();

    for (const brokerId of brokers) {
      for (const peerId of pubSubPeersOnBroker(schema, brokerId)) {
        if (peerId === faultId) continue;
        const peerHeat = integrityHeat.get(peerId) ?? 0;
        if (peerHeat >= INTEGRITY_PEER_FACTOR * 0.5) stalePeers.add(peerId);
      }
    }

    if (stalePeers.size > 0) {
      const peerNames = [...stalePeers].map(id => nodeById.get(id)?.name ?? id);
      advice.push(
        `${publisherName} stopped publishing — ${peerNames.join(', ')} may keep running but will miss new events.`
      );
    }
  }

  const integrityOnly = [...integrityHeat.entries()]
    .filter(([id, intensity]) => intensity >= 0.7 && (heat.get(id) ?? 0) < 0.3)
    .map(([id]) => nodeById.get(id)?.name ?? id);

  if (integrityOnly.length > 0) {
    advice.push(
      `Data integrity risk without availability loss: ${integrityOnly.join(', ')}. Verify staleness handling and compensating actions.`
    );
  }

  return advice;
}

function computeOverallIntegrity(integrityHeat: Map<EntityRef, number>): number {
  const impacted = [...integrityHeat.entries()].filter(([, intensity]) => intensity > 0);
  if (impacted.length === 0) return 100;

  const scores = impacted.map(([, intensity]) => (1 - intensity) * 100);
  const mean = scores.reduce((a, b) => a + b, 0) / scores.length;
  return Math.round(mean * 10) / 10;
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
    const hasCircuitBreaker = Boolean(resolveNodeResilience(node).circuitBreaker);

    if (!hasCircuitBreaker) spofs.push(dependency);
  }

  return spofs;
}

/**
 * Deterministic resilience simulation: merge blast radii, compute SLA degradation, flag SPOFs.
 */
function mergeHeatHops(dst: Map<EntityRef, number>, src: Map<EntityRef, number>): void {
  for (const [nodeId, hop] of src) {
    const existing = dst.get(nodeId);
    dst.set(nodeId, existing == null ? hop : Math.min(existing, hop));
  }
}

/** Hop distances for ripple animation (same propagation order as blast radius). */
export function computeResilienceHeatHops(
  schema: SystemSchema,
  spec: ChaosSpec
): Map<EntityRef, number> {
  const mergedHeatHops = new Map<EntityRef, number>();

  for (const fault of spec.faults) {
    const targets = resolveFaultTargets(fault.nodeId, schema);
    for (const targetId of targets) {
      const blast = computeBlastRadius(
        schema,
        { ...fault, nodeId: targetId },
        { safeguards: spec.safeguards }
      );
      mergeHeatHops(mergedHeatHops, blast.heatHops);
    }
  }

  return mergedHeatHops;
}

export function runResilienceSimulation(schema: SystemSchema, spec: ChaosSpec): SimulationResult {
  const mergedHeat = new Map<EntityRef, number>();
  const mergedHeatHops = new Map<EntityRef, number>();
  const mergedIntegrityHeat = new Map<EntityRef, number>();
  const propagationStoppedAt = new Set<EntityRef>();
  const faultNodeIds: EntityRef[] = [];

  for (const fault of spec.faults) {
    const targets = resolveFaultTargets(fault.nodeId, schema);
    for (const targetId of targets) {
      faultNodeIds.push(targetId);
      const blast = computeBlastRadius(
        schema,
        { ...fault, nodeId: targetId },
        {
          safeguards: spec.safeguards,
        }
      );
      for (const stopped of blast.propagationStoppedAt) propagationStoppedAt.add(stopped);
      for (const [nodeId, intensity] of blast.heat) {
        const existing = mergedHeat.get(nodeId) ?? 0;
        mergedHeat.set(nodeId, Math.min(1, Math.max(existing, intensity)));
      }
      mergeHeatHops(mergedHeatHops, blast.heatHops);

      const integrity = computeIntegrityRadius(schema, { ...fault, nodeId: targetId });
      for (const [nodeId, intensity] of integrity.integrityHeat) {
        const existing = mergedIntegrityHeat.get(nodeId) ?? 0;
        mergedIntegrityHeat.set(nodeId, Math.min(1, Math.max(existing, intensity)));
      }
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

  const integrityImpactedNodes = [...mergedIntegrityHeat.entries()]
    .filter(([, intensity]) => intensity > 0)
    .map(([id]) => id);

  const impactedDomains = [...new Set(impactedNodes.map(domainFromEntityRef))];
  const integrityImpactedDomains = [...new Set(integrityImpactedNodes.map(domainFromEntityRef))];

  const spofs = detectSpofs(schema);
  const overallIntegrity = computeOverallIntegrity(mergedIntegrityHeat);

  return {
    heat: mergedHeat,
    heatHops: mergedHeatHops,
    integrityHeat: mergedIntegrityHeat,
    impactedNodes,
    integrityImpactedNodes,
    entryPointSlas,
    overallSla,
    overallIntegrity,
    spofs,
    impactedDomains,
    integrityImpactedDomains,
    advice: buildAdvice(
      schema,
      spofs,
      mergedHeat,
      [...propagationStoppedAt],
      mergedIntegrityHeat,
      faultNodeIds
    ),
    propagationStoppedAt: [...propagationStoppedAt],
  };
}
