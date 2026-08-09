import type { DiscoveredSystem } from './types.ts';

/** Assign each source file to the best matching system (longest rootPath prefix wins). */
export function partitionFilesBySystem<T extends { relativePath: string }>(
  files: T[],
  systems: DiscoveredSystem[]
): Map<string, T[]> {
  const sorted = [...systems].sort((a, b) => b.rootPath.length - a.rootPath.length);
  const buckets = new Map<string, T[]>();
  for (const system of systems) {
    buckets.set(system.id, []);
  }

  // Prefer the named repo system for unmatched files; product hubs are context-only.
  const fallback =
    systems.find(s => s.rootPath === '' && s.kind === 'config') ||
    systems.find(s => s.kind === 'fallback') ||
    systems.find(s => s.rootPath === '' && s.kind === 'product') ||
    systems.find(s => s.rootPath === '') ||
    systems[0];

  for (const file of files) {
    const rel = file.relativePath.replace(/\\/g, '/');
    let matched = fallback;
    for (const system of sorted) {
      if (!system.rootPath) continue;
      if (rel === system.rootPath || rel.startsWith(`${system.rootPath}/`)) {
        matched = system;
        break;
      }
    }
    buckets.get(matched.id)!.push(file);
  }

  return buckets;
}

/** Resolve which product group owns a repo-relative path (same rules as code file partitioning). */
export function resolveProductIdForPath(relativePath: string, systems: DiscoveredSystem[]): string {
  if (systems.length === 0) return 'infrastructure';

  const normalized = relativePath.replace(/\\/g, '/');
  const buckets = partitionFilesBySystem([{ relativePath: normalized }], systems);
  const matched = systems.find(s => (buckets.get(s.id)?.length ?? 0) > 0);
  return matched?.productId ?? systems[0]!.productId;
}
