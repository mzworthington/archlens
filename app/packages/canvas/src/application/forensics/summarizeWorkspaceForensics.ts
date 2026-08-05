import type { C4Level, SystemNode } from '@archlens/core';
import { entityRefMatchesEntityScope, type LoadedSystemRef } from './rankOffenders';

export type { LoadedSystemRef };

export type WorkspaceComplexitySummary = {
  /** Loaded blueprint diagrams in the workspace session. */
  diagramCount: number;
  /** Unique node entityRefs across loaded diagrams. */
  nodeCount: number;
  /** Dependency edges across loaded diagrams (not deduped across diagrams). */
  dependencyCount: number;
  /** Unique nodes that carry TraceLens / forensics blocks. */
  nodesWithForensics: number;
  /** Sum of LOC on preferred (deepest) forensics nodes. */
  totalLoc: number;
  /** Sum of SLOC on preferred forensics nodes. */
  totalSloc: number;
  /** Highest cyclomatic complexity among preferred forensics nodes. */
  maxComplexity: number;
  /** Mean complexity among preferred nodes that report complexity. */
  avgComplexity: number | null;
  /** Nodes classified as hotspots (or with hotspotCount > 0). */
  hotspotNodes: number;
  /** Nodes classified as knowledge silos (or with knowledgeSiloCount > 0). */
  knowledgeSiloNodes: number;
  /**
   * Approximate scanned-file coverage: sum of `fileCount` on rollups, else 1 per
   * leaf forensics node that reports LOC/SLOC.
   */
  fileCount: number;
};

export type SummarizeWorkspaceForensicsOptions = {
  /** When set, metrics cover only the entity subtree (same rules as TraceLens scope). */
  scopeEntityRef?: string | null;
};

const LEVEL_RANK: Record<C4Level, number> = {
  code: 4,
  component: 3,
  container: 2,
  context: 1,
};

type PreferredNode = {
  node: SystemNode;
  level: C4Level;
};

function hasForensics(node: SystemNode): boolean {
  return node.forensics != null;
}

function preferNode(existing: PreferredNode | undefined, next: PreferredNode): PreferredNode {
  if (!existing) return next;
  const existingRank = LEVEL_RANK[existing.level] ?? 0;
  const nextRank = LEVEL_RANK[next.level] ?? 0;
  if (nextRank > existingRank) return next;
  if (nextRank < existingRank) return existing;
  // Same level: keep the richer forensics payload (higher loc / complexity).
  const existingLoc = existing.node.forensics?.loc ?? 0;
  const nextLoc = next.node.forensics?.loc ?? 0;
  if (nextLoc > existingLoc) return next;
  const existingComplexity = existing.node.forensics?.complexity ?? 0;
  const nextComplexity = next.node.forensics?.complexity ?? 0;
  if (nextComplexity > existingComplexity) return next;
  return existing;
}

function diagramEntityRefOf(system: LoadedSystemRef): string {
  return system.schema.entityRef || system.schema.name || system.path;
}

/**
 * Estate-level complexity snapshot for the loaded workspace (per-repo view).
 * Dedupes nodes by entityRef, preferring component > container > context so
 * rolled-up parents do not double-count child LOC when both are loaded.
 * Optional entity scope mirrors TraceLens offender filtering.
 */
export function summarizeWorkspaceForensics(
  systems: readonly LoadedSystemRef[],
  options?: SummarizeWorkspaceForensicsOptions
): WorkspaceComplexitySummary {
  const scopeEntityRef = options?.scopeEntityRef?.trim() || null;
  const preferred = new Map<string, PreferredNode>();
  const diagramsWithScopedNodes = new Set<string>();

  for (const system of systems) {
    const diagramEntityRef = diagramEntityRefOf(system);
    for (const node of system.schema.nodes) {
      if (!node.entityRef) continue;
      if (
        scopeEntityRef &&
        !entityRefMatchesEntityScope(node.entityRef, scopeEntityRef, systems, diagramEntityRef)
      ) {
        continue;
      }
      preferred.set(
        node.entityRef,
        preferNode(preferred.get(node.entityRef), {
          node,
          level: system.schema.level,
        })
      );
      diagramsWithScopedNodes.add(system.path);
    }
  }

  let dependencyCount = 0;
  for (const system of systems) {
    for (const dep of system.schema.dependencies ?? []) {
      if (!scopeEntityRef) {
        dependencyCount += 1;
        continue;
      }
      if (preferred.has(dep.from) && preferred.has(dep.to)) {
        dependencyCount += 1;
      }
    }
  }

  let nodesWithForensics = 0;
  let totalLoc = 0;
  let totalSloc = 0;
  let maxComplexity = 0;
  let complexitySum = 0;
  let complexitySamples = 0;
  let hotspotNodes = 0;
  let knowledgeSiloNodes = 0;
  let fileCount = 0;

  for (const { node } of preferred.values()) {
    if (!hasForensics(node)) continue;
    nodesWithForensics += 1;
    const f = node.forensics!;

    if (f.loc != null) totalLoc += f.loc;
    if (f.sloc != null) totalSloc += f.sloc;

    if (f.complexity != null) {
      complexitySum += f.complexity;
      complexitySamples += 1;
      if (f.complexity > maxComplexity) maxComplexity = f.complexity;
    }

    const isHotspot =
      (f.hotspotCount ?? 0) > 0 || (f.classifications?.includes('hotspot') ?? false);
    const isSilo =
      (f.knowledgeSiloCount ?? 0) > 0 || (f.classifications?.includes('knowledge-silo') ?? false);
    if (isHotspot) hotspotNodes += 1;
    if (isSilo) knowledgeSiloNodes += 1;

    if (f.fileCount != null && f.fileCount > 0) {
      fileCount += f.fileCount;
    } else if (f.loc != null || f.sloc != null) {
      fileCount += 1;
    }
  }

  return {
    diagramCount: scopeEntityRef ? diagramsWithScopedNodes.size : systems.length,
    nodeCount: preferred.size,
    dependencyCount,
    nodesWithForensics,
    totalLoc,
    totalSloc,
    maxComplexity,
    avgComplexity: complexitySamples > 0 ? Math.round(complexitySum / complexitySamples) : null,
    hotspotNodes,
    knowledgeSiloNodes,
    fileCount,
  };
}
