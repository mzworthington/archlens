import type { SystemNode } from '../models/schema';

export const THIRD_PARTY_CLASSIFICATION = 'third-party';

/** Human actors (C4 persons, product personas) — never implementation advice targets. */
export function isHumanActorNode(node: Pick<SystemNode, 'type' | 'properties'>): boolean {
  if (node.type === 'person') return true;
  return node.properties?.role === 'product-persona';
}

/** Vendor or SaaS outside your control — observable in simulation, not safeguard targets. */
export function isThirdPartyNode(node: Pick<SystemNode, 'properties'>): boolean {
  return node.properties?.classification === THIRD_PARTY_CLASSIFICATION;
}

/** Workspace proxy homed on another diagram (dashed border), still callable from your code. */
export function isWorkspaceProxyNode(node: Pick<SystemNode, 'external' | 'properties'>): boolean {
  return Boolean(node.external) && !isThirdPartyNode(node);
}

export type ExternalNodeKind = 'workspace-proxy' | 'third-party';

export function resolveExternalNodeKind(
  node: Pick<SystemNode, 'external' | 'properties'>
): ExternalNodeKind | null {
  if (!node.external) return null;
  if (isThirdPartyNode(node)) return 'third-party';
  return 'workspace-proxy';
}

export function externalNodeBadgeLabel(kind: ExternalNodeKind): string {
  switch (kind) {
    case 'third-party':
      return '(Third-party)';
    case 'workspace-proxy':
      return '(Workspace)';
  }
}
