import { EntityRef } from '@archlens/core';

/** Human-readable context diagram titles keyed by --context / entityRef slug. */
export const CONTEXT_DISPLAY_NAMES: Record<string, string> = {
  application: 'Application',
  blueprint: 'Blueprint',
  backstage: 'Backstage',
  eshop: 'E-Shop',
  infrastructure: 'Infrastructure Examples',
  'golden-paths': 'Golden Paths',
  'chaoslens-stress': 'ChaosLens Stress Tests',
  'advicelens-stress': 'AdviceLens Stress Tests',
};

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
 * Avoids `eshop/eshop` when the discovered system id matches the context root.
 */
export function resolveSystemEntityRef(contextName: string, systemId: string): string {
  const contextRef = EntityRef.parse(contextName);
  const normalizedSystemId = EntityRef.parse(systemId);
  if (normalizedSystemId === contextRef) {
    return contextRef;
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
