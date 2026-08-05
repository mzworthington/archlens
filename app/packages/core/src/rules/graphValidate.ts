import type {
  SystemSchema,
  SystemDependency,
  ValidationResult,
  ValidationIssue,
} from '../models/schema';
import { classifyCycle, findSimpleCycles } from './dependencyCycles';

/** Keep first edge per from→to pair (duplicate ids break React Flow / canvas perf). */
export function dedupeDependencies(deps: SystemDependency[]): SystemDependency[] {
  const seen = new Set<string>();
  const out: SystemDependency[] = [];
  for (const dep of deps) {
    const key = `${dep.from}\0${dep.to}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(dep);
  }
  return out;
}

export type ValidateGraphOptions = {
  /**
   * Which dependency cycles fail validation.
   * - `actionable` (default): non-external `direct-call` loops only (aligned with architecture health)
   * - `all`: every simple cycle, including external-proxy / non-direct-call coupling
   */
  cycles?: 'actionable' | 'all';
};

/**
 * Validates the node dependency graph for cycles and other logic constraints.
 * Cycle discovery is shared with architecture health (`findSimpleCycles`).
 */
export function validateGraph(
  schema: SystemSchema,
  options: ValidateGraphOptions = {}
): ValidationResult {
  const cycleMode = options.cycles ?? 'actionable';
  const issues: ValidationIssue[] = [];
  const localNodeRefs = new Set(schema.nodes.map(node => node.entityRef || ''));

  for (const dep of schema.dependencies) {
    if (!localNodeRefs.has(dep.from)) {
      issues.push({
        type: 'invalid-connection',
        message: `Dependency source node "${dep.from}" does not exist.`,
      });
      continue;
    }
    if (!localNodeRefs.has(dep.to)) {
      issues.push({
        type: 'invalid-connection',
        message: `Dependency target node "${dep.to}" does not exist.`,
      });
    }
  }

  const cycles = findSimpleCycles(schema);
  for (const path of cycles) {
    const { severity } = classifyCycle(schema, path);
    if (cycleMode === 'actionable' && severity !== 'actionable') continue;
    issues.push({
      type: 'cycle',
      message: `Circular dependency detected: ${path.join(' ➔ ')}`,
      path,
    });
  }

  return {
    isValid: issues.length === 0,
    issues,
  };
}
