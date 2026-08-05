import { slugify } from '@archlens/core';
import { resolveProductHubDisplayName } from '../entityRefContext.ts';
import { titleCase } from './helpers.ts';
import type { DiscoveredSystem } from './types.ts';

/**
 * Attach a product hub when multiple subsystems are found so the context diagram
 * can fan spokes into one product node (e.g. Backstage ← packages/plugins/microsite).
 */
export function productHubLabel(productName: string): string {
  const productId = slugify(productName);
  return resolveProductHubDisplayName(productId, titleCase(productName));
}

export function withProductHub(
  systems: DiscoveredSystem[],
  productName: string
): DiscoveredSystem[] {
  if (systems.length === 0) return systems;

  const productId = slugify(productName);
  if (systems.length === 1 && (systems[0].kind === 'fallback' || systems[0].id === productId)) {
    return [
      {
        ...systems[0],
        id: productId,
        displayName: productHubLabel(productName),
        productId,
        kind: systems[0].kind === 'fallback' ? 'fallback' : 'product',
      },
    ];
  }

  const children = systems.filter(s => s.id !== productId);
  const hub: DiscoveredSystem = {
    id: productId,
    displayName: productHubLabel(productName),
    rootPath: '',
    kind: 'product',
    productId,
  };

  return [
    hub,
    ...children.map(s => ({
      ...s,
      productId,
    })),
  ];
}
