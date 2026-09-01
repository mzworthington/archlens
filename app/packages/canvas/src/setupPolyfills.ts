import fakeIndexedDB, { IDBKeyRange } from 'fake-indexeddb';

// Polyfill standard Node global
globalThis.indexedDB = fakeIndexedDB;
globalThis.IDBKeyRange = IDBKeyRange;

function createMemoryStorage(): Storage {
  const store = new Map<string, string>();
  return {
    get length() {
      return store.size;
    },
    clear() {
      store.clear();
    },
    getItem(key: string) {
      return store.has(key) ? (store.get(key) ?? null) : null;
    },
    key(index: number) {
      return [...store.keys()][index] ?? null;
    },
    removeItem(key: string) {
      store.delete(key);
    },
    setItem(key: string, value: string) {
      store.set(key, String(value));
    },
  };
}

function ensureStorage(name: 'localStorage' | 'sessionStorage') {
  try {
    const current = globalThis[name];
    if (current && typeof current.getItem === 'function') {
      current.setItem('__archlens_storage_probe__', '1');
      current.removeItem('__archlens_storage_probe__');
      return;
    }
  } catch {
    // fall through to polyfill
  }
  Object.defineProperty(globalThis, name, {
    configurable: true,
    writable: true,
    value: createMemoryStorage(),
  });
}

ensureStorage('localStorage');
ensureStorage('sessionStorage');

// Polyfill window global if it exists in current scope
if (typeof window !== 'undefined') {
  window.indexedDB = fakeIndexedDB;
  window.IDBKeyRange = IDBKeyRange;
  if (!window.localStorage) {
    Object.defineProperty(window, 'localStorage', {
      configurable: true,
      writable: true,
      value: globalThis.localStorage,
    });
  }
  if (!window.sessionStorage) {
    Object.defineProperty(window, 'sessionStorage', {
      configurable: true,
      writable: true,
      value: globalThis.sessionStorage,
    });
  }
}

// Polyfill JSDOM window global inside Node vm isolation
const jsdomWindow = (globalThis as { window?: typeof globalThis & Window }).window;
if (jsdomWindow) {
  jsdomWindow.indexedDB = fakeIndexedDB;
  jsdomWindow.IDBKeyRange = IDBKeyRange;
}
