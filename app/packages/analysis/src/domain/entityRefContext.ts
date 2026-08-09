import { CONTEXT_MATCHING_SYSTEM_LEAF, EntityRef } from '@archlens/core';

export { CONTEXT_MATCHING_SYSTEM_LEAF };

/** Human-readable context diagram titles keyed by --context / entityRef slug. */
export const CONTEXT_DISPLAY_NAMES: Record<string, string> = {
  application: 'Application',
  blueprint: 'ArchLens',
  backstage: 'Backstage',
  eshop: 'E-Shop',
  infrastructure: 'Infrastructure Examples',
  samples: 'Samples',
  'chaoslens-stress': 'ChaosLens Stress Tests',
  'advicelens-stress': 'AdviceLens Stress Tests',
};

/** Curated product hub labels on context diagrams (e.g. Pulumi example family). */
export const PRODUCT_HUB_DISPLAY_NAMES: Record<string, string> = {
  archlens: 'ArchLens',
  helloworld: 'Pulumi Examples',
};

export function resolveProductHubDisplayName(productId: string, fallback?: string): string {
  const slug = EntityRef.parse(productId);
  if (PRODUCT_HUB_DISPLAY_NAMES[slug]) return PRODUCT_HUB_DISPLAY_NAMES[slug]!;
  return fallback ?? resolveContextDisplayName(slug);
}

export function resolveContextDisplayName(contextName: string): string {
  const slug = EntityRef.parse(contextName);
  if (CONTEXT_DISPLAY_NAMES[slug]) return CONTEXT_DISPLAY_NAMES[slug]!;
  return slug
    .split('-')
    .filter(Boolean)
    .map(part => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

/**
 * System-level entityRef for container/component diagrams.
 * When the discovered system id matches the context root, nest under a stable
 * `system` leaf so the context diagram and containers never share one entityRef
 * (ADR-0002: one ref → one diagram; Zoom = navigate to the node ref).
 */
export function resolveSystemEntityRef(contextName: string, systemId: string): string {
  const contextRef = EntityRef.parse(contextName);
  const normalizedSystemId = EntityRef.parse(systemId);
  if (normalizedSystemId === contextRef) {
    return EntityRef.child(contextRef, CONTEXT_MATCHING_SYSTEM_LEAF);
  }
  return EntityRef.child(contextRef, systemId);
}

/** Disk path under blueprints/ for a system's container + component YAML. */
export function resolveBlueprintOutputSegment(contextName: string, systemId: string): string {
  if (EntityRef.parse(contextName) === 'infrastructure') {
    return `infrastructure/${systemId}`;
  }
  return systemId;
}
