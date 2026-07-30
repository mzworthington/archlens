import type { EntityRef, SystemNode, SystemSchema } from '../models/schema';
import type { ChaosRefactorContext } from './compositeRisk';
import type { NodeSafeguards } from '../resilience/faultSpec';
import {
  SAFEGUARD_KEY_ORDER,
  mergeNodeSafeguards,
  resolveNodeResilience,
} from '../resilience/nodeResilience';
import type { SimulationResult } from '../resilience/simulation';

const CRITICAL_PATH_BLAST_THRESHOLD = 0.35;

function safeguardCoverage(safeguards: NodeSafeguards): number {
  const enabled = SAFEGUARD_KEY_ORDER.filter(key => safeguards[key]).length;
  return enabled / SAFEGUARD_KEY_ORDER.length;
}

function resolveSafeguards(
  node: SystemNode | undefined,
  sessionSafeguards?: Partial<Record<EntityRef, NodeSafeguards>>
): NodeSafeguards {
  const persisted = resolveNodeResilience(node);
  const session = node?.entityRef ? sessionSafeguards?.[node.entityRef] : undefined;
  return mergeNodeSafeguards(persisted, session);
}

/**
 * Build per-node ChaosLens context for composite risk and refactor ranking.
 */
export function buildChaosRiskContextMap(
  systems: readonly { schema: SystemSchema }[],
  simulation: SimulationResult | null | undefined,
  sessionSafeguards?: Partial<Record<EntityRef, NodeSafeguards>>
): Map<EntityRef, ChaosRefactorContext> {
  const map = new Map<EntityRef, ChaosRefactorContext>();
  if (!simulation) return map;

  const spofSet = new Set(simulation.spofs);
  const nodesByRef = new Map<EntityRef, SystemNode>();
  for (const system of systems) {
    for (const node of system.schema.nodes) {
      nodesByRef.set(node.entityRef, node);
    }
  }

  const entityRefs = new Set<EntityRef>([
    ...simulation.heat.keys(),
    ...simulation.integrityHeat.keys(),
    ...simulation.spofs,
  ]);

  for (const entityRef of entityRefs) {
    const blastRadius = simulation.heat.get(entityRef) ?? 0;
    const node = nodesByRef.get(entityRef);
    const safeguards = resolveSafeguards(node, sessionSafeguards);
    const coverage = safeguardCoverage(safeguards);
    const onCriticalPath = blastRadius >= CRITICAL_PATH_BLAST_THRESHOLD || spofSet.has(entityRef);

    map.set(entityRef, {
      blastRadius,
      onCriticalPath,
      isSpof: spofSet.has(entityRef),
      safeguardCoverage: coverage,
    });
  }

  return map;
}
