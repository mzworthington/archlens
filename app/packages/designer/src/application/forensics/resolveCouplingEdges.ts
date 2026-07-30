import { normalizeWorkspaceFilepath, type WorkspaceFilepathIndex } from '@archlens/core';
import type { BlueprintRFNode } from '../store/layoutUtils';

export const COUPLING_GHOST_PREFIX = 'coupling-ghost-';

export type CouplingPeerResolution = 'canvas' | 'workspace' | 'unmapped';

export interface CouplingEdgeRef {
  sourceId: string;
  targetId: string;
  score: number;
  sharedCommits: number;
  path: string;
  resolution: CouplingPeerResolution;
  entityRef?: string;
  peerName?: string;
}

/** @deprecated Use normalizeWorkspaceFilepath from @archlens/core */
export function normalizeFilepath(path: string): string {
  return normalizeWorkspaceFilepath(path);
}

export function couplingGhostId(path: string, entityRef?: string): string {
  if (entityRef) return `${COUPLING_GHOST_PREFIX}${entityRef}`;
  return `${COUPLING_GHOST_PREFIX}${encodeURIComponent(normalizeWorkspaceFilepath(path))}`;
}

function buildCanvasFilepathIndex(nodes: BlueprintRFNode[]): Map<string, string> {
  const byPath = new Map<string, string>();
  for (const node of nodes) {
    const filepath = node.data.properties?.filepath;
    if (typeof filepath !== 'string' || !filepath) continue;
    byPath.set(normalizeWorkspaceFilepath(filepath), node.id);
  }
  return byPath;
}

function buildCanvasEntityRefIndex(nodes: BlueprintRFNode[]): Map<string, string> {
  const byRef = new Map<string, string>();
  for (const node of nodes) {
    const entityRef = node.data.entityRef;
    if (!entityRef) continue;
    byRef.set(entityRef, node.id);
  }
  return byRef;
}

/**
 * Resolve temporal-coupling peers of the selected node to canvas node ids or ghost ids.
 * Joins `forensics.coupledFiles[].path` → `properties.filepath` on the canvas first,
 * then falls back to the workspace catalog when peers live in another system YAML.
 */
export function resolveCouplingEdges(
  selectedNodeId: string | null | undefined,
  nodes: BlueprintRFNode[],
  workspaceIndex?: WorkspaceFilepathIndex
): CouplingEdgeRef[] {
  if (!selectedNodeId) return [];

  const selected = nodes.find(n => n.id === selectedNodeId);
  const coupled = selected?.data.forensics?.coupledFiles;
  if (!selected || !coupled?.length) return [];

  const byPath = buildCanvasFilepathIndex(nodes);
  const byEntityRef = buildCanvasEntityRefIndex(nodes);

  const edges: CouplingEdgeRef[] = [];
  for (const c of coupled) {
    const normalizedPath = normalizeWorkspaceFilepath(c.path);
    const canvasTargetId = byPath.get(normalizedPath);
    if (canvasTargetId && canvasTargetId !== selectedNodeId) {
      edges.push({
        sourceId: selectedNodeId,
        targetId: canvasTargetId,
        score: c.score,
        sharedCommits: c.sharedCommits,
        path: c.path,
        resolution: 'canvas',
      });
      continue;
    }

    const workspaceEntity = workspaceIndex?.byPath.get(normalizedPath);
    if (workspaceEntity) {
      const onCanvasId = byEntityRef.get(workspaceEntity.entityRef);
      if (onCanvasId && onCanvasId !== selectedNodeId) {
        edges.push({
          sourceId: selectedNodeId,
          targetId: onCanvasId,
          score: c.score,
          sharedCommits: c.sharedCommits,
          path: c.path,
          resolution: 'canvas',
          entityRef: workspaceEntity.entityRef,
          peerName: workspaceEntity.name,
        });
        continue;
      }

      edges.push({
        sourceId: selectedNodeId,
        targetId: couplingGhostId(c.path, workspaceEntity.entityRef),
        score: c.score,
        sharedCommits: c.sharedCommits,
        path: c.path,
        resolution: 'workspace',
        entityRef: workspaceEntity.entityRef,
        peerName: workspaceEntity.name,
      });
      continue;
    }

    if (
      normalizedPath ===
      normalizeWorkspaceFilepath(String(selected.data.properties?.filepath ?? ''))
    ) {
      continue;
    }

    edges.push({
      sourceId: selectedNodeId,
      targetId: couplingGhostId(c.path),
      score: c.score,
      sharedCommits: c.sharedCommits,
      path: c.path,
      resolution: 'unmapped',
    });
  }

  return edges;
}

/** Resolve imported-file peers of the selected node to canvas node ids. */
export function resolveImportPeerPaths(
  selectedNodeId: string | null | undefined,
  nodes: BlueprintRFNode[],
  workspaceIndex?: WorkspaceFilepathIndex
): CouplingEdgeRef[] {
  if (!selectedNodeId) return [];

  const selected = nodes.find(n => n.id === selectedNodeId);
  const imported = selected?.data.forensics?.importedFiles;
  if (!selected || !imported?.length) return [];

  const edges: CouplingEdgeRef[] = [];
  for (const entry of imported) {
    const targetId = findNodeIdByFilepath(entry.path, nodes, workspaceIndex);
    if (!targetId || targetId === selectedNodeId) continue;
    edges.push({
      sourceId: selectedNodeId,
      targetId,
      score: 1,
      sharedCommits: 0,
      path: entry.path,
      resolution: 'canvas',
    });
  }
  return edges;
}

/** Resolve a coupled filepath to a canvas node id, optionally via the workspace catalog. */
export function findNodeIdByFilepath(
  filepath: string,
  nodes: BlueprintRFNode[],
  workspaceIndex?: WorkspaceFilepathIndex
): string | undefined {
  const normalized = normalizeWorkspaceFilepath(filepath);
  for (const node of nodes) {
    const nodePath = node.data.properties?.filepath;
    if (typeof nodePath !== 'string' || !nodePath) continue;
    if (normalizeWorkspaceFilepath(nodePath) === normalized) return node.id;
  }

  const workspaceEntity = workspaceIndex?.byPath.get(normalized);
  if (!workspaceEntity) return undefined;

  for (const node of nodes) {
    if (node.data.entityRef === workspaceEntity.entityRef) return node.id;
  }

  return undefined;
}

/** Count nodes on the diagram that have temporal coupling data. */
export function countCouplingCapableNodes(nodes: BlueprintRFNode[]): number {
  return nodes.filter(n => (n.data.forensics?.coupledFiles?.length ?? 0) > 0).length;
}

/** Same count from schema nodes (authoritative when canvas RF nodes are stale). */
export function countCouplingCapableSchemaNodes(
  nodes: Array<{ forensics?: { coupledFiles?: unknown[] } }>
): number {
  return nodes.filter(n => (n.forensics?.coupledFiles?.length ?? 0) > 0).length;
}

/**
 * Resolve temporal coupling for every node on the canvas (diagram-wide lens).
 * De-duplicates directed source→target pairs.
 */
export function resolveAllCanvasCouplingEdges(
  nodes: BlueprintRFNode[],
  workspaceIndex?: WorkspaceFilepathIndex
): CouplingEdgeRef[] {
  const edges: CouplingEdgeRef[] = [];
  const seen = new Set<string>();

  for (const node of nodes) {
    if (!node.data.forensics?.coupledFiles?.length) continue;
    for (const ref of resolveCouplingEdges(node.id, nodes, workspaceIndex)) {
      const key = `${ref.sourceId}\0${ref.targetId}`;
      if (seen.has(key)) continue;
      seen.add(key);
      edges.push(ref);
    }
  }

  return edges;
}
