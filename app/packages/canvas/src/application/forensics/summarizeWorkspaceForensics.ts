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

function preferredNodeRank(entry: PreferredNode): number[] {
  return [
    LEVEL_RANK[entry.level] ?? 0,
    entry.node.forensics?.loc ?? 0,
    entry.node.forensics?.complexity ?? 0,
  ];
}

function preferNode(existing: PreferredNode | undefined, next: PreferredNode): PreferredNode {
  if (!existing) return next;
  const existingKeys = preferredNodeRank(existing);
  const nextKeys = preferredNodeRank(next);
  for (let i = 0; i < existingKeys.length; i++) {
    if (nextKeys[i]! > existingKeys[i]!) return next;
    if (nextKeys[i]! < existingKeys[i]!) return existing;
  }
  return existing;
}

function diagramEntityRefOf(system: LoadedSystemRef): string {
  return system.schema.entityRef || system.schema.name || system.path;
}

function collectPreferredNodes(
  systems: readonly LoadedSystemRef[],
  scopeEntityRef: string | null
): {
  preferred: Map<string, PreferredNode>;
  diagramsWithScopedNodes: Set<string>;
} {
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

  return { preferred, diagramsWithScopedNodes };
}

function countScopedDependencies(
  systems: readonly LoadedSystemRef[],
  preferred: Map<string, PreferredNode>,
  scopeEntityRef: string | null
): number {
  let dependencyCount = 0;
  for (const system of systems) {
    for (const dep of system.schema.dependencies ?? []) {
      if (!scopeEntityRef || (preferred.has(dep.from) && preferred.has(dep.to))) {
        dependencyCount += 1;
      }
    }
  }
  return dependencyCount;
}

function isClassified(
  forensics: NonNullable<SystemNode['forensics']>,
  classification: 'hotspot' | 'knowledge-silo',
  count: number | undefined
): boolean {
  return (count ?? 0) > 0 || (forensics.classifications?.includes(classification) ?? false);
}

function fileCountContribution(forensics: NonNullable<SystemNode['forensics']>): number {
  if (forensics.fileCount != null && forensics.fileCount > 0) return forensics.fileCount;
  if (forensics.loc != null || forensics.sloc != null) return 1;
  return 0;
}

function aggregateForensicsMetrics(
  preferred: Map<string, PreferredNode>
): Omit<WorkspaceComplexitySummary, 'diagramCount' | 'nodeCount' | 'dependencyCount'> {
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
    const forensics = node.forensics!;

    totalLoc += forensics.loc ?? 0;
    totalSloc += forensics.sloc ?? 0;

    if (forensics.complexity != null) {
      complexitySum += forensics.complexity;
      complexitySamples += 1;
      maxComplexity = Math.max(maxComplexity, forensics.complexity);
    }

    if (isClassified(forensics, 'hotspot', forensics.hotspotCount)) hotspotNodes += 1;
    if (isClassified(forensics, 'knowledge-silo', forensics.knowledgeSiloCount)) {
      knowledgeSiloNodes += 1;
    }
    fileCount += fileCountContribution(forensics);
  }

  return {
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
  const { preferred, diagramsWithScopedNodes } = collectPreferredNodes(systems, scopeEntityRef);

  return {
    diagramCount: scopeEntityRef ? diagramsWithScopedNodes.size : systems.length,
    nodeCount: preferred.size,
    dependencyCount: countScopedDependencies(systems, preferred, scopeEntityRef),
    ...aggregateForensicsMetrics(preferred),
  };
}
