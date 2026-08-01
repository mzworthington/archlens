import type { EntityRef, LoadedSystemInput, SystemDependency, SystemSchema } from '@archlens/core';
import {
  buildWorkspaceEntityIndex,
  computeExternalSummaryEdgePairs,
  externalSummaryHubId,
  filterOverviewExternalsForSelection,
  groupOverviewExternalsByBand,
  suggestOverviewExternalDependencies,
  type ExternalSummaryBand,
  type OverviewExternalBands,
} from '@archlens/core';
import { collectDependencyNeighborhoodWithExternals } from './filterSelectedDependencyFocus';
import type { BlueprintRFEdge, BlueprintRFNode } from '../store/layoutUtils';
import { dependencyArrowMarker, getClosestHandles } from '../store/layoutUtils';

export const EXTERNAL_SUMMARY_HUB_EDGE_PREFIX = 'external-summary-';

export type ExternalSummaryDisplayInput = {
  nodes: BlueprintRFNode[];
  edges: BlueprintRFEdge[];
  schema: SystemSchema;
  loadedSystems: readonly LoadedSystemInput[];
  selectedNodeId: string | null;
  showCallers: boolean;
  showTargets: boolean;
  expandedBand: ExternalSummaryBand | null;
  showCoupling: boolean;
  isResilienceMode: boolean;
  includeExternalsInFocus?: boolean;
};

export function shouldUseExternalSummaryMode(input: {
  selectedNodeId: string | null;
  expandedBand: ExternalSummaryBand | null;
  showCoupling: boolean;
  isResilienceMode: boolean;
}): boolean {
  if (input.showCoupling || input.isResilienceMode) return false;
  if (input.selectedNodeId) return false;
  return true;
}

function internalEntityRefs(nodes: BlueprintRFNode[]): Set<EntityRef> {
  const refs = new Set<EntityRef>();
  for (const node of nodes) {
    if (node.data.external || node.data.couplingGhost) continue;
    refs.add((node.data.entityRef ?? node.id) as EntityRef);
  }
  return refs;
}

function nodeByEntityRef(nodes: BlueprintRFNode[]): Map<EntityRef, BlueprintRFNode> {
  const map = new Map<EntityRef, BlueprintRFNode>();
  for (const node of nodes) {
    map.set((node.data.entityRef ?? node.id) as EntityRef, node);
  }
  return map;
}

export function resolveOverviewExternalBands(
  schema: SystemSchema,
  loadedSystems: readonly LoadedSystemInput[]
): OverviewExternalBands {
  const index = buildWorkspaceEntityIndex([...loadedSystems]);
  const overview = suggestOverviewExternalDependencies(schema, [...loadedSystems], index);
  const dependencies = collectWorkspaceDependencies(schema, loadedSystems);
  return groupOverviewExternalsByBand(schema, overview, dependencies);
}

function collectWorkspaceDependencies(
  schema: SystemSchema,
  loadedSystems: readonly LoadedSystemInput[]
): SystemDependency[] {
  const deps = [...(schema.dependencies ?? [])];
  const seen = new Set(deps.map(d => `${d.from}\0${d.to}`));
  for (const system of loadedSystems) {
    for (const dep of system.schema.dependencies ?? []) {
      const key = `${dep.from}\0${dep.to}`;
      if (seen.has(key)) continue;
      seen.add(key);
      deps.push(dep);
    }
  }
  return deps;
}

export function resolveVisibleExternalEntityRefs(
  input: ExternalSummaryDisplayInput
): Set<EntityRef> | null {
  const {
    nodes,
    schema,
    loadedSystems,
    selectedNodeId,
    expandedBand,
    showCoupling,
    isResilienceMode,
  } = input;

  if (!input.showCallers && !input.showTargets) return new Set();

  // Coupling lens owns its own focus rules; do not apply external whitelist filtering.
  if (showCoupling) return null;

  if (
    shouldUseExternalSummaryMode({ selectedNodeId, expandedBand, showCoupling, isResilienceMode })
  ) {
    if (!expandedBand) return new Set();
    const bands = resolveOverviewExternalBands(schema, loadedSystems);
    const members = expandedBand === 'callers' ? bands.callers : bands.targets;
    return new Set(members.map(entity => entity.entityRef));
  }

  if (selectedNodeId) {
    const selected = nodes.find(node => node.id === selectedNodeId);
    const selectedRef = (selected?.data.entityRef ?? selectedNodeId) as EntityRef;

    if (input.includeExternalsInFocus) {
      const closure = collectDependencyNeighborhoodWithExternals(
        selectedNodeId,
        nodes,
        input.edges,
        true
      );
      const allowed = new Set<EntityRef>();
      for (const id of closure) {
        const node = nodes.find(entry => entry.id === id);
        if (!node?.data.external) continue;
        allowed.add((node.data.entityRef ?? id) as EntityRef);
      }
      if (selected?.data.external) allowed.add(selectedRef);
      return allowed;
    }

    const bands = resolveOverviewExternalBands(schema, loadedSystems);
    const deps = collectWorkspaceDependencies(schema, loadedSystems);
    const filtered = filterOverviewExternalsForSelection(selectedRef, bands, deps);
    const allowed = new Set<EntityRef>();
    if (input.showCallers) {
      for (const entity of filtered.callers) allowed.add(entity.entityRef);
    }
    if (input.showTargets) {
      for (const entity of filtered.targets) allowed.add(entity.entityRef);
    }
    if (selected?.data.external) {
      allowed.add(selectedRef);
    }
    return allowed;
  }

  return null;
}

function internalBoundingBox(nodes: BlueprintRFNode[]): {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
  centerX: number;
} {
  const internal = nodes.filter(n => !n.data.external && !n.data.externalSummaryHub);
  if (internal.length === 0) {
    return { minX: 100, minY: 100, maxX: 400, maxY: 300, centerX: 250 };
  }

  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  for (const node of internal) {
    const width = node.measured?.width ?? 256;
    const height = node.measured?.height ?? 120;
    minX = Math.min(minX, node.position.x);
    minY = Math.min(minY, node.position.y);
    maxX = Math.max(maxX, node.position.x + width);
    maxY = Math.max(maxY, node.position.y + height);
  }
  return { minX, minY, maxX, maxY, centerX: (minX + maxX) / 2 };
}

export function buildExternalSummaryHubNodes(
  input: ExternalSummaryDisplayInput,
  bands: OverviewExternalBands
): BlueprintRFNode[] {
  if (
    !shouldUseExternalSummaryMode({
      selectedNodeId: input.selectedNodeId,
      expandedBand: input.expandedBand,
      showCoupling: input.showCoupling,
      isResilienceMode: input.isResilienceMode,
    })
  ) {
    return [];
  }

  const bbox = internalBoundingBox(input.nodes);
  const hubWidth = 280;
  const hubHeight = 88;
  const verticalGap = 140;
  const hubs: BlueprintRFNode[] = [];

  const maybeHub = (band: ExternalSummaryBand, count: number, y: number) => {
    if (count <= 0) return;
    if (band === 'callers' && !input.showCallers) return;
    if (band === 'targets' && !input.showTargets) return;
    if (input.expandedBand === band) return;

    const id = externalSummaryHubId(band);
    const label = band === 'callers' ? 'External callers' : 'External targets';
    hubs.push({
      id,
      type: 'blueprintNode',
      position: { x: Math.round(bbox.centerX - hubWidth / 2), y },
      draggable: false,
      selectable: true,
      data: {
        id,
        type: 'component',
        name: label,
        properties: {},
        externalSummaryHub: true,
        externalSummaryBand: band,
        externalSummaryCount: count,
      },
    });
  };

  maybeHub('callers', bands.callers.length, bbox.minY - verticalGap - hubHeight);
  maybeHub('targets', bands.targets.length, bbox.maxY + verticalGap);
  return hubs;
}

function bandEntityRefSet(band: ExternalSummaryBand, bands: OverviewExternalBands): Set<EntityRef> {
  const members = band === 'callers' ? bands.callers : bands.targets;
  return new Set(members.map(entity => entity.entityRef));
}

export function buildExternalSummaryHubEdges(
  input: ExternalSummaryDisplayInput,
  hubNodes: BlueprintRFNode[],
  bands: OverviewExternalBands
): BlueprintRFEdge[] {
  if (hubNodes.length === 0) return [];

  const byId = nodeByEntityRef(input.nodes);
  const internals = internalEntityRefs(input.nodes);
  const deps = collectWorkspaceDependencies(input.schema, input.loadedSystems);
  const callerRefs = bandEntityRefSet('callers', bands);
  const targetRefs = bandEntityRefSet('targets', bands);
  const pairs = computeExternalSummaryEdgePairs(deps, callerRefs, targetRefs, ref =>
    internals.has(ref)
  );
  const hubByBand = new Map(
    hubNodes.map(hub => [hub.data.externalSummaryBand as ExternalSummaryBand, hub])
  );
  const allNodes = [...input.nodes, ...hubNodes];
  const edges: BlueprintRFEdge[] = [];

  for (const pair of pairs) {
    const hub = hubByBand.get(pair.band);
    const internal = byId.get(pair.internalRef);
    if (!hub || !internal) continue;

    const source = pair.band === 'callers' ? hub : internal;
    const target = pair.band === 'callers' ? internal : hub;
    const handles = getClosestHandles(source, target, allNodes);
    const stroke = pair.band === 'callers' ? '#38bdf8' : '#22d3ee';
    edges.push({
      id: `${EXTERNAL_SUMMARY_HUB_EDGE_PREFIX}${pair.band}-${pair.internalRef}`,
      source: source.id,
      target: target.id,
      sourceHandle: handles.sourceHandle,
      targetHandle: handles.targetHandle,
      type: 'default',
      animated: false,
      markerEnd: dependencyArrowMarker(stroke),
      selectable: false,
      focusable: false,
      data: {
        type: 'direct-call',
        description: 'external summary',
        externalSummary: true,
      },
      style: {
        stroke,
        strokeWidth: 2,
        strokeDasharray: pair.band === 'callers' ? '4 4' : undefined,
      },
    });
  }

  return edges;
}

export function stripExternalIndividualEdges(
  edges: BlueprintRFEdge[],
  nodes: BlueprintRFNode[],
  hiddenExternalRefs: Set<EntityRef>
): BlueprintRFEdge[] {
  if (hiddenExternalRefs.size === 0) return edges;

  const externalIds = new Set(
    nodes
      .filter(node => {
        if (!node.data.external) return false;
        const ref = (node.data.entityRef ?? node.id) as EntityRef;
        return hiddenExternalRefs.has(ref);
      })
      .map(node => node.id)
  );

  return edges.filter(edge => !externalIds.has(edge.source) && !externalIds.has(edge.target));
}

export function hiddenOverviewExternalRefs(
  nodes: BlueprintRFNode[],
  visibleExternalRefs: Set<EntityRef> | null
): Set<EntityRef> {
  if (visibleExternalRefs === null) return new Set();
  const hidden = new Set<EntityRef>();
  for (const node of nodes) {
    if (!node.data.external || node.data.couplingGhost) continue;
    const ref = (node.data.entityRef ?? node.id) as EntityRef;
    if (!visibleExternalRefs.has(ref)) hidden.add(ref);
  }
  return hidden;
}
