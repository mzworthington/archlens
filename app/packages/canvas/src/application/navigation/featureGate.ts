/** localStorage prefix so a flag stays on across tabs. */
const FEATURE_STORAGE_PREFIX = 'archlens.feature.';

const FEATURE_ID_PATTERN = /^[a-z][a-z0-9-]{0,62}$/;

type StorageLike = Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>;

export type FeatureFlagDefinition = {
  id: string;
  label: string;
  description: string;
};

/**
 * Current in-flight flags. Add an id here when a slice is gated; remove when it ships or dies.
 * Live collaboration shipped — catalog is empty until the next gated preview.
 */
export const FEATURE_FLAGS: readonly FeatureFlagDefinition[] = [];

const listeners = new Set<() => void>();

function defaultStorage(): StorageLike | null {
  if (typeof window === 'undefined') return null;
  return window.localStorage ?? null;
}

function isValidFeatureId(flagId: string): boolean {
  return FEATURE_ID_PATTERN.test(flagId);
}

function notifyFeatureFlagListeners(): void {
  for (const listener of listeners) listener();
}

export function featureStorageKey(flagId: string): string {
  return `${FEATURE_STORAGE_PREFIX}${flagId}`;
}

export function subscribeFeatureFlags(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function isFeatureEnabled(
  flagId: string,
  storage: StorageLike | null = defaultStorage()
): boolean {
  if (!isValidFeatureId(flagId)) return false;
  return storage?.getItem(featureStorageKey(flagId)) === '1';
}

export function setFeatureEnabled(
  flagId: string,
  enabled: boolean,
  storage: StorageLike | null = defaultStorage()
): void {
  if (!isValidFeatureId(flagId)) return;
  if (enabled) {
    storage?.setItem(featureStorageKey(flagId), '1');
  } else {
    storage?.removeItem(featureStorageKey(flagId));
  }
  notifyFeatureFlagListeners();
}
