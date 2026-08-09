import { slugify } from '@archlens/core';
import { STANDALONE_DENYLIST, titleCase } from '../helpers.ts';
import type { DiscoveredSystem, SystemDiscoveryFs } from '../types.ts';

/**
 * Discover top-level packages that are not already covered by workspace roots.
 */
export function discoverStandaloneSystems(
  cwd: string,
  fs: SystemDiscoveryFs,
  existingRootPaths: string[]
): DiscoveredSystem[] {
  const rootNames = new Set(existingRootPaths.map(r => r.toLowerCase()));
  const systems: DiscoveredSystem[] = [];

  for (const entry of fs.listDirectoryNames(cwd)) {
    if (STANDALONE_DENYLIST.has(entry.toLowerCase())) continue;
    if (rootNames.has(entry.toLowerCase())) continue;
    if (entry.startsWith('.')) continue;

    const absDir = fs.getAbsolutePath(cwd, entry);
    const pkgJson = fs.getAbsolutePath(absDir, 'package.json');
    if (!fs.exists(pkgJson)) continue;

    systems.push({
      id: slugify(entry),
      displayName: titleCase(entry),
      rootPath: entry,
      kind: 'standalone',
      productId: slugify(entry),
    });
  }

  return systems;
}
