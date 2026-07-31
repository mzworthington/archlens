import type { EntityRef, SystemNode, SystemSchema } from '../models/schema';
import type { ChaosSpec } from '../resilience/faultSpec';
import { buildDependents } from '../resilience/graph';

export type EstateScenarioKind = 'region-outage' | 'high-fan-in-probe' | 'publisher-outage';

export interface EstateScenario {
  kind: EstateScenarioKind;
  name: string;
  spec: ChaosSpec;
}

export interface BuildEstateScenariosOptions {
  /** Max region-outage faults per diagram (prioritized by fan-in). Default 15. */
  maxRegionOutageTargets?: number;
  /** Max latency probes on high fan-in nodes. Default 5. */
  maxFanInProbes?: number;
}

const DEFAULT_MAX_REGION_OUTAGE = 15;
const DEFAULT_MAX_FAN_IN_PROBES = 5;
const MIN_FAN_IN_FOR_PROBE = 2;

function isScenarioTarget(node: SystemNode): boolean {
  return node.type !== 'group' && !node.external;
}

function fanInRank(schema: SystemSchema): Map<EntityRef, number> {
  const dependents = buildDependents(schema);
  const rank = new Map<EntityRef, number>();
  for (const node of schema.nodes) {
    rank.set(node.entityRef, dependents.get(node.entityRef)?.length ?? 0);
  }
  return rank;
}

function sortByFanInDesc(entityRefs: EntityRef[], rank: Map<EntityRef, number>): EntityRef[] {
  return [...entityRefs].sort((a, b) => (rank.get(b) ?? 0) - (rank.get(a) ?? 0));
}

function findPublishers(schema: SystemSchema): EntityRef[] {
  const publishers = new Set<EntityRef>();
  for (const dep of schema.dependencies) {
    if (dep.type === 'publish-subscribe') {
      publishers.add(dep.from);
    }
  }
  return [...publishers];
}

function pushScenario(
  scenarios: EstateScenario[],
  seen: Set<string>,
  scenario: EstateScenario
): void {
  const key = `${scenario.kind}:${scenario.spec.faults.map(f => f.nodeId).join('|')}`;
  if (seen.has(key)) return;
  seen.add(key);
  scenarios.push(scenario);
}

/**
 * Build the default headless scenario set for a diagram:
 * region-outage sweep, high fan-in latency probes, and publisher outages.
 */
export function buildDefaultEstateScenarios(
  schema: SystemSchema,
  options: BuildEstateScenariosOptions = {}
): EstateScenario[] {
  const maxRegionOutage = options.maxRegionOutageTargets ?? DEFAULT_MAX_REGION_OUTAGE;
  const maxFanInProbes = options.maxFanInProbes ?? DEFAULT_MAX_FAN_IN_PROBES;

  const scenarios: EstateScenario[] = [];
  const seen = new Set<string>();
  const rank = fanInRank(schema);
  const nodeByRef = new Map(schema.nodes.map(node => [node.entityRef, node]));

  const regionTargets = sortByFanInDesc(
    schema.nodes.filter(isScenarioTarget).map(node => node.entityRef),
    rank
  ).slice(0, maxRegionOutage);

  for (const nodeId of regionTargets) {
    const node = nodeByRef.get(nodeId);
    pushScenario(scenarios, seen, {
      kind: 'region-outage',
      name: `Region outage: ${node?.name ?? nodeId}`,
      spec: {
        faults: [{ nodeId, faultType: 'region-outage' }],
      },
    });
  }

  const fanInTargets = sortByFanInDesc(
    [...rank.entries()]
      .filter(([, count]) => count >= MIN_FAN_IN_FOR_PROBE)
      .map(([entityRef]) => entityRef),
    rank
  ).slice(0, maxFanInProbes);

  for (const nodeId of fanInTargets) {
    const node = nodeByRef.get(nodeId);
    pushScenario(scenarios, seen, {
      kind: 'high-fan-in-probe',
      name: `Latency probe: ${node?.name ?? nodeId}`,
      spec: {
        faults: [{ nodeId, faultType: 'latency', severity: 0.8 }],
      },
    });
  }

  for (const nodeId of findPublishers(schema)) {
    const node = nodeByRef.get(nodeId);
    pushScenario(scenarios, seen, {
      kind: 'publisher-outage',
      name: `Publisher outage: ${node?.name ?? nodeId}`,
      spec: {
        faults: [{ nodeId, faultType: 'region-outage' }],
      },
    });
  }

  return scenarios;
}

export function chaosSpecToEstateScenario(name: string, spec: ChaosSpec): EstateScenario {
  const kind: EstateScenarioKind = spec.faults.some(
    fault => fault.faultType === 'latency' || fault.faultType === 'error-rate'
  )
    ? 'high-fan-in-probe'
    : 'region-outage';

  return { kind, name, spec };
}

export function resolveDiagramEntityRef(schema: SystemSchema): string {
  return schema.entityRef?.trim() || schema.name;
}
