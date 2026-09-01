import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  FEATURE_FLAGS,
  featureStorageKey,
  isFeatureEnabled,
  setFeatureEnabled,
  subscribeFeatureFlags,
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
});

describe('isFeatureEnabled', () => {
  it('is off by default', () => {
    expect(isFeatureEnabled('widgets', memoryStorage())).toBe(false);
  });

  it('stays enabled from storage', () => {
    const storage = memoryStorage({ [featureStorageKey('widgets')]: '1' });
    expect(isFeatureEnabled('widgets', storage)).toBe(true);
  });

  it('does not leak enablement across flag ids', () => {
    const storage = memoryStorage({ [featureStorageKey('widgets')]: '1' });
    expect(isFeatureEnabled('widgets', storage)).toBe(true);
    expect(isFeatureEnabled('preview', storage)).toBe(false);
  });

  it('uses localStorage by default so enable survives a new tab', () => {
    localStorage.setItem(featureStorageKey('widgets'), '1');
    expect(isFeatureEnabled('widgets')).toBe(true);
  });

  it('rejects invalid flag ids', () => {
    const storage = memoryStorage({ [featureStorageKey('Foo')]: '1' });
    expect(isFeatureEnabled('Foo', storage)).toBe(false);
    expect(isFeatureEnabled('', storage)).toBe(false);
  });
});

describe('setFeatureEnabled', () => {
  it('persists an enabled flag', () => {
    const storage = memoryStorage();
    setFeatureEnabled('widgets', true, storage);
    expect(storage.getItem(featureStorageKey('widgets'))).toBe('1');
    expect(isFeatureEnabled('widgets', storage)).toBe(true);
  });

  it('clears storage when disabled', () => {
    const storage = memoryStorage({ [featureStorageKey('widgets')]: '1' });
    setFeatureEnabled('widgets', false, storage);
    expect(storage.getItem(featureStorageKey('widgets'))).toBeNull();
    expect(isFeatureEnabled('widgets', storage)).toBe(false);
  });

  it('ignores invalid flag ids', () => {
    const storage = memoryStorage();
    setFeatureEnabled('Foo', true, storage);
    expect(storage.getItem(featureStorageKey('Foo'))).toBeNull();
  });
});

describe('subscribeFeatureFlags', () => {
  it('notifies listeners when a flag is set', () => {
    const storage = memoryStorage();
    const listener = vi.fn();
    const unsubscribe = subscribeFeatureFlags(listener);
    setFeatureEnabled('widgets', true, storage);
    expect(listener).toHaveBeenCalledTimes(1);
    unsubscribe();
    setFeatureEnabled('widgets', false, storage);
    expect(listener).toHaveBeenCalledTimes(1);
  });
});

describe('feature catalog', () => {
  it('is empty after live collaboration shipped', () => {
    expect(FEATURE_FLAGS).toEqual([]);
    expect(featureStorageKey('widgets')).toBe('archlens.feature.widgets');
  });
});
