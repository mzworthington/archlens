import type { DependencyType, SystemNode, SystemSchema } from '../models/schema';
import type { LoadedBlueprintSchema } from './validateBlueprintWorkspace';

export type DependencyCycleSeverity = 'actionable' | 'informational';

export type DependencyCycleReason =
  'module-direct-call' | 'includes-external-proxy' | 'non-direct-call-edges';

export type DetectedDependencyCycle = {
  path: string[];
  file: string;
  severity: DependencyCycleSeverity;
  reason: DependencyCycleReason;
  /** Stable key for estate dedupe (rotation-normalized node set order). */
  key: string;
};

export type CollectDependencyCyclesResult = {
  actionable: DetectedDependencyCycle[];
  informational: DetectedDependencyCycle[];
};

const ACTIONABLE_EDGE_TYPES: ReadonlySet<DependencyType> = new Set(['direct-call']);

/** Canonical key: lexicographically smallest rotation of the cycle’s unique nodes. */
export function canonicalCycleKey(path: string[]): string {
  const nodes =
    path.length > 1 && path[0] === path[path.length - 1] ? path.slice(0, -1) : [...path];
  if (nodes.length === 0) return '';
  if (nodes.length === 1) return nodes[0]!;

  let best = nodes;
  for (let i = 1; i < nodes.length; i++) {
    const rotated = [...nodes.slice(i), ...nodes.slice(0, i)];
    if (rotated.join('\0') < best.join('\0')) best = rotated;
  }
  return best.join('>');
}

function closePath(path: string[]): string[] {
  if (path.length === 0) return path;
  if (path[0] === path[path.length - 1]) return path;
  return [...path, path[0]!];
}

/**
 * Find simple directed cycles on a diagram using only edges that pass `includeEdge`.
 * Returns closed paths (first node repeated at the end), deduped within the diagram.
 */
export function findSimpleCycles(
  schema: SystemSchema,
  includeEdge: (from: SystemNode, to: SystemNode, type: DependencyType) => boolean = () => true
): string[][] {
  const nodesByRef = new Map(schema.nodes.map(node => [node.entityRef, node]));
  const adj = new Map<string, string[]>();

  for (const node of schema.nodes) {
    adj.set(node.entityRef, []);
  }

  for (const dep of schema.dependencies) {
    const from = nodesByRef.get(dep.from);
    const to = nodesByRef.get(dep.to);
    if (!from || !to) continue;
    if (!includeEdge(from, to, dep.type)) continue;
    adj.get(dep.from)!.push(dep.to);
  }

  const cycles: string[][] = [];
  const seenKeys = new Set<string>();

  function record(path: string[]): void {
    const closed = closePath(path);
    const key = canonicalCycleKey(closed);
    if (seenKeys.has(key)) return;
    seenKeys.add(key);
    cycles.push(closed);
  }

  function dfs(start: string, node: string, stack: string[], inStack: Set<string>): void {
    stack.push(node);
    inStack.add(node);

    for (const neighbor of adj.get(node) ?? []) {
      if (neighbor === start) {
        record(stack);
        continue;
      }
      if (inStack.has(neighbor)) continue;
      dfs(start, neighbor, stack, inStack);
    }

    stack.pop();
    inStack.delete(node);
  }

  for (const start of adj.keys()) {
    dfs(start, start, [], new Set());
  }

  return cycles;
}

function classifyCycle(
  schema: SystemSchema,
  path: string[]
): { severity: DependencyCycleSeverity; reason: DependencyCycleReason } {
  const nodesByRef = new Map(schema.nodes.map(node => [node.entityRef, node]));
  const unique =
    path.length > 1 && path[0] === path[path.length - 1] ? path.slice(0, -1) : [...path];

  for (const ref of unique) {
    if (nodesByRef.get(ref)?.external) {
      return { severity: 'informational', reason: 'includes-external-proxy' };
    }
  }

  const edgeTypes = new Set<DependencyType>();
  for (let i = 0; i < unique.length; i++) {
    const from = unique[i]!;
    const to = unique[(i + 1) % unique.length]!;
    for (const dep of schema.dependencies) {
      if (dep.from === from && dep.to === to) edgeTypes.add(dep.type);
    }
  }

  for (const type of edgeTypes) {
    if (!ACTIONABLE_EDGE_TYPES.has(type)) {
      return { severity: 'informational', reason: 'non-direct-call-edges' };
    }
  }

  return { severity: 'actionable', reason: 'module-direct-call' };
}

/**
 * Collect estate dependency cycles: actionable module direct-call loops vs informational
 * (external proxies / non-direct-call edges). Dedupes identical cycles across diagrams.
 */
export function collectDependencyCycles(
  files: LoadedBlueprintSchema[]
): CollectDependencyCyclesResult {
  const byKey = new Map<string, DetectedDependencyCycle>();

  for (const file of files) {
    const paths = findSimpleCycles(file.schema);
    for (const path of paths) {
      const { severity, reason } = classifyCycle(file.schema, path);
      const key = canonicalCycleKey(path);
      const existing = byKey.get(key);
      if (existing) {
        if (existing.severity === 'informational' && severity === 'actionable') {
          byKey.set(key, { path, file: file.path, severity, reason, key });
        }
        continue;
      }
      byKey.set(key, { path, file: file.path, severity, reason, key });
    }
  }

  const actionable: DetectedDependencyCycle[] = [];
  const informational: DetectedDependencyCycle[] = [];
  for (const cycle of byKey.values()) {
    if (cycle.severity === 'actionable') actionable.push(cycle);
    else informational.push(cycle);
  }

  return { actionable, informational };
}
