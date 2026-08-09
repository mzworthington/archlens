import { slugify } from '@archlens/core';
import { readWorkspaceGlobs, titleCase, workspaceRootsFromGlobs } from '../helpers.ts';
import type { DiscoveredSystem, SystemDiscoveryFs } from '../types.ts';

/** Discover systems from npm/pnpm workspace roots. */
export function discoverWorkspaceSystems(cwd: string, fs: SystemDiscoveryFs): DiscoveredSystem[] {
  const workspaceGlobs = readWorkspaceGlobs(cwd, fs);
  const roots = workspaceRootsFromGlobs(workspaceGlobs);
  return roots.map(root => ({
    id: slugify(root),
    displayName: titleCase(root),
    rootPath: root,
    kind: 'workspace' as const,
    productId: slugify(root),
  }));
}
