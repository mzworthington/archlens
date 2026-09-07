import { readPackageName } from './helpers';
import { withProductHub } from './productHub';
import { discoverConfiguredSystems, discoverNamedSystem } from './strategies/configStrategy';
import { discoverFallbackSystem } from './strategies/fallbackStrategy';
import { discoverStandaloneSystems } from './strategies/standaloneStrategy';
import { discoverWorkspaceSystems } from './strategies/workspaceStrategy';
import type { DiscoveredSystem, DiscoverSystemsOptions, SystemDiscoveryFs } from './types';

/**
 * Discover navigable software systems for a complex monorepo.
 *
 * 1. Config override (`systems`) when provided - still wrapped with a product hub
 * 2. Workspace roots + standalone packages + product hub
 * 3. Fallback single product system when nothing is detected
 */
export function discoverSystems(
  cwd: string,
  fs: SystemDiscoveryFs,
  options: DiscoverSystemsOptions = {}
): DiscoveredSystem[] {
  const productName =
    options.productName ||
    readPackageName(cwd, fs) ||
    options.fallbackId ||
    cwd.split(/[\\/]/).filter(Boolean).pop() ||
    'app';

  const trimmedSystemName = options.systemName?.trim();
  if (trimmedSystemName) {
    return withProductHub(discoverNamedSystem(trimmedSystemName, productName), productName);
  }

  if (options.systems && options.systems.length > 0) {
    return withProductHub(discoverConfiguredSystems(options.systems), productName);
  }

  const systems: DiscoveredSystem[] = discoverWorkspaceSystems(cwd, fs);
  systems.push(
    ...discoverStandaloneSystems(
      cwd,
      fs,
      systems.map(s => s.rootPath)
    )
  );

  if (systems.length === 0) {
    return discoverFallbackSystem(productName);
  }

  return withProductHub(systems, productName);
}
