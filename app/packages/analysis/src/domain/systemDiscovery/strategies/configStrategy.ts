import { slugify } from '@archlens/core';
import { titleCase } from '../helpers.ts';
import type { DiscoveredSystem } from '../types.ts';

/** Pin the scan to a single named software system (multi-repo products). */
export function discoverNamedSystem(systemName: string, productName: string): DiscoveredSystem[] {
  const id = slugify(systemName);
  return [
    {
      id,
      displayName: titleCase(systemName),
      rootPath: '',
      kind: 'config',
      productId: slugify(productName),
    },
  ];
}

/** Config override (`systems`) when provided. */
export function discoverConfiguredSystems(systems: string[]): DiscoveredSystem[] {
  return systems.map(name => {
    const id = slugify(name);
    return {
      id,
      displayName: titleCase(name),
      rootPath: name.replace(/\\/g, '/').replace(/^\.\//, '').replace(/\/$/, ''),
      kind: 'config' as const,
      productId: id,
    };
  });
}
