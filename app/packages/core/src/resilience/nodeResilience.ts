import type { NodeResilience, SystemNode } from '../models/schema';
import type { NodeSafeguards } from './faultSpec';

const SAFEGUARD_KEYS: (keyof NodeSafeguards)[] = [
  'circuitBreaker',
  'bulkhead',
  'retry',
  'localCache',
];

export const SAFEGUARD_KEY_ORDER: (keyof NodeSafeguards)[] = [...SAFEGUARD_KEYS];

export const SAFEGUARD_SHORT_LABELS: Record<keyof NodeSafeguards, string> = {
  circuitBreaker: 'CB',
  bulkhead: 'BH',
  retry: 'RT',
  localCache: 'LC',
};

export function hasActiveSafeguards(safeguards: NodeSafeguards): boolean {
  return SAFEGUARD_KEYS.some(key => safeguards[key]);
}

function normalizeSafeguards(raw?: NodeResilience): NodeSafeguards {
  const active: NodeSafeguards = {};
  if (!raw) return active;
  for (const key of SAFEGUARD_KEYS) {
    if (raw[key]) active[key] = true;
  }
  return active;
}

/** Read safeguards from top-level `node.resilience`. */
export function resolveNodeResilience(node?: Pick<SystemNode, 'resilience'>): NodeSafeguards {
  return normalizeSafeguards(node?.resilience);
}

/** Serialize enabled safeguards to top-level `node.resilience`. */
export function formatNodeResilience(safeguards: NodeSafeguards): NodeResilience | undefined {
  const active = normalizeSafeguards(safeguards);
  if (Object.keys(active).length === 0) return undefined;
  return active;
}

export function applySafeguardToggle(
  current: NodeSafeguards,
  key: keyof NodeSafeguards,
  enabled: boolean
): NodeSafeguards {
  const next = { ...current };
  if (enabled) {
    next[key] = true;
  } else {
    delete next[key];
  }
  return next;
}

export function mergeNodeSafeguards(
  persisted: NodeSafeguards,
  session?: NodeSafeguards
): NodeSafeguards {
  return { ...persisted, ...session };
}

/** Apply safeguard toggles to top-level `node.resilience`. */
export function applyResilienceToNode(safeguards: NodeSafeguards): Pick<SystemNode, 'resilience'> {
  return {
    resilience: formatNodeResilience(safeguards),
  };
}
