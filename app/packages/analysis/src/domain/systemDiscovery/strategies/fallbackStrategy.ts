import { slugify } from '@archlens/core';
import { productHubLabel } from '../productHub';
import type { DiscoveredSystem } from '../types';

/** Fallback single product system when nothing is detected. */
export function discoverFallbackSystem(productName: string): DiscoveredSystem[] {
  const fallbackId = slugify(productName);
  return [
    {
      id: fallbackId,
      displayName: productHubLabel(productName),
      rootPath: '',
      kind: 'fallback',
      productId: fallbackId,
    },
  ];
}
