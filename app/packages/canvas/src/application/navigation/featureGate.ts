/** Query prefix: `?feature-<id>=true` enables a flag for this origin. */
const FEATURE_QUERY_PREFIX = 'feature-';

/** localStorage prefix so a flag stays on across tabs after the query is dropped. */
const FEATURE_STORAGE_PREFIX = 'archlens.feature.';

/** Current in-flight flags. Add an id here when a slice is gated; remove when it ships or dies. */
export const COLLABORATION_FEATURE = 'collaboration';

const UNLOCK_VALUES = new Set(['1', 'true', 'yes']);
const LOCK_VALUES = new Set(['0', 'false', 'no']);
const FEATURE_ID_PATTERN = /^[a-z][a-z0-9-]{0,62}$/;

type StorageLike = Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>;

function queryFromSearch(search: string): URLSearchParams {
  return new URLSearchParams(search.startsWith('?') ? search.slice(1) : search);
}

function defaultStorage(): StorageLike | null {
  if (typeof window === 'undefined') return null;
  return window.localStorage ?? null;
}

function isValidFeatureId(flagId: string): boolean {
  return FEATURE_ID_PATTERN.test(flagId);
}

export function featureQueryParam(flagId: string): string {
  return `${FEATURE_QUERY_PREFIX}${flagId}`;
}

export function featureStorageKey(flagId: string): string {
  return `${FEATURE_STORAGE_PREFIX}${flagId}`;
}

function applyQueryValue(flagId: string, raw: string, storage: StorageLike | null): boolean | null {
  const normalized = raw.toLowerCase();
  if (UNLOCK_VALUES.has(normalized)) {
    storage?.setItem(featureStorageKey(flagId), '1');
    return true;
  }
  if (LOCK_VALUES.has(normalized)) {
    storage?.removeItem(featureStorageKey(flagId));
    return false;
  }
  return null;
}

/**
 * Latch every `feature-*` query param into localStorage (SteerCo `siteGate` pattern, per flag).
 * Call once from the app shell so flags persist after in-app navigation drops the query.
 */
export function latchFeaturesFromSearch(
  search: string,
  storage: StorageLike | null = defaultStorage()
): void {
  for (const [key, value] of queryFromSearch(search)) {
    if (!key.startsWith(FEATURE_QUERY_PREFIX)) continue;
    const flagId = key.slice(FEATURE_QUERY_PREFIX.length);
    if (!isValidFeatureId(flagId)) continue;
    applyQueryValue(flagId, value, storage);
  }
}

/**
 * `true` / `1` / `yes` persist; `false` / `0` / `no` clear. Absent query uses storage.
 */
export function isFeatureEnabled(
  flagId: string,
  search: string = typeof window !== 'undefined' ? window.location.search : '',
  storage: StorageLike | null = defaultStorage()
): boolean {
  if (!isValidFeatureId(flagId)) return false;
  const raw = queryFromSearch(search).get(featureQueryParam(flagId));
  if (raw !== null) {
    const latched = applyQueryValue(flagId, raw, storage);
    if (latched !== null) return latched;
  }
  return storage?.getItem(featureStorageKey(flagId)) === '1';
}

/** Ensure a share / deep link also unlocks this flag in a fresh browser. */
export function withFeatureQuery(search: string, flagId: string): string {
  const params = queryFromSearch(search);
  params.set(featureQueryParam(flagId), 'true');
  const query = params.toString();
  return query ? `?${query}` : '';
}
