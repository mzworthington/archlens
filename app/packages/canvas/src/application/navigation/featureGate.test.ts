import { afterEach, describe, expect, it } from 'vitest';
import {
  COLLABORATION_FEATURE,
  featureQueryParam,
  featureStorageKey,
  isFeatureEnabled,
  latchFeaturesFromSearch,
  withFeatureQuery,
} from './featureGate';

function memoryStorage(initial: Record<string, string> = {}): Storage {
  const map = new Map(Object.entries(initial));
  return {
    get length() {
      return map.size;
    },
    clear() {
      map.clear();
    },
    getItem(key: string) {
      return map.has(key) ? map.get(key)! : null;
    },
    key() {
      return null;
    },
    removeItem(key: string) {
      map.delete(key);
    },
    setItem(key: string, value: string) {
      map.set(key, value);
    },
  };
}

afterEach(() => {
  localStorage.removeItem(featureStorageKey('widgets'));
  localStorage.removeItem(featureStorageKey(COLLABORATION_FEATURE));
});

describe('isFeatureEnabled', () => {
  it('is off by default', () => {
    expect(isFeatureEnabled('widgets', '', memoryStorage())).toBe(false);
  });

  it('enables when feature-<id>=true and persists to storage', () => {
    const storage = memoryStorage();
    expect(isFeatureEnabled('widgets', '?feature-widgets=true', storage)).toBe(true);
    expect(storage.getItem(featureStorageKey('widgets'))).toBe('1');
  });

  it('accepts 1 and yes', () => {
    expect(isFeatureEnabled('widgets', '?feature-widgets=1', memoryStorage())).toBe(true);
    expect(isFeatureEnabled('widgets', '?feature-widgets=yes', memoryStorage())).toBe(true);
  });

  it('stays enabled from storage without the query', () => {
    const storage = memoryStorage({ [featureStorageKey('widgets')]: '1' });
    expect(isFeatureEnabled('widgets', '', storage)).toBe(true);
  });

  it('disables when feature-<id>=no and clears storage', () => {
    const storage = memoryStorage({ [featureStorageKey('widgets')]: '1' });
    expect(isFeatureEnabled('widgets', '?feature-widgets=no', storage)).toBe(false);
    expect(storage.getItem(featureStorageKey('widgets'))).toBeNull();
  });

  it('disables when feature-<id>=0 or false and clears storage', () => {
    const storageZero = memoryStorage({ [featureStorageKey('widgets')]: '1' });
    expect(isFeatureEnabled('widgets', '?feature-widgets=0', storageZero)).toBe(false);
    expect(storageZero.getItem(featureStorageKey('widgets'))).toBeNull();

    const storageFalse = memoryStorage({ [featureStorageKey('widgets')]: '1' });
    expect(isFeatureEnabled('widgets', '?feature-widgets=false', storageFalse)).toBe(false);
    expect(storageFalse.getItem(featureStorageKey('widgets'))).toBeNull();
  });

  it('ignores unknown values and keeps the stored preference', () => {
    const storage = memoryStorage({ [featureStorageKey('widgets')]: '1' });
    expect(isFeatureEnabled('widgets', '?feature-widgets=maybe', storage)).toBe(true);
    expect(storage.getItem(featureStorageKey('widgets'))).toBe('1');
  });

  it('does not leak enablement across flag ids', () => {
    const storage = memoryStorage();
    expect(isFeatureEnabled('widgets', '?feature-widgets=true', storage)).toBe(true);
    expect(isFeatureEnabled('preview', '', storage)).toBe(false);
  });

  it('uses localStorage by default so enable survives a new tab', () => {
    localStorage.setItem(featureStorageKey('widgets'), '1');
    expect(isFeatureEnabled('widgets', '')).toBe(true);
  });
});

describe('latchFeaturesFromSearch', () => {
  it('latches every feature-* param so later reads do not need the query', () => {
    const storage = memoryStorage();
    latchFeaturesFromSearch('?feature-widgets=true&feature-preview=no', storage);
    expect(isFeatureEnabled('widgets', '', storage)).toBe(true);
    expect(isFeatureEnabled('preview', '', storage)).toBe(false);
  });

  it('ignores invalid flag ids', () => {
    const storage = memoryStorage();
    latchFeaturesFromSearch('?feature-=true&feature-Foo=true&feature-a/b=true', storage);
    expect(storage.getItem(featureStorageKey('Foo'))).toBeNull();
  });
});

describe('withFeatureQuery', () => {
  it('adds feature-<id>=true while keeping other params', () => {
    expect(withFeatureQuery('?lens=chaos', 'widgets')).toBe('?lens=chaos&feature-widgets=true');
  });
});

describe('collaboration flag id', () => {
  it('uses the feature-collaboration query param', () => {
    expect(featureQueryParam(COLLABORATION_FEATURE)).toBe('feature-collaboration');
    expect(featureStorageKey(COLLABORATION_FEATURE)).toBe('archlens.feature.collaboration');
  });
});
